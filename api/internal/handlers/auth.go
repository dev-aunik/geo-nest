package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
	"github.com/yourusername/geonest-api/internal/middleware"
	"github.com/yourusername/geonest-api/internal/repository"
	"github.com/yourusername/geonest-api/internal/services"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler holds dependencies for auth endpoints.
type AuthHandler struct {
	db        *repository.Queries
	jwtSecret string
}

// NewAuthHandler creates an AuthHandler.
func NewAuthHandler(db *repository.Queries, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret}
}

// Register handles POST /v1/auth/register
func (h *AuthHandler) Register(c fiber.Ctx) error {
	body := &struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}{}
	if err := c.Bind().JSON(body); err != nil || body.Email == "" || body.Password == "" {
		return respondError(c, 400, "BAD_REQUEST", "email and password are required.")
	}
	if len(body.Password) < 8 {
		return respondError(c, 422, "INVALID_PARAMETER", "Password must be at least 8 characters.")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not process registration.")
	}

	user, err := h.db.CreateUser(c.Context(), body.Email, string(hash))
	if err != nil {
		// Duplicate email
		return respondError(c, 409, "EMAIL_EXISTS", "An account with that email already exists.")
	}

	access, refresh, err := middleware.GenerateTokenPair(h.jwtSecret, user.ID, user.Email, user.PlanID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Token generation failed.")
	}

	// Store hashed refresh token
	tokenHash := services.SHA256Hex(refresh)
	h.db.CreateRefreshToken(c.Context(), user.ID, tokenHash, middleware.RefreshTokenExpiry())

	return c.Status(201).JSON(fiber.Map{
		"access_token":  access,
		"refresh_token": refresh,
		"token_type":    "Bearer",
		"expires_in":    900,
		"user": fiber.Map{
			"id":      user.ID,
			"email":   user.Email,
			"plan_id": user.PlanID,
		},
	})
}

// Login handles POST /v1/auth/login
func (h *AuthHandler) Login(c fiber.Ctx) error {
	body := &struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}{}
	if err := c.Bind().JSON(body); err != nil || body.Email == "" || body.Password == "" {
		return respondError(c, 400, "BAD_REQUEST", "email and password are required.")
	}

	user, err := h.db.GetUserByEmail(c.Context(), body.Email)
	if err != nil {
		if err == pgx.ErrNoRows {
			return respondError(c, 401, "INVALID_CREDENTIALS", "Invalid email or password.")
		}
		return respondError(c, 500, "INTERNAL_ERROR", "Could not process login.")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		return respondError(c, 401, "INVALID_CREDENTIALS", "Invalid email or password.")
	}

	access, refresh, err := middleware.GenerateTokenPair(h.jwtSecret, user.ID, user.Email, user.PlanID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Token generation failed.")
	}

	tokenHash := services.SHA256Hex(refresh)
	h.db.CreateRefreshToken(c.Context(), user.ID, tokenHash, middleware.RefreshTokenExpiry())

	return c.JSON(fiber.Map{
		"access_token":  access,
		"refresh_token": refresh,
		"token_type":    "Bearer",
		"expires_in":    900,
	})
}

// RefreshToken handles POST /v1/auth/refresh
func (h *AuthHandler) RefreshToken(c fiber.Ctx) error {
	body := &struct {
		RefreshToken string `json:"refresh_token"`
	}{}
	if err := c.Bind().JSON(body); err != nil || body.RefreshToken == "" {
		return respondError(c, 400, "BAD_REQUEST", "refresh_token is required.")
	}

	claims, err := middleware.ParseRefreshToken(h.jwtSecret, body.RefreshToken)
	if err != nil {
		return respondError(c, 401, "INVALID_TOKEN", "Refresh token is invalid or expired.")
	}

	// Verify token exists in DB (single-use safety)
	tokenHash := services.SHA256Hex(body.RefreshToken)
	stored, err := h.db.GetRefreshToken(c.Context(), tokenHash)
	if err != nil || stored == nil {
		return respondError(c, 401, "INVALID_TOKEN", "Refresh token not found or expired.")
	}

	// Delete used token (rotation)
	h.db.DeleteRefreshToken(c.Context(), tokenHash)

	// Get fresh user data
	user, err := h.db.GetUser(c.Context(), claims.UserID)
	if err != nil {
		return respondError(c, 401, "INVALID_TOKEN", "User not found.")
	}

	newAccess, newRefresh, err := middleware.GenerateTokenPair(h.jwtSecret, user.ID, user.Email, user.PlanID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Token generation failed.")
	}

	newHash := services.SHA256Hex(newRefresh)
	h.db.CreateRefreshToken(c.Context(), user.ID, newHash, time.Now().Add(30*24*time.Hour))

	return c.JSON(fiber.Map{
		"access_token":  newAccess,
		"refresh_token": newRefresh,
		"token_type":    "Bearer",
		"expires_in":    900,
	})
}

// extractContext avoids import cycle by providing background context inline.
func extractContext() context.Context {
	return context.Background()
}

package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gofiber/fiber/v3"
	"github.com/yourusername/geonest-api/internal/models"
)

// JWTClaims are the custom claims embedded in access tokens.
type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	PlanID int    `json:"plan_id"`
	jwt.RegisteredClaims
}

// JWTAuth validates Bearer tokens from the Authorization header.
// Sets "user_id", "email", "plan_id" in fiber Locals.
func JWTAuth(jwtSecret string) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return respondError(c, 401, "UNAUTHORIZED",
				"Bearer token required in Authorization header.")
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{},
			func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
				}
				return []byte(jwtSecret), nil
			})

		if err != nil || !token.Valid {
			return respondError(c, 401, "UNAUTHORIZED", "Invalid or expired token.")
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			return respondError(c, 401, "UNAUTHORIZED", "Invalid token claims.")
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("plan_id", claims.PlanID)

		return c.Next()
	}
}

// GenerateTokenPair creates a (accessToken, refreshTokenRaw) pair.
// Access token: 15min. Refresh token: 30 days, stored hashed in DB.
func GenerateTokenPair(jwtSecret, userID, email string, planID int) (accessToken, refreshToken string, err error) {
	// Access token — 15 minutes
	accessClaims := &JWTClaims{
		UserID: userID,
		Email:  email,
		PlanID: planID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}
	accessToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).
		SignedString([]byte(jwtSecret))
	if err != nil {
		return
	}

	// Refresh token — 30 days (opaque random + JWT wrapper for easy parsing)
	refreshClaims := &JWTClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}
	refreshToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).
		SignedString([]byte(jwtSecret))
	return
}

// ParseRefreshToken validates a refresh token and returns claims.
func ParseRefreshToken(jwtSecret, tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{},
		func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid refresh token")
	}
	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	return claims, nil
}

// RefreshTokenExpiry returns the expiry time for a refresh token.
func RefreshTokenExpiry() time.Time {
	return time.Now().Add(30 * 24 * time.Hour)
}

// planFromID is a placeholder — real impl loads plan from DB.
func planFromID(id int) *models.Plan {
	return &models.Plan{ID: id}
}

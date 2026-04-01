package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/yourusername/geonest-api/internal/cache"
	"github.com/yourusername/geonest-api/internal/models"
	"github.com/yourusername/geonest-api/internal/repository"
	"github.com/yourusername/geonest-api/internal/services"
)

// KeyHandler holds dependencies for API key endpoints.
type KeyHandler struct {
	db    *repository.Queries
	cache *cache.Client
}

// NewKeyHandler creates a KeyHandler.
func NewKeyHandler(db *repository.Queries, c *cache.Client) *KeyHandler {
	return &KeyHandler{db: db, cache: c}
}

// ListKeys handles GET /v1/keys — requires JWT
func (h *KeyHandler) ListKeys(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := h.db.ListUserKeys(c.Context(), userID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not retrieve keys.")
	}

	keys := make([]models.KeyResponse, 0, len(rows))
	for _, row := range rows {
		kr := models.KeyResponse{
			ID:        row.ID,
			Name:      row.Name,
			KeyPrefix: row.KeyPrefix,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z"),
			Revoked:   row.RevokedAt != nil,
		}
		if row.LastUsedAt != nil {
			s := row.LastUsedAt.Format("2006-01-02T15:04:05Z")
			kr.LastUsedAt = &s
		}
		if row.ExpiresAt != nil {
			s := row.ExpiresAt.Format("2006-01-02T15:04:05Z")
			kr.ExpiresAt = &s
		}
		keys = append(keys, kr)
	}

	return c.JSON(fiber.Map{"keys": keys, "count": len(keys)})
}

// CreateKey handles POST /v1/keys — requires JWT
func (h *KeyHandler) CreateKey(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	planID := c.Locals("plan_id").(int)

	// Load plan to check key limit
	plan, err := h.db.GetPlanByID(c.Context(), planID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not load plan.")
	}

	count, err := h.db.CountUserKeys(c.Context(), userID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not count keys.")
	}

	if plan.MaxKeys != -1 && count >= int64(plan.MaxKeys) {
		return respondError(c, 403, "KEY_LIMIT_REACHED",
			fmt.Sprintf("Plan limit: %d API keys. Upgrade to create more.", plan.MaxKeys))
	}

	body := &struct {
		Name string `json:"name"`
	}{}
	c.Bind().JSON(body)
	if body.Name == "" {
		body.Name = fmt.Sprintf("Key %d", count+1)
	}

	raw, hash, prefix, err := services.GenerateAPIKey()
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not generate key.")
	}

	key, err := h.db.CreateAPIKey(c.Context(), repository.CreateAPIKeyParams{
		UserID:    userID,
		KeyHash:   hash,
		KeyPrefix: prefix,
		Name:      body.Name,
	})
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not save key.")
	}

	return c.Status(201).JSON(models.CreateKeyResponse{
		Key:     raw,    // full key shown ONCE, never again
		ID:      key.ID,
		Prefix:  prefix,
		Name:    key.Name,
		Warning: "Save this key now. It will not be shown again.",
	})
}

// RotateKey handles POST /v1/keys/:id/rotate — requires JWT
func (h *KeyHandler) RotateKey(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	keyID := c.Params("id")

	// Revoke old key
	if err := h.db.RevokeAPIKey(c.Context(), keyID, userID); err != nil {
		return respondError(c, 404, "NOT_FOUND", "Key not found.")
	}

	// Get current plan to check key limit
	planID := c.Locals("plan_id").(int)
	plan, err := h.db.GetPlanByID(c.Context(), planID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not load plan.")
	}
	count, _ := h.db.CountUserKeys(c.Context(), userID)
	if plan.MaxKeys != -1 && count >= int64(plan.MaxKeys) {
		return respondError(c, 403, "KEY_LIMIT_REACHED", "Cannot rotate: plan key limit reached.")
	}

	// Create replacement key
	raw, hash, prefix, err := services.GenerateAPIKey()
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not generate new key.")
	}

	newKey, err := h.db.CreateAPIKey(c.Context(), repository.CreateAPIKeyParams{
		UserID:    userID,
		KeyHash:   hash,
		KeyPrefix: prefix,
		Name:      "Rotated key",
	})
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not save new key.")
	}

	// Note: Redis cache entry for old key will expire on next access attempt

	return c.Status(201).JSON(models.CreateKeyResponse{
		Key:     raw,
		ID:      newKey.ID,
		Prefix:  prefix,
		Name:    newKey.Name,
		Warning: "Save this key now. It will not be shown again.",
	})
}

// RevokeKey handles DELETE /v1/keys/:id — requires JWT
func (h *KeyHandler) RevokeKey(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	keyID := c.Params("id")

	if err := h.db.RevokeAPIKey(c.Context(), keyID, userID); err != nil {
		return respondError(c, 404, "NOT_FOUND", "Key not found or already revoked.")
	}

	return c.SendStatus(204)
}



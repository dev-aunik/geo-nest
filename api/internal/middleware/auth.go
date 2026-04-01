package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/yourusername/geonest-api/internal/cache"
	"github.com/yourusername/geonest-api/internal/models"
	"github.com/yourusername/geonest-api/internal/repository"
)

// APIKeyAuth validates X-API-Key header (or ?api_key= query param).
// Hashes the raw key and looks it up: Redis cache first, PostgreSQL fallback.
// Sets "api_key_row", "api_key_hash", "user_id", "plan" in fiber Locals.
func APIKeyAuth(db *repository.Queries, cache *cache.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		raw := c.Get("X-API-Key")
		if raw == "" {
			raw = c.Query("api_key")
		}
		if raw == "" {
			return respondError(c, 401, "UNAUTHORIZED",
				"API key required. Pass it as the X-API-Key header.")
		}

		hash := sha256Hex(raw)

		// Try Redis cache first (5min TTL on key+plan data)
		keyRow, err := cache.GetKeyWithPlan(c.Context(), hash)
		if err != nil {
			// Cache miss — hit the DB
			keyRow, err = db.GetAPIKeyByHash(c.Context(), hash)
			if err != nil || keyRow == nil || keyRow.RevokedAt != nil {
				return respondError(c, 401, "INVALID_API_KEY",
					"Invalid or revoked API key.")
			}
			// Populate cache asynchronously
			go cache.SetKeyWithPlan(context.Background(), hash, keyRow)
		}

		// Build plan model
		plan := &models.Plan{
			ID:          keyRow.PlanID,
			Name:        keyRow.PlanName,
			DailyQuota:  keyRow.DailyQuota,
			PerMinLimit: keyRow.PerMinLimit,
			MaxKeys:     keyRow.MaxKeys,
			MaxLevels:   keyRow.MaxLevels,
			Features:    keyRow.Features,
		}

		c.Locals("api_key_row", keyRow)
		c.Locals("api_key_hash", hash)
		c.Locals("user_id", keyRow.UserID)
		c.Locals("plan", plan)

		// Update last_used_at asynchronously
		go db.UpdateKeyLastUsed(context.Background(), keyRow.ID)

		return c.Next()
	}
}

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func respondError(c fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(models.ErrorResponse{
		Error: models.ErrorDetail{
			Code:    code,
			Message: message,
			Docs:    fmt.Sprintf("https://docs.geonest.io/errors#%s", strings.ToLower(code)),
		},
		RequestID: fmt.Sprint(c.Locals("requestid")),
	})
}

package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/yourusername/geonest-api/internal/models"
	"github.com/yourusername/geonest-api/internal/repository"
)

// UsageHandler holds dependencies for usage endpoints.
type UsageHandler struct {
	db *repository.Queries
}

// NewUsageHandler creates a UsageHandler.
func NewUsageHandler(db *repository.Queries) *UsageHandler {
	return &UsageHandler{db: db}
}

// GetUsage handles GET /v1/usage — requires API key auth
func (h *UsageHandler) GetUsage(c fiber.Ctx) error {
	keyRow := c.Locals("api_key_row").(*repository.GetAPIKeyByHashRow)
	plan := c.Locals("plan").(*models.Plan)

	today, err := h.db.GetTodayUsageByKey(c.Context(), keyRow.ID)
	if err != nil {
		today = 0
	}

	remaining := int64(plan.DailyQuota) - today
	if plan.DailyQuota == -1 {
		remaining = -1 // unlimited
	}
	if remaining < 0 {
		remaining = 0
	}

	return c.JSON(models.UsageResponse{
		Today:      int(today),
		Remaining:  int(remaining),
		DailyQuota: plan.DailyQuota,
	})
}

// GetUsageHistory handles GET /v1/usage/history?days=30 — requires API key auth
func (h *UsageHandler) GetUsageHistory(c fiber.Ctx) error {
	keyRow := c.Locals("api_key_row").(*repository.GetAPIKeyByHashRow)

	days, _ := strconv.Atoi(c.Query("days"))
	if days <= 0 {
		days = 30
	}
	if days > 90 {
		days = 90
	}

	from := time.Now().AddDate(0, 0, -days)
	to := time.Now()

	rows, err := h.db.GetUsageByKey(c.Context(), keyRow.ID, from, to)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not retrieve usage history.")
	}

	history := make([]models.UsageDayItem, 0, len(rows))
	for _, row := range rows {
		history = append(history, models.UsageDayItem{
			Date:      row.Date.Format("2006-01-02"),
			Calls:     row.CallCount,
			CacheHits: row.CacheHits,
			Errors:    row.ErrorCount,
		})
	}

	return c.JSON(fiber.Map{
		"history": history,
		"days":    days,
		"count":   len(history),
	})
}

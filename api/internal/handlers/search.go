package handlers

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/yourusername/geonest-api/internal/models"
	"github.com/yourusername/geonest-api/internal/search"
)

// SearchHandler holds dependencies for search endpoints.
type SearchHandler struct {
	sc *search.Client
}

// NewSearchHandler creates a SearchHandler.
func NewSearchHandler(sc *search.Client) *SearchHandler {
	return &SearchHandler{sc: sc}
}

// Search handles GET /v1/search?q=&cc=&level=&limit=
func (h *SearchHandler) Search(c fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	if len(q) < 2 {
		return respondError(c, 422, "INVALID_PARAMETER",
			"Search query must be at least 2 characters.")
	}

	cc := c.Query("cc")
	level := c.Query("level")
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	results, found, err := h.sc.Search(context.Background(), search.SearchParams{
		Query:       q,
		CountryCode: cc,
		Level:       level,
		Limit:       limit,
	})
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Search is temporarily unavailable.")
	}

	items := make([]models.SearchResult, 0, len(results))
	for _, r := range results {
		level64, _ := strconv.Atoi(fmt.Sprint(r.Level))
		var code *string
		if r.Code != "" {
			s := r.Code
			code = &s
		}
		items = append(items, models.SearchResult{
			ID:          r.ID,
			CountryCode: r.CountryCode,
			Level:       level64,
			LevelLabel:  r.LevelLabel,
			Name:        r.Name,
			FullPath:    r.FullPath,
			Code:        code,
			Highlight:   r.Highlight,
		})
	}

	return c.JSON(models.SearchResponse{
		Results: items,
		Found:   found,
		Query:   q,
	})
}

// Autocomplete handles GET /v1/search/autocomplete?q=&cc=&limit=
func (h *SearchHandler) Autocomplete(c fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	if len(q) < 1 {
		return respondError(c, 422, "INVALID_PARAMETER", "Query q is required.")
	}

	cc := c.Query("cc")
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 {
		limit = 5
	}
	if limit > 10 {
		limit = 10
	}

	results, _, err := h.sc.Search(context.Background(), search.SearchParams{
		Query:       q,
		CountryCode: cc,
		Limit:       limit,
	})
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Autocomplete is temporarily unavailable.")
	}

	type AutoItem struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		FullPath string `json:"full_path"`
		Level    int    `json:"level"`
		Country  string `json:"country_code"`
	}
	items := make([]AutoItem, 0, len(results))
	for _, r := range results {
		items = append(items, AutoItem{
			ID:       r.ID,
			Name:     r.Name,
			FullPath: r.FullPath,
			Level:    r.Level,
			Country:  r.CountryCode,
		})
	}
	return c.JSON(fiber.Map{"suggestions": items, "query": q})
}

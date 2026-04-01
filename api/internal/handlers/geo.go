package handlers

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/yourusername/geonest-api/internal/cache"
	"github.com/yourusername/geonest-api/internal/models"
	"github.com/yourusername/geonest-api/internal/repository"
)

var (
	validCC    = regexp.MustCompile(`^[a-z]{2}$`)
	validIDStr = regexp.MustCompile(`^\d+$`)
)

// SupportedCountries lists Phase 1 countries and their level metadata.
var SupportedCountries = map[string]models.CountryMeta{
	"bd": {Code: "bd", Name: "Bangladesh", Levels: 4, LevelLabels: []string{"division", "district", "upazila", "union"}},
	"lk": {Code: "lk", Name: "Sri Lanka", Levels: 4, LevelLabels: []string{"province", "district", "ds_division", "gn_division"}},
	"np": {Code: "np", Name: "Nepal", Levels: 4, LevelLabels: []string{"province", "district", "municipality", "ward"}},
	"in": {Code: "in", Name: "India", Levels: 3, LevelLabels: []string{"state", "district", "sub_district"}},
	"us": {Code: "us", Name: "United States", Levels: 4, LevelLabels: []string{"state", "county", "city", "zip_code"}},
	"jp": {Code: "jp", Name: "Japan", Levels: 3, LevelLabels: []string{"prefecture", "municipality", "ward"}},
}

// GeoHandler holds dependencies for geo endpoints.
type GeoHandler struct {
	db    *repository.Queries
	cache *cache.Client
}

// NewGeoHandler creates a GeoHandler.
func NewGeoHandler(db *repository.Queries, c *cache.Client) *GeoHandler {
	return &GeoHandler{db: db, cache: c}
}

// ListCountries handles GET /v1/geo/countries
func (h *GeoHandler) ListCountries(c fiber.Ctx) error {
	result := make([]models.CountryResponse, 0, len(SupportedCountries))
	for _, meta := range SupportedCountries {
		result = append(result, models.CountryResponse{
			Code:        meta.Code,
			Name:        meta.Name,
			Levels:      meta.Levels,
			LevelLabels: meta.LevelLabels,
			Links: struct {
				L1 string `json:"l1"`
			}{L1: fmt.Sprintf("/v1/geo/%s/l1", meta.Code)},
		})
	}
	return c.JSON(fiber.Map{"countries": result, "count": len(result)})
}

// GetCountry handles GET /v1/geo/:cc
func (h *GeoHandler) GetCountry(c fiber.Ctx) error {
	cc := c.Params("cc")
	if !validCC.MatchString(cc) {
		return respondError(c, 422, "INVALID_PARAMETER", "Country code must be 2 lowercase letters.")
	}
	meta, ok := SupportedCountries[cc]
	if !ok {
		return respondError(c, 422, "UNSUPPORTED_COUNTRY",
			fmt.Sprintf("Country '%s' is not supported in Phase 1. See /v1/geo/countries.", cc))
	}
	resp := models.CountryResponse{
		Code:        meta.Code,
		Name:        meta.Name,
		Levels:      meta.Levels,
		LevelLabels: meta.LevelLabels,
	}
	resp.Links.L1 = fmt.Sprintf("/v1/geo/%s/l1", cc)
	return c.JSON(resp)
}

// GetLevel handles GET /v1/geo/:cc/l:n  (e.g., /v1/geo/bd/l1)
func (h *GeoHandler) GetLevel(c fiber.Ctx) error {
	cc := c.Params("cc")
	levelStr := c.Params("n")

	if !validCC.MatchString(cc) {
		return respondError(c, 422, "INVALID_PARAMETER", "Country code must be 2 lowercase letters.")
	}
	meta, ok := SupportedCountries[cc]
	if !ok {
		return respondError(c, 422, "UNSUPPORTED_COUNTRY",
			fmt.Sprintf("Country '%s' is not supported. See /v1/geo/countries.", cc))
	}

	level, err := strconv.Atoi(levelStr)
	if err != nil || level < 1 || level > 4 {
		return respondError(c, 422, "INVALID_PARAMETER", "Level must be 1–4.")
	}
	if level > meta.Levels {
		return respondError(c, 422, "INVALID_PARAMETER",
			fmt.Sprintf("Country '%s' only has %d levels.", cc, meta.Levels))
	}

	// Optional parent filter
	var parentID *int64
	if pid := c.Query("parent_id"); pid != "" {
		if !validIDStr.MatchString(pid) {
			return respondError(c, 422, "INVALID_PARAMETER", "parent_id must be a positive integer.")
		}
		n, _ := strconv.ParseInt(pid, 10, 64)
		parentID = &n
	}

	// Cache key
	parentStr := "nil"
	if parentID != nil {
		parentStr = strconv.FormatInt(*parentID, 10)
	}
	cacheKey := fmt.Sprintf("geo:%s:%d:%s", cc, level, parentStr)

	// Try cache first
	if cached, err := h.cache.GetGeoAreas(c.Context(), cacheKey); err == nil {
		var areas []models.GeoAreaResponse
		if json.Unmarshal(cached, &areas) == nil {
			return c.JSON(models.GeoListResponse{
				Data: areas, Count: len(areas), CountryCode: cc, Level: level,
			})
		}
	}

	// DB fallback
	rows, err := h.db.GetAreasByLevel(c.Context(), repository.GetAreasByLevelParams{
		CountryCode: cc,
		Level:       int16(level),
		ParentID:    parentID,
	})
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not retrieve areas.")
	}

	areas := make([]models.GeoAreaResponse, 0, len(rows))
	for _, row := range rows {
		areas = append(areas, areaRowToResponse(row, cc, level))
	}

	// Populate cache async
	go func() {
		if b, err := json.Marshal(areas); err == nil {
			h.cache.SetGeoAreas(c.Context(), cacheKey, b)
		}
	}()

	return c.JSON(models.GeoListResponse{
		Data: areas, Count: len(areas), CountryCode: cc, Level: level,
	})
}

// GetAreaByID handles GET /v1/geo/:cc/l:n/:id
func (h *GeoHandler) GetAreaByID(c fiber.Ctx) error {
	cc := c.Params("cc")
	idStr := c.Params("id")

	if !validCC.MatchString(cc) {
		return respondError(c, 422, "INVALID_PARAMETER", "Country code must be 2 lowercase letters.")
	}
	if _, ok := SupportedCountries[cc]; !ok {
		return respondError(c, 422, "UNSUPPORTED_COUNTRY", "Country not supported.")
	}
	if !validIDStr.MatchString(idStr) {
		return respondError(c, 422, "INVALID_PARAMETER", "ID must be a positive integer.")
	}

	id, _ := strconv.ParseInt(idStr, 10, 64)
	row, err := h.db.GetAreaByID(c.Context(), id)
	if err != nil {
		return respondError(c, 404, "NOT_FOUND", "Area not found.")
	}

	level, _ := strconv.Atoi(c.Params("n"))
	return c.JSON(areaRowToResponse(*row, cc, level))
}

// GetChildren handles GET /v1/geo/:cc/l:n/:id/children
func (h *GeoHandler) GetChildren(c fiber.Ctx) error {
	cc := c.Params("cc")
	idStr := c.Params("id")

	if !validCC.MatchString(cc) {
		return respondError(c, 422, "INVALID_PARAMETER", "Country code must be 2 lowercase letters.")
	}
	if _, ok := SupportedCountries[cc]; !ok {
		return respondError(c, 422, "UNSUPPORTED_COUNTRY", "Country not supported.")
	}
	if !validIDStr.MatchString(idStr) {
		return respondError(c, 422, "INVALID_PARAMETER", "ID must be a positive integer.")
	}

	id, _ := strconv.ParseInt(idStr, 10, 64)
	rows, err := h.db.GetChildren(c.Context(), id)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not retrieve children.")
	}

	areas := make([]models.GeoAreaResponse, 0, len(rows))
	for _, row := range rows {
		areas = append(areas, areaRowToResponse(row, cc, int(row.Level)))
	}
	return c.JSON(fiber.Map{"data": areas, "count": len(areas), "parent_id": id})
}

// GetAncestors handles GET /v1/geo/:cc/l:n/:id/ancestors
func (h *GeoHandler) GetAncestors(c fiber.Ctx) error {
	cc := c.Params("cc")
	idStr := c.Params("id")

	if !validCC.MatchString(cc) {
		return respondError(c, 422, "INVALID_PARAMETER", "Country code must be 2 lowercase letters.")
	}
	if _, ok := SupportedCountries[cc]; !ok {
		return respondError(c, 422, "UNSUPPORTED_COUNTRY", "Country not supported.")
	}
	if !validIDStr.MatchString(idStr) {
		return respondError(c, 422, "INVALID_PARAMETER", "ID must be a positive integer.")
	}

	id, _ := strconv.ParseInt(idStr, 10, 64)
	rows, err := h.db.GetAncestors(c.Context(), id)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not retrieve ancestors.")
	}

	type AncestorItem struct {
		ID         int64  `json:"id"`
		Level      int    `json:"level"`
		LevelLabel string `json:"level_label"`
		Name       string `json:"name"`
	}
	ancestors := make([]AncestorItem, 0, len(rows))
	for _, row := range rows {
		ancestors = append(ancestors, AncestorItem{
			ID:         row.ID,
			Level:      int(row.Level),
			LevelLabel: row.LevelLabel,
			Name:       row.NameEn,
		})
	}
	return c.JSON(fiber.Map{"ancestors": ancestors, "count": len(ancestors)})
}

// areaRowToResponse converts a DB row to the public API response shape.
func areaRowToResponse(row repository.GeoAreaRow, cc string, level int) models.GeoAreaResponse {
	self := fmt.Sprintf("/v1/geo/%s/l%d/%d", cc, level, row.ID)
	var parent *string
	if row.ParentID != nil {
		p := fmt.Sprintf("/v1/geo/%s/l%d/%d", cc, level-1, *row.ParentID)
		parent = &p
	}
	children := fmt.Sprintf("/v1/geo/%s/l%d/%d/children", cc, level, row.ID)
	ancestors := fmt.Sprintf("/v1/geo/%s/l%d/%d/ancestors", cc, level, row.ID)

	var meta map[string]any
	if len(row.Metadata) > 0 {
		json.Unmarshal(row.Metadata, &meta)
	}

	resp := models.GeoAreaResponse{
		ID:          row.ID,
		CountryCode: row.CountryCode,
		Level:       int(row.Level),
		LevelLabel:  row.LevelLabel,
		ParentID:    row.ParentID,
		Name:        row.NameEn,
		Code:        row.Code,
		Metadata:    meta,
		Links: models.AreaLinks{
			Self:      self,
			Parent:    parent,
			Ancestors: ancestors,
		},
	}
	if level < 4 {
		resp.Links.Children = &children
	}
	return resp
}

package models

// GeoAreaResponse is the public API shape for a geographic area.
type GeoAreaResponse struct {
	ID          int64          `json:"id"`
	CountryCode string         `json:"country_code"`
	Level       int            `json:"level"`
	LevelLabel  string         `json:"level_label"`
	ParentID    *int64         `json:"parent_id,omitempty"`
	Name        string         `json:"name"`
	Code        *string        `json:"code,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	Links       AreaLinks      `json:"_links"`
}

// AreaLinks contains HATEOAS-style links for an area.
type AreaLinks struct {
	Self      string  `json:"self"`
	Parent    *string `json:"parent,omitempty"`
	Children  *string `json:"children,omitempty"`
	Ancestors string  `json:"ancestors"`
}

// GeoListResponse is the wrapper for a list of geo areas.
type GeoListResponse struct {
	Data        []GeoAreaResponse `json:"data"`
	Count       int               `json:"count"`
	CountryCode string            `json:"country_code"`
	Level       int               `json:"level"`
}

// CountryResponse is the public response shape for a country.
type CountryResponse struct {
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	Levels      int      `json:"levels"`
	LevelLabels []string `json:"level_labels"`
	Links       struct {
		L1 string `json:"l1"`
	} `json:"_links"`
}

// ErrorResponse is the standard API error envelope.
type ErrorResponse struct {
	Error     ErrorDetail `json:"error"`
	RequestID string      `json:"request_id"`
}

// ErrorDetail contains error classification details.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Docs    string `json:"docs"`
}

// AuthResponse is returned on successful login/register.
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

// PlanResponse is the public representation of a billing plan.
type PlanResponse struct {
	ID          int            `json:"id"`
	Name        string         `json:"name"`
	PriceCents  int            `json:"price_cents"`
	DailyQuota  int            `json:"daily_quota"`
	PerMinLimit int            `json:"per_min_limit"`
	MaxKeys     int            `json:"max_keys"`
	Features    map[string]any `json:"features"`
}

// KeyResponse is the public representation of an API key.
type KeyResponse struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	KeyPrefix  string  `json:"key_prefix"`
	LastUsedAt *string `json:"last_used_at,omitempty"`
	ExpiresAt  *string `json:"expires_at,omitempty"`
	CreatedAt  string  `json:"created_at"`
	Revoked    bool    `json:"revoked"`
}

// CreateKeyResponse is returned once after key creation, contains raw key.
type CreateKeyResponse struct {
	Key     string `json:"key"`
	ID      string `json:"id"`
	Prefix  string `json:"prefix"`
	Name    string `json:"name"`
	Warning string `json:"warning"`
}

// UsageResponse is returned by GET /v1/usage.
type UsageResponse struct {
	Today     int            `json:"calls_today"`
	Remaining int            `json:"remaining"`
	DailyQuota int           `json:"daily_quota"`
	History   []UsageDayItem `json:"history,omitempty"`
}

// UsageDayItem is one row in usage history.
type UsageDayItem struct {
	Date      string `json:"date"`
	Calls     int    `json:"calls"`
	CacheHits int    `json:"cache_hits"`
	Errors    int    `json:"errors"`
}

// SearchResult wraps Typesense results.
type SearchResult struct {
	ID          string  `json:"id"`
	CountryCode string  `json:"country_code"`
	Level       int     `json:"level"`
	LevelLabel  string  `json:"level_label"`
	Name        string  `json:"name"`
	FullPath    string  `json:"full_path"`
	Code        *string `json:"code,omitempty"`
	Highlight   string  `json:"highlight,omitempty"`
}

// SearchResponse wraps a list of search results.
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Found   int            `json:"found"`
	Query   string         `json:"query"`
}

package models

import (
	"encoding/json"
	"time"
)

// Plan represents a subscription tier.
type Plan struct {
	ID           int             `json:"id"`
	Name         string          `json:"name"`
	PriceCents   int             `json:"price_cents"`
	DailyQuota   int             `json:"daily_quota"`
	PerMinLimit  int             `json:"per_min_limit"`
	MaxKeys      int             `json:"max_keys"`
	MaxLevels    int             `json:"max_levels"`
	StripePriceID *string        `json:"stripe_price_id,omitempty"`
	Features     json.RawMessage `json:"features"`
}

// CountryMeta describes a supported country and its level structure.
type CountryMeta struct {
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	Levels      int      `json:"levels"`
	LevelLabels []string `json:"level_labels"`
}

// GeoArea is a single geographic area row from the DB.
type GeoArea struct {
	ID          int64           `json:"id"`
	CountryCode string          `json:"country_code"`
	Level       int16           `json:"level"`
	ParentID    *int64          `json:"parent_id,omitempty"`
	NameEn      string          `json:"name_en"`
	LevelLabel  string          `json:"level_label"`
	Code        *string         `json:"code,omitempty"`
	Metadata    json.RawMessage `json:"metadata,omitempty"`
}

// APIKeyWithPlan is the result of joining api_keys + users + plans.
type APIKeyWithPlan struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	KeyHash     string     `json:"-"`
	KeyPrefix   string     `json:"key_prefix"`
	Name        string     `json:"name"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	Plan        *Plan      `json:"plan,omitempty"`
}

// User is a portal user.
type User struct {
	ID               string     `json:"id"`
	Email            string     `json:"email"`
	PasswordHash     string     `json:"-"`
	PlanID           int        `json:"plan_id"`
	StripeCustomerID *string    `json:"stripe_customer_id,omitempty"`
	Status           string     `json:"status"`
	EmailVerifiedAt  *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// RefreshToken stores a hashed refresh token for rotation.
type RefreshToken struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// UsageDaily is a single day's usage record for an API key.
type UsageDaily struct {
	Date       time.Time `json:"date"`
	CallCount  int       `json:"call_count"`
	CacheHits  int       `json:"cache_hits"`
	ErrorCount int       `json:"error_count"`
}

// Subscription tracks a Stripe subscription.
type Subscription struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	PlanID      int        `json:"plan_id"`
	StripeSubID string     `json:"stripe_sub_id,omitempty"`
	Status      string     `json:"status"`
	PeriodStart *time.Time `json:"period_start,omitempty"`
	PeriodEnd   *time.Time `json:"period_end,omitempty"`
	CancelAt    *time.Time `json:"cancel_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

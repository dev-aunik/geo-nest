// Package repository provides type-safe database access functions.
// This file is manually scaffolded to match what sqlc would generate.
// Run `sqlc generate` after installing sqlc to regenerate from queries/geo.sql.
package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DBTX is the common interface for *pgxpool.Pool and pgx.Tx.
type DBTX interface {
	Exec(ctx context.Context, sql string, args ...any) (interface{ RowsAffected() int64 }, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Queries holds the database pool and implements all query methods.
type Queries struct {
	pool *pgxpool.Pool
}

// New creates a Queries using the given pool.
func New(pool *pgxpool.Pool) *Queries {
	return &Queries{pool: pool}
}

// ──────────── Params structs ────────────

// GetAreasByLevelParams are the parameters for GetAreasByLevel.
type GetAreasByLevelParams struct {
	CountryCode string
	Level       int16
	ParentID    *int64
}

// CreateAPIKeyParams are the parameters for CreateAPIKey.
type CreateAPIKeyParams struct {
	UserID    string
	KeyHash   string
	KeyPrefix string
	Name      string
}

// GetAPIKeyByHashRow is the joined result of api key + plan data.
type GetAPIKeyByHashRow struct {
	ID         string
	UserID     string
	KeyHash    string
	KeyPrefix  string
	Name       string
	RevokedAt  *time.Time
	ExpiresAt  *time.Time
	PlanID     int
	PlanName   string
	DailyQuota int
	PerMinLimit int
	MaxKeys    int
	MaxLevels  int
	Features   json.RawMessage
}

// APIKeyRow is a single row from api_keys for listing.
type APIKeyRow struct {
	ID         string
	KeyPrefix  string
	Name       string
	LastUsedAt *time.Time
	ExpiresAt  *time.Time
	RevokedAt  *time.Time
	CreatedAt  time.Time
}

// UserRow is a user record for auth.
type UserRow struct {
	ID               string
	Email            string
	PasswordHash     string
	PlanID           int
	StripeCustomerID *string
	Status           string
}

// UserPublicRow is a user record without password hash.
type UserPublicRow struct {
	ID               string
	Email            string
	PlanID           int
	StripeCustomerID *string
	Status           string
}

// GeoAreaRow is a single row from geo_areas.
type GeoAreaRow struct {
	ID          int64
	CountryCode string
	Level       int16
	ParentID    *int64
	NameEn      string
	LevelLabel  string
	Code        *string
	Metadata    json.RawMessage
}

// AncestorRow is returned by GetAncestors.
type AncestorRow struct {
	ID          int64
	CountryCode string
	Level       int16
	ParentID    *int64
	NameEn      string
	LevelLabel  string
}

// RefreshTokenRow holds a parsed refresh token record.
type RefreshTokenRow struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
}

// PlanRow is a full plan record.
type PlanRow struct {
	ID           int
	Name         string
	PriceCents   int
	DailyQuota   int
	PerMinLimit  int
	MaxKeys      int
	MaxLevels    int
	StripePriceID *string
	Features     json.RawMessage
}

// SubscriptionRow is a subscription record.
type SubscriptionRow struct {
	ID          string
	UserID      string
	PlanID      int
	StripeSubID *string
	Status      string
	PeriodStart *time.Time
	PeriodEnd   *time.Time
	CancelAt    *time.Time
}

// UpsertSubscriptionParams holds params for UpsertSubscription.
type UpsertSubscriptionParams struct {
	UserID      string
	PlanID      int
	StripeSubID string
	Status      string
	PeriodStart *time.Time
	PeriodEnd   *time.Time
}

// ──────────── Query implementations ────────────

// GetAreasByLevel returns all active areas for a country at a given level.
func (q *Queries) GetAreasByLevel(ctx context.Context, p GetAreasByLevelParams) ([]GeoAreaRow, error) {
	const query = `
		SELECT id, country_code, level, parent_id, name_en, level_label, code, metadata
		FROM geo_areas
		WHERE country_code = $1
		  AND level = $2
		  AND ($3::bigint IS NULL OR parent_id = $3)
		  AND active = true
		ORDER BY name_en`

	rows, err := q.pool.Query(ctx, query, p.CountryCode, p.Level, p.ParentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []GeoAreaRow
	for rows.Next() {
		var r GeoAreaRow
		if err := rows.Scan(&r.ID, &r.CountryCode, &r.Level, &r.ParentID,
			&r.NameEn, &r.LevelLabel, &r.Code, &r.Metadata); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// GetAreaByID returns a single active area by its ID.
func (q *Queries) GetAreaByID(ctx context.Context, id int64) (*GeoAreaRow, error) {
	const query = `
		SELECT id, country_code, level, parent_id, name_en, level_label, code, metadata
		FROM geo_areas WHERE id = $1 AND active = true`

	var r GeoAreaRow
	err := q.pool.QueryRow(ctx, query, id).Scan(
		&r.ID, &r.CountryCode, &r.Level, &r.ParentID,
		&r.NameEn, &r.LevelLabel, &r.Code, &r.Metadata,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// GetChildren returns direct children of a given area.
func (q *Queries) GetChildren(ctx context.Context, parentID int64) ([]GeoAreaRow, error) {
	const query = `
		SELECT id, country_code, level, parent_id, name_en, level_label, code, metadata
		FROM geo_areas WHERE parent_id = $1 AND active = true ORDER BY name_en`

	rows, err := q.pool.Query(ctx, query, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []GeoAreaRow
	for rows.Next() {
		var r GeoAreaRow
		if err := rows.Scan(&r.ID, &r.CountryCode, &r.Level, &r.ParentID,
			&r.NameEn, &r.LevelLabel, &r.Code, &r.Metadata); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// GetAncestors returns all ancestors of an area using a recursive CTE.
func (q *Queries) GetAncestors(ctx context.Context, id int64) ([]AncestorRow, error) {
	const query = `
		WITH RECURSIVE anc AS (
		    SELECT id, country_code, level, parent_id, name_en, level_label
		    FROM geo_areas WHERE id = $1
		    UNION ALL
		    SELECT g.id, g.country_code, g.level, g.parent_id, g.name_en, g.level_label
		    FROM geo_areas g INNER JOIN anc a ON g.id = a.parent_id
		)
		SELECT * FROM anc ORDER BY level`

	rows, err := q.pool.Query(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []AncestorRow
	for rows.Next() {
		var r AncestorRow
		if err := rows.Scan(&r.ID, &r.CountryCode, &r.Level, &r.ParentID,
			&r.NameEn, &r.LevelLabel); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// GetAPIKeyByHash looks up a key+plan by the SHA-256 hash of the raw key.
func (q *Queries) GetAPIKeyByHash(ctx context.Context, hash string) (*GetAPIKeyByHashRow, error) {
	const query = `
		SELECT k.id, k.user_id, k.key_hash, k.key_prefix, k.name, k.revoked_at, k.expires_at,
		       p.id, p.name, p.daily_quota, p.per_min_limit, p.max_keys, p.max_levels, p.features
		FROM api_keys k
		JOIN users u ON k.user_id = u.id
		JOIN plans p ON u.plan_id = p.id
		WHERE k.key_hash = $1`

	var r GetAPIKeyByHashRow
	err := q.pool.QueryRow(ctx, query, hash).Scan(
		&r.ID, &r.UserID, &r.KeyHash, &r.KeyPrefix, &r.Name,
		&r.RevokedAt, &r.ExpiresAt,
		&r.PlanID, &r.PlanName, &r.DailyQuota, &r.PerMinLimit,
		&r.MaxKeys, &r.MaxLevels, &r.Features,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// CreateAPIKey inserts a new API key and returns the row.
func (q *Queries) CreateAPIKey(ctx context.Context, p CreateAPIKeyParams) (*APIKeyRow, error) {
	const query = `
		INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
		VALUES ($1, $2, $3, $4)
		RETURNING id, key_prefix, name, last_used_at, expires_at, revoked_at, created_at`

	var r APIKeyRow
	err := q.pool.QueryRow(ctx, query, p.UserID, p.KeyHash, p.KeyPrefix, p.Name).Scan(
		&r.ID, &r.KeyPrefix, &r.Name, &r.LastUsedAt, &r.ExpiresAt, &r.RevokedAt, &r.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// CountUserKeys returns the number of active (non-revoked) keys for a user.
func (q *Queries) CountUserKeys(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := q.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND revoked_at IS NULL`, userID).Scan(&count)
	return count, err
}

// RevokeAPIKey sets revoked_at on a key belonging to a specific user.
func (q *Queries) RevokeAPIKey(ctx context.Context, id, userID string) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

// UpdateKeyLastUsed asynchronously updates last_used_at.
func (q *Queries) UpdateKeyLastUsed(ctx context.Context, id string) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, id)
	return err
}

// ListUserKeys returns all keys for a user, newest first.
func (q *Queries) ListUserKeys(ctx context.Context, userID string) ([]APIKeyRow, error) {
	const query = `
		SELECT id, key_prefix, name, last_used_at, expires_at, revoked_at, created_at
		FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`

	rows, err := q.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []APIKeyRow
	for rows.Next() {
		var r APIKeyRow
		if err := rows.Scan(&r.ID, &r.KeyPrefix, &r.Name, &r.LastUsedAt,
			&r.ExpiresAt, &r.RevokedAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// UpsertUsageDaily increments usage by 1 for today.
func (q *Queries) UpsertUsageDaily(ctx context.Context, keyID string) error {
	const query = `
		INSERT INTO usage_daily (api_key_id, date, call_count)
		VALUES ($1, CURRENT_DATE, 1)
		ON CONFLICT (api_key_id, date)
		DO UPDATE SET call_count = usage_daily.call_count + 1`
	_, err := q.pool.Exec(ctx, query, keyID)
	return err
}

// GetUsageByKey returns daily usage rows for a key within a date range.
func (q *Queries) GetUsageByKey(ctx context.Context, keyID string, from, to time.Time) ([]UsageDailyRow, error) {
	const query = `
		SELECT date, call_count, cache_hits, error_count
		FROM usage_daily
		WHERE api_key_id = $1 AND date BETWEEN $2 AND $3
		ORDER BY date DESC`

	rows, err := q.pool.Query(ctx, query, keyID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []UsageDailyRow
	for rows.Next() {
		var r UsageDailyRow
		if err := rows.Scan(&r.Date, &r.CallCount, &r.CacheHits, &r.ErrorCount); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// UsageDailyRow is one row of usage data.
type UsageDailyRow struct {
	Date       time.Time
	CallCount  int
	CacheHits  int
	ErrorCount int
}

// GetTodayUsageByKey returns total calls today for a key.
func (q *Queries) GetTodayUsageByKey(ctx context.Context, keyID string) (int64, error) {
	var total int64
	err := q.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(call_count), 0) FROM usage_daily WHERE api_key_id = $1 AND date = CURRENT_DATE`,
		keyID).Scan(&total)
	return total, err
}

// GetUserByEmail looks up a user by email for login.
func (q *Queries) GetUserByEmail(ctx context.Context, email string) (*UserRow, error) {
	const query = `
		SELECT id, email, password_hash, plan_id, stripe_customer_id, status
		FROM users WHERE email = $1`

	var r UserRow
	err := q.pool.QueryRow(ctx, query, email).Scan(
		&r.ID, &r.Email, &r.PasswordHash, &r.PlanID, &r.StripeCustomerID, &r.Status,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// CreateUser inserts a new user and returns the full row.
func (q *Queries) CreateUser(ctx context.Context, email, passwordHash string) (*UserRow, error) {
	const query = `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, password_hash, plan_id, stripe_customer_id, status`

	var r UserRow
	err := q.pool.QueryRow(ctx, query, email, passwordHash).Scan(
		&r.ID, &r.Email, &r.PasswordHash, &r.PlanID, &r.StripeCustomerID, &r.Status,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// GetUser returns user public data by ID.
func (q *Queries) GetUser(ctx context.Context, id string) (*UserPublicRow, error) {
	const query = `
		SELECT id, email, plan_id, stripe_customer_id, status
		FROM users WHERE id = $1`

	var r UserPublicRow
	err := q.pool.QueryRow(ctx, query, id).Scan(
		&r.ID, &r.Email, &r.PlanID, &r.StripeCustomerID, &r.Status,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// UpdateUserPlan updates a user's plan_id.
func (q *Queries) UpdateUserPlan(ctx context.Context, userID string, planID int) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE users SET plan_id = $2, updated_at = NOW() WHERE id = $1`, userID, planID)
	return err
}

// UpdateUserStripeCustomer stores a Stripe customer ID on the user.
func (q *Queries) UpdateUserStripeCustomer(ctx context.Context, userID, customerID string) error {
	_, err := q.pool.Exec(ctx,
		`UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1`,
		userID, customerID)
	return err
}

// GetUserByStripeCustomer looks up a user by Stripe customer ID.
func (q *Queries) GetUserByStripeCustomer(ctx context.Context, stripeCustomerID string) (*UserPublicRow, error) {
	const query = `SELECT id, email, plan_id, stripe_customer_id, status FROM users WHERE stripe_customer_id = $1`
	var r UserPublicRow
	err := q.pool.QueryRow(ctx, query, stripeCustomerID).Scan(
		&r.ID, &r.Email, &r.PlanID, &r.StripeCustomerID, &r.Status,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// CreateRefreshToken stores a hashed refresh token.
func (q *Queries) CreateRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (*RefreshTokenRow, error) {
	const query = `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, expires_at`

	var r RefreshTokenRow
	err := q.pool.QueryRow(ctx, query, userID, tokenHash, expiresAt).Scan(
		&r.ID, &r.UserID, &r.ExpiresAt,
	)
	return &r, err
}

// GetRefreshToken looks up a valid (non-expired) refresh token.
func (q *Queries) GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshTokenRow, error) {
	const query = `
		SELECT id, user_id, expires_at FROM refresh_tokens
		WHERE token_hash = $1 AND expires_at > NOW()`

	var r RefreshTokenRow
	err := q.pool.QueryRow(ctx, query, tokenHash).Scan(&r.ID, &r.UserID, &r.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// DeleteRefreshToken removes a specific refresh token (logout).
func (q *Queries) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := q.pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash = $1`, tokenHash)
	return err
}

// ListPlans returns all billing plans ordered by price.
func (q *Queries) ListPlans(ctx context.Context) ([]PlanRow, error) {
	const query = `
		SELECT id, name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, stripe_price_id, features
		FROM plans ORDER BY price_cents`

	rows, err := q.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []PlanRow
	for rows.Next() {
		var r PlanRow
		if err := rows.Scan(&r.ID, &r.Name, &r.PriceCents, &r.DailyQuota, &r.PerMinLimit,
			&r.MaxKeys, &r.MaxLevels, &r.StripePriceID, &r.Features); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// GetPlanByID returns a single plan.
func (q *Queries) GetPlanByID(ctx context.Context, id int) (*PlanRow, error) {
	const query = `
		SELECT id, name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, stripe_price_id, features
		FROM plans WHERE id = $1`

	var r PlanRow
	err := q.pool.QueryRow(ctx, query, id).Scan(
		&r.ID, &r.Name, &r.PriceCents, &r.DailyQuota, &r.PerMinLimit,
		&r.MaxKeys, &r.MaxLevels, &r.StripePriceID, &r.Features,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// GetPlanByStripePriceID looks up a plan by its Stripe price ID.
func (q *Queries) GetPlanByStripePriceID(ctx context.Context, priceID string) (*PlanRow, error) {
	const query = `
		SELECT id, name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, stripe_price_id, features
		FROM plans WHERE stripe_price_id = $1`

	var r PlanRow
	err := q.pool.QueryRow(ctx, query, priceID).Scan(
		&r.ID, &r.Name, &r.PriceCents, &r.DailyQuota, &r.PerMinLimit,
		&r.MaxKeys, &r.MaxLevels, &r.StripePriceID, &r.Features,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// UpsertSubscription inserts or updates a subscription record.
func (q *Queries) UpsertSubscription(ctx context.Context, p UpsertSubscriptionParams) (*SubscriptionRow, error) {
	const query = `
		INSERT INTO subscriptions (user_id, plan_id, stripe_sub_id, status, period_start, period_end)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (stripe_sub_id)
		DO UPDATE SET
		    status       = EXCLUDED.status,
		    period_start = EXCLUDED.period_start,
		    period_end   = EXCLUDED.period_end,
		    updated_at   = NOW()
		RETURNING id, user_id, plan_id, stripe_sub_id, status, period_start, period_end, cancel_at`

	var r SubscriptionRow
	err := q.pool.QueryRow(ctx, query,
		p.UserID, p.PlanID, p.StripeSubID, p.Status, p.PeriodStart, p.PeriodEnd,
	).Scan(&r.ID, &r.UserID, &r.PlanID, &r.StripeSubID, &r.Status, &r.PeriodStart, &r.PeriodEnd, &r.CancelAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// GetUserSubscription returns the active subscription for a user.
func (q *Queries) GetUserSubscription(ctx context.Context, userID string) (*SubscriptionRow, error) {
	const query = `
		SELECT s.id, s.user_id, s.plan_id, s.stripe_sub_id, s.status, s.period_start, s.period_end, s.cancel_at
		FROM subscriptions s
		WHERE s.user_id = $1 AND s.status = 'active'
		ORDER BY s.created_at DESC LIMIT 1`

	var r SubscriptionRow
	err := q.pool.QueryRow(ctx, query, userID).Scan(
		&r.ID, &r.UserID, &r.PlanID, &r.StripeSubID, &r.Status,
		&r.PeriodStart, &r.PeriodEnd, &r.CancelAt,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// UpdateSubscriptionStatus updates a subscription's status by stripe_sub_id.
func (q *Queries) UpdateSubscriptionStatus(ctx context.Context, stripeSubID, status string) error {
	const query = `
		UPDATE subscriptions
		SET status = $2,
		    canceled_at = CASE WHEN $2 = 'canceled' THEN NOW() ELSE canceled_at END,
		    updated_at = NOW()
		WHERE stripe_sub_id = $1`
	_, err := q.pool.Exec(ctx, query, stripeSubID, status)
	return err
}

-- name: GetAreasByLevel :many
SELECT id, country_code, level, parent_id, name_en, level_label, code, metadata
FROM geo_areas
WHERE country_code = $1
  AND level = $2
  AND ($3::bigint IS NULL OR parent_id = $3)
  AND active = true
ORDER BY name_en;

-- name: GetAreaByID :one
SELECT id, country_code, level, parent_id, name_en, level_label, code, metadata
FROM geo_areas
WHERE id = $1 AND active = true;

-- name: GetChildren :many
SELECT id, country_code, level, parent_id, name_en, level_label, code, metadata
FROM geo_areas
WHERE parent_id = $1 AND active = true
ORDER BY name_en;

-- name: GetAncestors :many
WITH RECURSIVE anc AS (
    SELECT id, country_code, level, parent_id, name_en, level_label
    FROM geo_areas WHERE id = $1
    UNION ALL
    SELECT g.id, g.country_code, g.level, g.parent_id, g.name_en, g.level_label
    FROM geo_areas g INNER JOIN anc a ON g.id = a.parent_id
)
SELECT * FROM anc ORDER BY level;

-- name: GetAPIKeyByHash :one
SELECT
    k.id, k.user_id, k.key_hash, k.key_prefix, k.name, k.revoked_at, k.expires_at,
    p.id           AS plan_id,
    p.name         AS plan_name,
    p.daily_quota,
    p.per_min_limit,
    p.max_keys,
    p.max_levels,
    p.features
FROM api_keys k
JOIN users u ON k.user_id = u.id
JOIN plans p ON u.plan_id = p.id
WHERE k.key_hash = $1;

-- name: CreateAPIKey :one
INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: CountUserKeys :one
SELECT COUNT(*) FROM api_keys
WHERE user_id = $1 AND revoked_at IS NULL;

-- name: RevokeAPIKey :exec
UPDATE api_keys SET revoked_at = NOW()
WHERE id = $1 AND user_id = $2;

-- name: UpdateKeyLastUsed :exec
UPDATE api_keys SET last_used_at = NOW() WHERE id = $1;

-- name: ListUserKeys :many
SELECT id, key_prefix, name, last_used_at, expires_at, revoked_at, created_at
FROM api_keys WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpsertUsageDaily :exec
INSERT INTO usage_daily (api_key_id, date, call_count)
VALUES ($1, CURRENT_DATE, 1)
ON CONFLICT (api_key_id, date)
DO UPDATE SET call_count = usage_daily.call_count + 1;

-- name: GetUsageByKey :many
SELECT date, call_count, cache_hits, error_count
FROM usage_daily
WHERE api_key_id = $1 AND date BETWEEN $2 AND $3
ORDER BY date DESC;

-- name: GetTodayUsageByKey :one
SELECT COALESCE(SUM(call_count), 0) AS total_calls
FROM usage_daily
WHERE api_key_id = $1 AND date = CURRENT_DATE;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, plan_id, stripe_customer_id, status
FROM users WHERE email = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash)
VALUES ($1, $2)
RETURNING *;

-- name: GetUser :one
SELECT id, email, plan_id, stripe_customer_id, status
FROM users WHERE id = $1;

-- name: UpdateUserPlan :exec
UPDATE users SET plan_id = $2, updated_at = NOW() WHERE id = $1;

-- name: UpdateUserStripeCustomer :exec
UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1;

-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetRefreshToken :one
SELECT id, user_id, expires_at FROM refresh_tokens
WHERE token_hash = $1 AND expires_at > NOW();

-- name: DeleteRefreshToken :exec
DELETE FROM refresh_tokens WHERE token_hash = $1;

-- name: DeleteUserRefreshTokens :exec
DELETE FROM refresh_tokens WHERE user_id = $1;

-- name: GetPlanByID :one
SELECT id, name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, stripe_price_id, features
FROM plans WHERE id = $1;

-- name: ListPlans :many
SELECT id, name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, stripe_price_id, features
FROM plans ORDER BY price_cents;

-- name: GetPlanByStripePriceID :one
SELECT id, name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, stripe_price_id, features
FROM plans WHERE stripe_price_id = $1;

-- name: UpsertSubscription :one
INSERT INTO subscriptions (user_id, plan_id, stripe_sub_id, status, period_start, period_end)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (stripe_sub_id)
DO UPDATE SET
    status       = EXCLUDED.status,
    period_start = EXCLUDED.period_start,
    period_end   = EXCLUDED.period_end,
    updated_at   = NOW()
RETURNING *;

-- name: GetUserSubscription :one
SELECT s.id, s.user_id, s.plan_id, s.stripe_sub_id, s.status, s.period_start, s.period_end, s.cancel_at
FROM subscriptions s
WHERE s.user_id = $1 AND s.status = 'active'
ORDER BY s.created_at DESC LIMIT 1;

-- name: UpdateSubscriptionStatus :exec
UPDATE subscriptions SET status = $2, canceled_at = CASE WHEN $2 = 'canceled' THEN NOW() ELSE canceled_at END, updated_at = NOW()
WHERE stripe_sub_id = $1;

-- name: GetUserByStripeCustomer :one
SELECT id, email, plan_id, stripe_customer_id, status
FROM users WHERE stripe_customer_id = $1;

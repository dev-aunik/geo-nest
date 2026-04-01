# GeoNest — AI Agent Build Instructions

> Give this entire document to an AI coding agent (Claude, Cursor, Copilot Workspace, etc.).
> It contains every decision already made. The agent should implement, not design.

---

## What You Are Building

**GeoNest** is a commercial REST API portal that serves administrative/geographic hierarchy data for countries — divisions, districts, cities, ZIP codes, wards, and so on. Developers get an API key, call the endpoints, and get clean JSON back. They pay by subscription tier based on how many requests they make.

Think "Stripe for geo data" — the product is the API, the portal is how people manage their keys and billing, and the docs are how they integrate.

**Phase 1 countries:** Bangladesh (bd), Sri Lanka (lk), Nepal (np), India (in), USA (us), Japan (jp)

**Language:** English only. All API responses, UI, and docs are in English.

---

## Tech Stack — Use Exactly These Tools. Do Not Add Others.

| Layer | Tool | Notes |
|---|---|---|
| API server | Go + Fiber v3 | Fast HTTP, good middleware model |
| Database | PostgreSQL 16 | All persistent data lives here |
| Cache + Rate limiting | Redis 7 | Cache-aside pattern + sliding window rate limits |
| Search | Typesense 27 | Typo-tolerant search across area names |
| Frontend | Next.js 15 (App Router) | Portal, dashboard, docs |
| UI | Tailwind CSS + shadcn/ui | No custom CSS framework |
| Payments | Stripe | Checkout + webhooks + Customer Portal |
| Email | Resend | Transactional emails only |
| Containers | Docker + Docker Compose | Dev and prod deployment |
| DB migrations | golang-migrate v4 | SQL migration files |
| DB query generation | sqlc | Generates type-safe Go from raw SQL |

**Do not add:** RabbitMQ, Kafka, any message broker, Kubernetes, any ORM, GraphQL, Redis pub/sub, WebSockets. Go goroutines handle all async work at this scale.

---

## Repository Structure

```
geonest/
├── api/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/config.go
│   │   ├── middleware/
│   │   │   ├── auth.go
│   │   │   ├── ratelimit.go
│   │   │   └── security.go
│   │   ├── handlers/
│   │   │   ├── geo.go
│   │   │   ├── search.go
│   │   │   ├── keys.go
│   │   │   ├── auth.go
│   │   │   ├── usage.go
│   │   │   ├── billing.go
│   │   │   └── errors.go
│   │   ├── services/
│   │   │   ├── geo_service.go
│   │   │   ├── key_service.go
│   │   │   ├── search_service.go
│   │   │   └── billing_service.go
│   │   ├── repository/         <- sqlc generated files go here
│   │   ├── cache/redis.go
│   │   └── models/models.go
│   ├── migrations/
│   │   ├── 000001_init_schema.up.sql
│   │   ├── 000001_init_schema.down.sql
│   │   ├── 000002_seed_plans.up.sql
│   │   └── 000002_seed_plans.down.sql
│   ├── seeds/
│   │   ├── main.go
│   │   ├── bd.go
│   │   ├── lk.go
│   │   ├── np.go
│   │   ├── in.go
│   │   ├── us.go
│   │   └── jp.go
│   ├── queries/geo.sql
│   ├── sqlc.yaml
│   ├── go.mod
│   └── Dockerfile
├── web/
│   ├── app/
│   │   ├── (marketing)/page.tsx
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── (dashboard)/layout.tsx
│   │   ├── (dashboard)/overview/page.tsx
│   │   ├── (dashboard)/keys/page.tsx
│   │   ├── (dashboard)/usage/page.tsx
│   │   ├── (dashboard)/billing/page.tsx
│   │   └── docs/[[...slug]]/page.tsx
│   ├── components/ui/
│   ├── lib/api.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## Step 1 — Environment File

### .env.example

```
# Database
DATABASE_URL=postgres://geonest:geonest_dev@localhost:5432/geonest?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# Typesense
TYPESENSE_URL=http://localhost:8108
TYPESENSE_API_KEY=dev_typesense_key

# App
API_PORT=8000
JWT_SECRET=replace_with_64_char_random_string_in_production
API_KEY_PREFIX=gn_live_

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_STARTER_PRICE_ID=price_replace_me
STRIPE_PRO_PRICE_ID=price_replace_me

# Resend
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=noreply@geonest.io

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

---

## Step 2 — Docker Compose

### docker-compose.yml

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: geonest
      POSTGRES_PASSWORD: geonest_dev
      POSTGRES_DB: geonest
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U geonest"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  typesense:
    image: typesense/typesense:27.0
    ports:
      - "8108:8108"
    environment:
      TYPESENSE_DATA_DIR: /data
      TYPESENSE_API_KEY: dev_typesense_key
    volumes:
      - tsdata:/data

  api:
    build:
      context: ./api
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./api:/app

  web:
    build:
      context: ./web
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - api
    volumes:
      - ./web:/app

volumes:
  pgdata:
  tsdata:
```

---

## Step 3 — PostgreSQL Migrations

### migrations/000001_init_schema.up.sql

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE plans (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  daily_quota     INTEGER NOT NULL,
  per_min_limit   INTEGER NOT NULL,
  max_keys        INTEGER NOT NULL,
  max_levels      INTEGER NOT NULL DEFAULT 4,
  stripe_price_id TEXT,
  features        JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  plan_id             INTEGER NOT NULL REFERENCES plans(id) DEFAULT 1,
  stripe_customer_id  TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  email_verified_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash      TEXT NOT NULL UNIQUE,
  key_prefix    CHAR(12) NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Default',
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id         INTEGER NOT NULL REFERENCES plans(id),
  stripe_sub_id   TEXT UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',
  period_start    TIMESTAMPTZ,
  period_end      TIMESTAMPTZ,
  cancel_at       TIMESTAMPTZ,
  canceled_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_sub_id);

CREATE TABLE geo_areas (
  id            BIGSERIAL PRIMARY KEY,
  country_code  CHAR(2) NOT NULL,
  level         SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
  parent_id     BIGINT REFERENCES geo_areas(id),
  name_en       TEXT NOT NULL,
  level_label   TEXT NOT NULL,
  code          TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_geo_areas_cc_level    ON geo_areas(country_code, level);
CREATE INDEX idx_geo_areas_parent_id   ON geo_areas(parent_id);
CREATE UNIQUE INDEX idx_geo_areas_code ON geo_areas(country_code, code) WHERE code IS NOT NULL;

CREATE TABLE usage_daily (
  id            BIGSERIAL PRIMARY KEY,
  api_key_id    UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  call_count    INTEGER NOT NULL DEFAULT 0,
  cache_hits    INTEGER NOT NULL DEFAULT 0,
  error_count   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(api_key_id, date)
);
CREATE INDEX idx_usage_daily_key_date ON usage_daily(api_key_id, date DESC);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### migrations/000001_init_schema.down.sql

```sql
DROP TABLE IF EXISTS refresh_tokens, usage_daily, geo_areas,
                     subscriptions, api_keys, users, plans;
DROP EXTENSION IF EXISTS "pgcrypto";
```

### migrations/000002_seed_plans.up.sql

```sql
INSERT INTO plans (name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, features) VALUES
  ('free',       0,      500,    10,  1, 3, '{"formats":["json"],"search":false}'::jsonb),
  ('starter',    900,    50000,  100, 3, 4, '{"formats":["json","csv"],"search":true,"reverse_geocode":true}'::jsonb),
  ('pro',        2900,   500000, 600, 10, 4, '{"formats":["json","csv","xml"],"search":true,"reverse_geocode":true,"bulk_export":true}'::jsonb),
  ('enterprise', 0,      -1,     -1, -1, 4, '{"formats":["json","csv","xml"],"search":true,"custom":true}'::jsonb);
```

---

## Step 4 — Go Backend

### go.mod

```
module github.com/yourorg/geonest-api

go 1.22

require (
    github.com/gofiber/fiber/v3 v3.0.0
    github.com/jackc/pgx/v5 v5.6.0
    github.com/redis/go-redis/v9 v9.5.1
    github.com/typesense/typesense-go v2.0.0
    github.com/golang-jwt/jwt/v5 v5.2.1
    github.com/stripe/stripe-go/v79 v79.0.0
    github.com/resendlabs/resend-go v1.7.0
    github.com/golang-migrate/migrate/v4 v4.17.1
    golang.org/x/crypto v0.23.0
    github.com/spf13/viper v1.19.0
)
```

### cmd/server/main.go

```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/middleware/cors"
    "github.com/gofiber/fiber/v3/middleware/logger"
    "github.com/gofiber/fiber/v3/middleware/requestid"
    "github.com/yourorg/geonest-api/internal/config"
    "github.com/yourorg/geonest-api/internal/handlers"
    "github.com/yourorg/geonest-api/internal/middleware"
)

func main() {
    cfg := config.Load()

    app := fiber.New(fiber.Config{
        AppName:      "GeoNest API v1",
        ReadTimeout:  10,
        WriteTimeout: 10,
        BodyLimit:    64 * 1024,
        ErrorHandler: handlers.ErrorHandler,
    })

    app.Use(requestid.New())
    app.Use(logger.New())
    app.Use(middleware.SecurityHeaders())
    app.Use(cors.New(cors.Config{
        AllowOrigins: []string{"https://geonest.io", "http://localhost:3000"},
        AllowHeaders: []string{"Origin", "Content-Type", "Authorization", "X-API-Key"},
        AllowMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
    }))

    v1 := app.Group("/v1")

    // Public routes
    v1.Post("/auth/register", handlers.Register)
    v1.Post("/auth/login", handlers.Login)
    v1.Post("/auth/refresh", handlers.RefreshToken)
    v1.Get("/geo/countries", handlers.ListCountries)
    v1.Post("/billing/webhook", handlers.StripeWebhook)
    app.Get("/health", handlers.HealthCheck)

    // API key protected routes
    api := v1.Group("", middleware.APIKeyAuth(cfg), middleware.RateLimit(cfg))
    api.Get("/geo/:cc", handlers.GetCountry)
    api.Get("/geo/:cc/l1", handlers.GetLevel)
    api.Get("/geo/:cc/l1/:id", handlers.GetAreaByID)
    api.Get("/geo/:cc/l2", handlers.GetLevel)
    api.Get("/geo/:cc/l2/:id", handlers.GetAreaByID)
    api.Get("/geo/:cc/l3", handlers.GetLevel)
    api.Get("/geo/:cc/l3/:id", handlers.GetAreaByID)
    api.Get("/geo/:cc/l4", handlers.GetLevel)
    api.Get("/geo/:cc/l4/:id", handlers.GetAreaByID)
    api.Get("/geo/:cc/l:n/:id/children", handlers.GetChildren)
    api.Get("/geo/:cc/l:n/:id/ancestors", handlers.GetAncestors)
    api.Get("/search", handlers.Search)
    api.Get("/search/autocomplete", handlers.Autocomplete)
    api.Get("/usage", handlers.GetUsage)
    api.Get("/usage/history", handlers.GetUsageHistory)

    // JWT protected routes (dashboard actions)
    jwt := v1.Group("", middleware.JWTAuth(cfg))
    jwt.Get("/keys", handlers.ListKeys)
    jwt.Post("/keys", handlers.CreateKey)
    jwt.Post("/keys/:id/rotate", handlers.RotateKey)
    jwt.Delete("/keys/:id", handlers.RevokeKey)
    jwt.Get("/billing/plans", handlers.ListPlans)
    jwt.Post("/billing/subscribe", handlers.Subscribe)
    jwt.Get("/billing/portal", handlers.BillingPortal)

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    go func() { <-quit; app.Shutdown() }()

    log.Fatal(app.Listen(":" + cfg.APIPort))
}
```

### internal/middleware/auth.go

```go
package middleware

import (
    "crypto/sha256"
    "encoding/hex"
    "github.com/gofiber/fiber/v3"
)

// APIKeyAuth validates X-API-Key header (or ?api_key= query param).
// Hashes the raw key and looks it up: Redis cache first, PostgreSQL fallback.
// Sets "api_key", "api_key_hash", "user_id", "plan" in fiber Locals.
func APIKeyAuth(cfg *config.Config) fiber.Handler {
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
        key, err := cfg.Cache.GetKeyWithPlan(c.Context(), hash)
        if err != nil {
            key, err = cfg.DB.GetAPIKeyByHash(c.Context(), hash)
            if err != nil || key == nil || key.RevokedAt != nil {
                return respondError(c, 401, "INVALID_API_KEY",
                    "Invalid or revoked API key.")
            }
            go cfg.Cache.SetKeyWithPlan(c.Context(), hash, key)
        }

        c.Locals("api_key", key)
        c.Locals("api_key_hash", hash)
        c.Locals("user_id", key.UserID)
        c.Locals("plan", key.Plan)

        go cfg.DB.UpdateKeyLastUsed(c.Context(), key.ID)
        return c.Next()
    }
}

func sha256Hex(s string) string {
    h := sha256.Sum256([]byte(s))
    return hex.EncodeToString(h[:])
}
```

### internal/middleware/ratelimit.go

```go
package middleware

import (
    "fmt"
    "time"

    "github.com/gofiber/fiber/v3"
    redis "github.com/redis/go-redis/v9"
)

func RateLimit(cfg *config.Config) fiber.Handler {
    return func(c fiber.Ctx) error {
        plan    := c.Locals("plan").(*models.Plan)
        keyHash := c.Locals("api_key_hash").(string)
        ctx     := c.Context()
        rdb     := cfg.Redis

        if plan.DailyQuota == -1 {
            return c.Next() // enterprise = unlimited
        }

        now   := time.Now()
        nowMs := now.UnixMilli()

        // Per-minute sliding window (sorted set)
        minKey := fmt.Sprintf("rl:%s:min", keyHash)
        pipe   := rdb.Pipeline()
        pipe.ZRemRangeByScore(ctx, minKey, "0", fmt.Sprint(nowMs-60000))
        pipe.ZAdd(ctx, minKey, redis.Z{Score: float64(nowMs), Member: nowMs})
        pipe.ZCard(ctx, minKey)
        pipe.Expire(ctx, minKey, 61*time.Second)
        res, _ := pipe.Exec(ctx)
        minCount := res[2].(*redis.IntCmd).Val()

        // Per-day counter (INCR, expires at midnight UTC)
        dayKey   := fmt.Sprintf("rl:%s:day", keyHash)
        dayCount, _ := rdb.Incr(ctx, dayKey).Result()
        if dayCount == 1 {
            midnight := time.Date(now.Year(), now.Month(), now.Day()+1,
                0, 0, 0, 0, time.UTC)
            rdb.ExpireAt(ctx, dayKey, midnight)
        }

        remaining  := int64(plan.DailyQuota) - dayCount
        if remaining < 0 { remaining = 0 }
        resetEpoch := time.Date(now.Year(), now.Month(), now.Day()+1,
            0, 0, 0, 0, time.UTC).Unix()

        c.Set("X-RateLimit-Limit", fmt.Sprint(plan.DailyQuota))
        c.Set("X-RateLimit-Remaining", fmt.Sprint(remaining))
        c.Set("X-RateLimit-Reset", fmt.Sprint(resetEpoch))

        if minCount > int64(plan.PerMinLimit) {
            retryAfter := 60 - now.Second()
            c.Set("Retry-After", fmt.Sprint(retryAfter))
            return respondError(c, 429, "RATE_LIMIT_EXCEEDED",
                fmt.Sprintf("Per-minute limit of %d requests exceeded. Retry after %ds.",
                    plan.PerMinLimit, retryAfter))
        }

        if dayCount > int64(plan.DailyQuota) {
            secsLeft := int(time.Until(time.Unix(resetEpoch, 0)).Seconds())
            c.Set("Retry-After", fmt.Sprint(secsLeft))
            return respondError(c, 429, "DAILY_QUOTA_EXCEEDED",
                fmt.Sprintf("Daily quota of %d requests exceeded. Resets in %ds.",
                    plan.DailyQuota, secsLeft))
        }

        // Log usage async — never block the API response
        go cfg.DB.UpsertUsageDaily(c.Context(), keyHash, now)

        return c.Next()
    }
}
```

### internal/middleware/security.go

```go
package middleware

import "github.com/gofiber/fiber/v3"

func SecurityHeaders() fiber.Handler {
    return func(c fiber.Ctx) error {
        c.Set("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "+
            "img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
        c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        c.Set("X-Content-Type-Options", "nosniff")
        c.Set("X-Frame-Options", "DENY")
        c.Set("Referrer-Policy", "no-referrer")
        c.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        return c.Next()
    }
}
```

### internal/services/geo_service.go

```go
package services

import (
    "context"
    "encoding/json"
    "fmt"
    "regexp"
    "time"
)

var validCC    = regexp.MustCompile(`^[a-z]{2}$`)
var validIDStr = regexp.MustCompile(`^\d+$`)

var SupportedCountries = map[string]models.CountryMeta{
    "bd": {Code:"bd", Name:"Bangladesh",   Levels:4, LevelLabels:[]string{"division","district","upazila","union"}},
    "lk": {Code:"lk", Name:"Sri Lanka",    Levels:4, LevelLabels:[]string{"province","district","ds_division","gn_division"}},
    "np": {Code:"np", Name:"Nepal",         Levels:4, LevelLabels:[]string{"province","district","municipality","ward"}},
    "in": {Code:"in", Name:"India",         Levels:3, LevelLabels:[]string{"state","district","sub_district"}},
    "us": {Code:"us", Name:"United States", Levels:4, LevelLabels:[]string{"state","county","city","zip_code"}},
    "jp": {Code:"jp", Name:"Japan",         Levels:3, LevelLabels:[]string{"prefecture","municipality","ward"}},
}

// GetAreas — cache-aside: Redis first (24h TTL), PostgreSQL fallback, async cache populate.
func (s *GeoService) GetAreas(ctx context.Context, cc string, level int, parentID *int64) ([]models.GeoArea, error) {
    if !validCC.MatchString(cc) { return nil, ErrInvalidCountryCode }
    if _, ok := SupportedCountries[cc]; !ok { return nil, ErrUnsupportedCountry }
    if level < 1 || level > 4 { return nil, ErrInvalidLevel }

    parentStr := "nil"
    if parentID != nil { parentStr = fmt.Sprint(*parentID) }
    cacheKey := fmt.Sprintf("geo:%s:%d:%s", cc, level, parentStr)

    if cached, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil {
        var areas []models.GeoArea
        if json.Unmarshal(cached, &areas) == nil { return areas, nil }
    }

    areas, err := s.db.GetAreasByLevel(ctx, cc, int16(level), parentID)
    if err != nil { return nil, err }

    go func() {
        if b, err := json.Marshal(areas); err == nil {
            s.redis.Set(context.Background(), cacheKey, b, 24*time.Hour)
        }
    }()

    return areas, nil
}
```

### API response shapes — use these everywhere, no exceptions

```go
// models/responses.go

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

type AreaLinks struct {
    Self      string  `json:"self"`
    Parent    *string `json:"parent,omitempty"`
    Children  *string `json:"children,omitempty"`
    Ancestors string  `json:"ancestors"`
}

type GeoListResponse struct {
    Data        []GeoAreaResponse `json:"data"`
    Count       int               `json:"count"`
    CountryCode string            `json:"country_code"`
    Level       int               `json:"level"`
}

type ErrorResponse struct {
    Error     ErrorDetail `json:"error"`
    RequestID string      `json:"request_id"`
}
type ErrorDetail struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Docs    string `json:"docs"`
}
```

```go
// shared helper used by all error paths
func respondError(c fiber.Ctx, status int, code, message string) error {
    return c.Status(status).JSON(ErrorResponse{
        Error: ErrorDetail{
            Code:    code,
            Message: message,
            Docs:    fmt.Sprintf("https://docs.geonest.io/errors#%s", strings.ToLower(code)),
        },
        RequestID: fmt.Sprint(c.Locals("requestid")),
    })
}
```

### handlers/errors.go

```go
func ErrorHandler(c fiber.Ctx, err error) error {
    status := fiber.StatusInternalServerError
    code   := "INTERNAL_ERROR"
    msg    := "An unexpected error occurred."

    var fe *fiber.Error
    if errors.As(err, &fe) {
        status = fe.Code
        msg    = fe.Message
        switch status {
        case 400: code = "BAD_REQUEST"
        case 401: code = "UNAUTHORIZED"
        case 403: code = "FORBIDDEN"
        case 404: code = "NOT_FOUND"
        case 422: code = "INVALID_PARAMETER"
        }
    }

    // Log real error server-side. Never send stack traces to clients.
    log.Printf("ERROR [%s] %s %s: %v", c.Locals("requestid"), c.Method(), c.Path(), err)
    return respondError(c, status, code, msg)
}
```

### internal/services/key_service.go — key generation

```go
import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/base32"
    "encoding/hex"
    "strings"
)

const keyPrefix = "gn_live_"

// GenerateAPIKey returns (rawKey, hash, displayPrefix).
// rawKey is shown to the user ONCE. Only hash is stored in the database.
func GenerateAPIKey() (rawKey, hash, displayPrefix string, err error) {
    b := make([]byte, 32)
    if _, err = rand.Read(b); err != nil { return }

    suffix := strings.ToLower(
        base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b))
    rawKey = keyPrefix + suffix

    h := sha256.Sum256([]byte(rawKey))
    hash = hex.EncodeToString(h[:])
    displayPrefix = rawKey[:12]
    return
}
```

### handlers/keys.go — CreateKey endpoint

```go
// POST /v1/keys — requires JWT
func (h *KeyHandler) CreateKey(c fiber.Ctx) error {
    userID := c.Locals("user_id").(string)
    plan   := c.Locals("plan").(*models.Plan)

    count, _ := h.db.CountUserKeys(c.Context(), userID)
    if plan.MaxKeys != -1 && count >= int64(plan.MaxKeys) {
        return respondError(c, 403, "KEY_LIMIT_REACHED",
            fmt.Sprintf("Plan limit: %d API keys. Upgrade to create more.", plan.MaxKeys))
    }

    body := &struct{ Name string `json:"name"` }{}
    c.BodyParser(body)
    if body.Name == "" { body.Name = fmt.Sprintf("Key %d", count+1) }

    raw, hash, prefix, err := services.GenerateAPIKey()
    if err != nil { return respondError(c, 500, "INTERNAL_ERROR", "Could not generate key.") }

    key, err := h.db.CreateAPIKey(c.Context(), db.CreateAPIKeyParams{
        UserID: userID, KeyHash: hash, KeyPrefix: prefix, Name: body.Name,
    })
    if err != nil { return respondError(c, 500, "INTERNAL_ERROR", "Could not save key.") }

    return c.Status(201).JSON(fiber.Map{
        "key":     raw,      // full key shown once, never again
        "id":      key.ID,
        "prefix":  prefix,
        "name":    key.Name,
        "warning": "Save this key now. It will not be shown again.",
    })
}
```

---

## Step 5 — sqlc Configuration

### sqlc.yaml

```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "queries/geo.sql"
    schema: "migrations/"
    gen:
      go:
        package: "db"
        out: "internal/repository"
        emit_json_tags: true
        emit_prepared_queries: false
        emit_interface: true
```

### queries/geo.sql

```sql
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
```

---

## Step 6 — Typesense Search

### Create collection on server startup if it does not exist

```go
// internal/search/typesense.go

func EnsureCollection(client *typesense.Client) error {
    _, err := client.Collection("geo_areas").Retrieve(context.Background())
    if err == nil { return nil } // already exists

    schema := &api.CollectionSchema{
        Name: "geo_areas",
        Fields: []api.Field{
            {Name: "id",           Type: "string"},
            {Name: "country_code", Type: "string", Facet: boolPtr(true)},
            {Name: "level",        Type: "int32",  Facet: boolPtr(true)},
            {Name: "level_label",  Type: "string", Facet: boolPtr(true)},
            {Name: "name_en",      Type: "string"},
            {Name: "parent_name",  Type: "string", Optional: boolPtr(true)},
            {Name: "full_path",    Type: "string"},
            {Name: "code",         Type: "string", Optional: boolPtr(true)},
        },
        DefaultSortingField: strPtr("level"),
    }
    _, err = client.Collections().Create(context.Background(), schema)
    return err
}
```

### Sync all geo_areas to Typesense after seeding

```go
// Read geo_areas from PG in batches of 500.
// For each row build: {id, country_code, level, level_label, name_en, parent_name, full_path, code}
// full_path example: "Bangladesh > Dhaka > Dhaka > Dhanmondi"
// Call ts.Collection("geo_areas").Documents().Import(batch, importParams)
```

### handlers/search.go

```go
// GET /v1/search?q=dhaka&cc=bd&level=2&limit=10
func (h *SearchHandler) Search(c fiber.Ctx) error {
    q := strings.TrimSpace(c.Query("q"))
    if len(q) < 2 {
        return respondError(c, 422, "INVALID_PARAMETER",
            "Search query must be at least 2 characters.")
    }

    cc    := c.Query("cc")
    level := c.Query("level")
    limit := c.QueryInt("limit", 10)
    if limit > 50 { limit = 50 }

    filterBy := ""
    if cc != "" { filterBy = fmt.Sprintf("country_code:=%s", cc) }
    if level != "" {
        if filterBy != "" { filterBy += " && " }
        filterBy += fmt.Sprintf("level:=%s", level)
    }

    perPage := limit
    params := &api.SearchCollectionParams{
        Q:               q,
        QueryBy:         "name_en,full_path",
        NumTypos:        strPtr("2"),
        PerPage:         &perPage,
        HighlightFields: strPtr("name_en"),
    }
    if filterBy != "" { params.FilterBy = &filterBy }

    results, err := h.ts.Collection("geo_areas").Documents().Search(c.Context(), params)
    if err != nil {
        return respondError(c, 500, "INTERNAL_ERROR", "Search unavailable.")
    }
    return c.JSON(formatSearchResults(results))
}
```

---

## Step 7 — Data Seeds

### Seed pattern (apply to all 6 countries)

```go
// seeds/bd.go
// Data: download JSON from https://github.com/SudipMHX/bd-apis/tree/main/src/database
// Place files in seeds/data/bd/divisions.json, districts.json, upazilas.json, unions.json

func SeedBangladesh(ctx context.Context, db *pgxpool.Pool) error {
    tx, _ := db.Begin(ctx)
    defer tx.Rollback(ctx)

    // 1. Insert L1 divisions. Store returned IDs mapped by original source ID.
    // 2. Insert L2 districts with parent_id = matching division ID.
    // 3. Insert L3 upazilas with parent_id = matching district ID.
    // 4. Insert L4 unions with parent_id = matching upazila ID.
    // Use batched inserts (1000 rows per batch).
    // Use ON CONFLICT DO NOTHING — seeds are idempotent.

    return tx.Commit(ctx)
}
```

### seeds/main.go

```go
func main() {
    cfg := config.Load()
    ctx := context.Background()

    if err := SeedBangladesh(ctx, cfg.DB); err != nil { log.Fatal(err) }
    if err := SeedSriLanka(ctx, cfg.DB);  err != nil { log.Fatal(err) }
    if err := SeedNepal(ctx, cfg.DB);     err != nil { log.Fatal(err) }
    if err := SeedIndia(ctx, cfg.DB);     err != nil { log.Fatal(err) }
    if err := SeedUSA(ctx, cfg.DB);       err != nil { log.Fatal(err) }
    if err := SeedJapan(ctx, cfg.DB);     err != nil { log.Fatal(err) }
    if err := search.SyncAllToTypesense(cfg.DB, cfg.Typesense); err != nil { log.Fatal(err) }
    log.Println("All seeds complete.")
}
```

### Data sources

| Country | Source | Format | Important notes |
|---|---|---|---|
| Bangladesh | github.com/SudipMHX/bd-apis | JSON | 8 divisions, 64 districts, 495 upazilas, 4550+ unions. Best quality. |
| Sri Lanka | statistics.gov.lk | CSV | 9 provinces, 25 districts, 331 DS divisions, 14021 GN divisions. |
| Nepal | opennepal.net + cbs.gov.np | JSON/CSV | 7 provinces, 77 districts, 753 municipalities, 6743 wards. |
| India | lgdirectory.gov.in | CSV | 36 states/UTs, 766 districts, ~6000 sub-districts. Seed L1–L3 only. |
| USA | census.gov TIGER Gazetteer | CSV | 51 states, 3143 counties, ~35K cities, ~42K ZIP codes. Public domain. |
| Japan | stat.go.jp Statistics Bureau | CSV (Shift-JIS) | Convert to UTF-8 in seed script. 47 prefectures, 1741 municipalities, ~19K wards. |

---

## Step 8 — Stripe Billing

### handlers/billing.go

```go
// POST /v1/billing/subscribe  body: {"plan": "starter" | "pro"}
func (h *BillingHandler) Subscribe(c fiber.Ctx) error {
    userID := c.Locals("user_id").(string)
    user, err := h.db.GetUser(c.Context(), userID)
    if err != nil { return respondError(c, 500, "INTERNAL_ERROR", "Could not load user.") }

    body := &struct{ Plan string `json:"plan"` }{}
    c.BodyParser(body)

    priceID := map[string]string{
        "starter": h.cfg.StarterPriceID,
        "pro":     h.cfg.ProPriceID,
    }[body.Plan]
    if priceID == "" {
        return respondError(c, 422, "INVALID_PARAMETER", "Plan must be 'starter' or 'pro'.")
    }

    if user.StripeCustomerID == "" {
        cust, err := customer.New(&stripe.CustomerParams{Email: stripe.String(user.Email)})
        if err != nil { return respondError(c, 500, "INTERNAL_ERROR", "Billing setup failed.") }
        h.db.UpdateUserStripeCustomer(c.Context(), userID, cust.ID)
        user.StripeCustomerID = cust.ID
    }

    s, err := session.New(&stripe.CheckoutSessionParams{
        Customer: stripe.String(user.StripeCustomerID),
        Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {Price: stripe.String(priceID), Quantity: stripe.Int64(1)},
        },
        SuccessURL: stripe.String("https://geonest.io/dashboard/billing?success=1"),
        CancelURL:  stripe.String("https://geonest.io/dashboard/billing"),
    })
    if err != nil { return respondError(c, 500, "INTERNAL_ERROR", "Checkout failed.") }

    return c.JSON(fiber.Map{"checkout_url": s.URL})
}

// POST /v1/billing/webhook — Stripe sends events here
func (h *BillingHandler) StripeWebhook(c fiber.Ctx) error {
    event, err := webhook.ConstructEvent(
        c.Body(), c.Get("Stripe-Signature"), h.cfg.StripeWebhookSecret)
    if err != nil { return c.Status(400).SendString("Invalid signature") }

    switch event.Type {
    case "checkout.session.completed":
        // Parse session.customer, find user, upgrade plan_id in DB
    case "customer.subscription.updated":
        // Handle plan changes
    case "customer.subscription.deleted":
        // Downgrade user to free plan (plan_id = 1)
    case "invoice.payment_failed":
        // Set subscription status to 'past_due', queue warning email
    }

    return c.SendStatus(200)
}
```

---

## Step 9 — Next.js Frontend

### Setup commands

```bash
cd web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npx shadcn@latest init
npx shadcn@latest add button card input label badge table dialog tabs separator toast
npm install axios swr recharts lucide-react
```

### Landing page sections (build in this order)

**NavBar** — Logo left. Nav links: Docs, Pricing, GitHub. "Get free key" button right.

**Hero** — Large headline: "Geo API for South Asia, USA & Japan". Subtext: "Administrative hierarchy data for 6 countries. API key in 30 seconds. 133,000+ areas. Free tier available." Two buttons: "Get free API key" → /register and "View docs" → /docs. Below: static code block showing a curl request and the JSON response it returns.

**Stats row** — Four numbers: "6 Countries", "133K+ Areas", "<5ms P99", "Free Tier".

**Countries grid** — Six cards in 3×2. Each: flag emoji, country name, level count, total area count. Example: "🇧🇩 Bangladesh · 4 levels · 5,100+ areas".

**Code samples** — Tabs: curl | JavaScript | Python | Go | PHP. Each shows a complete working example calling `GET /v1/geo/bd/l2`.

**Pricing** — Four cards: Free ($0), Starter ($9/mo), Pro ($29/mo — "Most Popular" badge, highlighted border), Enterprise (Custom). Each lists key limits and features.

**Footer** — Three columns: Product, Company, Legal. Copyright.

### Dashboard pages

**app/(dashboard)/layout.tsx** — Left sidebar with links: Overview, API Keys, Usage, Billing, Docs (external). Show current plan name as a badge in the sidebar.

**app/(dashboard)/keys/page.tsx**
- Table: Name | Key prefix | Created | Last Used | Actions (Rotate / Revoke)
- "Create key" button → Dialog → name input → create → show one-time key reveal (monospace box + copy button + "This key will not be shown again" warning)
- After dismissing the reveal, table shows only the prefix

**app/(dashboard)/overview/page.tsx**
- Three stat cards: Calls today | Remaining quota | Active keys
- Bar chart (recharts): daily call volume, last 30 days
- Table: last 10 calls with timestamp, endpoint, status

**app/(dashboard)/billing/page.tsx**
- Current plan banner: name, price, renewal date, Upgrade button
- Compact plan comparison
- Upgrade → POST /v1/billing/subscribe → redirect to checkout_url
- "Manage billing" → GET /v1/billing/portal → redirect to portal URL

### Docs site structure

```
app/docs/
  page.mdx                    Quick Start — 5 minutes to first API call
  authentication/page.mdx     How API keys work, where to send them
  rate-limits/page.mdx        Limits per plan, headers, handling 429
  errors/page.mdx             Full error code table
  countries/page.mdx          Supported countries, level names, area counts
  endpoints/
    geo/page.mdx              All /geo/* endpoints
    search/page.mdx           /search and /search/autocomplete
    usage/page.mdx            /usage and /usage/history
    keys/page.mdx             Key management endpoints
    billing/page.mdx          Subscription and billing endpoints
  code-samples/
    javascript/page.mdx
    python/page.mdx
    go/page.mdx
    php/page.mdx
    curl/page.mdx
```

Every endpoint doc must include: description, parameters table (name/type/required/description), request example, response example (real JSON), and error codes that endpoint can return.

---

## Step 10 — Error Codes Reference

All error responses use this exact shape:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Per-minute limit of 10 requests exceeded. Retry after 47s.",
    "docs": "https://docs.geonest.io/errors#rate_limit_exceeded"
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| HTTP | Code | Meaning | Fix |
|---|---|---|---|
| 400 | BAD_REQUEST | Malformed request body | Check JSON syntax |
| 401 | UNAUTHORIZED | No API key provided | Add X-API-Key header |
| 401 | INVALID_API_KEY | Key not found or revoked | Check the key is correct |
| 403 | FORBIDDEN | No permission for this action | Check plan features |
| 403 | KEY_LIMIT_REACHED | Max keys for plan reached | Upgrade plan |
| 404 | NOT_FOUND | Area ID does not exist | Check the ID |
| 422 | INVALID_PARAMETER | Bad path or query parameter | Check country code and param types |
| 422 | UNSUPPORTED_COUNTRY | Country not in Phase 1 | See /geo/countries |
| 429 | RATE_LIMIT_EXCEEDED | Per-minute limit hit | Wait — check Retry-After header |
| 429 | DAILY_QUOTA_EXCEEDED | Daily quota used up | Wait for midnight UTC, or upgrade |
| 500 | INTERNAL_ERROR | Server error | Retry with exponential backoff |

---

## Rules the Agent Must Follow

1. **No raw SQL in fmt.Sprintf** — all DB queries use sqlc-generated functions with typed parameters.
2. **Never store raw API keys** — SHA-256 hash only. Log only the display prefix.
3. **Validate all path parameters before any DB call** — country_code matches `^[a-z]{2}$`, IDs are numeric. Return 422 immediately on failure.
4. **No stack traces in error responses** — log server-side, return only the structured error JSON.
5. **Redis cache population is always async** — use a goroutine. A cache write must never block the API response.
6. **Usage logging is always async** — use a goroutine. A failed usage write must never fail the API response.
7. **Do not expose internal IDs or hashes in error messages** — all error messages are safe to show to end users.
8. **India L4 (villages) is deferred** — do not seed or expose it in Phase 1. The 600K row scale needs cursor pagination.
9. **CORS allowlist is strict** — only `https://geonest.io` and `http://localhost:3000`. No wildcards.
10. **Seeds must be idempotent** — use `ON CONFLICT DO NOTHING`. Running seeds twice must not duplicate data.

---

## Acceptance Criteria — Phase 1 Complete When All Pass

- [ ] `docker-compose up` starts all services with no manual steps
- [ ] `GET /health` returns `{"status": "ok"}`
- [ ] `GET /v1/geo/countries` returns all 6 countries
- [ ] `GET /v1/geo/bd/l1` with a valid key returns 8 Bangladesh divisions
- [ ] `GET /v1/geo/us/l2` returns 3143 US counties
- [ ] `GET /v1/geo/jp/l1` returns 47 Japanese prefectures
- [ ] Second identical request is served from Redis (confirm via logs showing cache hit)
- [ ] A free-tier key gets 429 after 500 requests in one day
- [ ] New key creation returns raw key once, table shows only the prefix afterward
- [ ] Stripe Checkout flow upgrades a test user from Free to Starter
- [ ] Stripe webhook on `checkout.session.completed` updates user plan_id in DB
- [ ] `GET /v1/search?q=dhaka&cc=bd` returns Dhaka-related results via Typesense
- [ ] All 6 security headers present on every API response
- [ ] All error responses use the `{error: {code, message, docs}, request_id}` shape
- [ ] Landing page loads with Hero, Countries, Code Samples, and Pricing sections
- [ ] Dashboard shows key table, usage chart, and billing plan information
- [ ] Docs site has Quick Start, Authentication, Rate Limits, and all endpoint pages
- [ ] Seed scripts complete without errors and are idempotent

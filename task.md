# GeoNest Build Tasks

## Phase 1 — Root Config
- [x] `.env.example`
- [x] `docker-compose.yml`
- [x] `docker-compose.prod.yml`
- [x] `README.md`

## Phase 2 — DB Migrations
- [x] `api/migrations/000001_init_schema.up.sql`
- [x] `api/migrations/000001_init_schema.down.sql`
- [x] `api/migrations/000002_seed_plans.up.sql`
- [x] `api/migrations/000002_seed_plans.down.sql`

## Phase 3 — Go API Backend
- [x] `api/go.mod`
- [x] `api/Dockerfile`
- [x] `api/.air.toml`
- [x] `api/sqlc.yaml`
- [x] `api/queries/geo.sql`
- [x] `api/internal/config/config.go`
- [x] `api/internal/models/models.go`
- [x] `api/internal/models/responses.go`
- [x] `api/internal/repository/queries.go`
- [x] `api/internal/cache/redis.go`
- [x] `api/internal/search/typesense.go`
- [x] `api/internal/middleware/auth.go`
- [x] `api/internal/middleware/ratelimit.go`
- [x] `api/internal/middleware/security.go`
- [x] `api/internal/middleware/jwt.go`
- [x] `api/internal/handlers/errors.go`
- [x] `api/internal/handlers/auth.go`
- [x] `api/internal/handlers/geo.go`
- [x] `api/internal/handlers/search.go`
- [x] `api/internal/handlers/keys.go`
- [x] `api/internal/handlers/usage.go`
- [x] `api/internal/handlers/billing.go`
- [x] `api/internal/services/key_service.go`
- [x] `api/cmd/server/main.go`

## Phase 4 — Seeds
- [x] `api/seeds/main.go`
- [x] `api/seeds/bd.go`
- [x] `api/seeds/lk.go`
- [x] `api/seeds/np.go`
- [x] `api/seeds/in.go`
- [x] `api/seeds/us.go`
- [x] `api/seeds/jp.go`

## Phase 5 — Next.js Frontend
- [x] `web/` — bootstrapped (manual file creation)
- [x] `web/package.json`, `web/next.config.js`, `web/tsconfig.json`
- [x] `web/tailwind.config.js`, `web/postcss.config.js`
- [x] `web/lib/api.ts`
- [x] `web/lib/auth.ts`
- [x] `web/app/layout.tsx` + `web/app/globals.css`
- [x] `web/app/page.tsx` → LandingPage component
- [x] `web/components/landing/LandingPage.tsx`
- [x] `web/app/(auth)/login/page.tsx`
- [x] `web/app/(auth)/register/page.tsx`
- [x] `web/app/(dashboard)/layout.tsx`
- [x] `web/app/(dashboard)/overview/page.tsx`
- [x] `web/app/(dashboard)/keys/page.tsx`
- [x] `web/app/(dashboard)/usage/page.tsx`
- [x] `web/app/(dashboard)/billing/page.tsx`
- [x] `web/app/docs/` — layout, page, authentication, rate-limits, errors, countries
- [x] `web/app/docs/endpoints/` — geo, search, usage, keys, billing
- [x] `web/Dockerfile`

## Remaining
- [x] Install npm dependencies (`npm install` in web/)
- [x] Add go.sum by running `go mod tidy` in api/
- [x] Place geo data files in `api/seeds/data/<cc>/`
- [x] Copy `.env.example` to `.env` and fill secrets
- [x] Run `docker-compose up` for local dev

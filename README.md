# GeoNest

> **Geo API for South Asia, USA & Japan** — administrative hierarchy data for 6 countries. API key in 30 seconds. 133,000+ areas. Free tier available.

## What is GeoNest?

GeoNest is a commercial REST API that serves geographic/administrative hierarchy data — divisions, districts, cities, ZIP codes, wards — for developers. Think "Stripe for geo data".

**Phase 1 countries:** Bangladesh, Sri Lanka, Nepal, India, USA, Japan

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your Stripe + Resend keys

# 2. Start all services
docker-compose up -d

# 3. Run migrations
docker-compose exec api ./migrate -path migrations -database "$DATABASE_URL" up

# 4. Seed geographic data
# Place data files in api/seeds/data/ (see Seeds section below)
docker-compose exec api ./seed

# 5. Test the API
curl http://localhost:8000/health
curl http://localhost:8000/v1/geo/countries
```

## Architecture

```
┌─────────────┐    ┌───────────┐    ┌──────────────┐
│  Next.js 15 │───▶│  Go+Fiber │───▶│  PostgreSQL  │
│  (port 3000)│    │ (port 8000)│   │  (port 5432) │
└─────────────┘    └───────────┘    └──────────────┘
                         │               ┌──────────┐
                         ├──────────────▶│  Redis 7 │
                         │               │(port 6379)│
                         │               └──────────┘
                         │               ┌──────────────┐
                         └──────────────▶│  Typesense   │
                                         │  (port 8108) │
                                         └──────────────┘
```

## Tech Stack

| Layer | Tool |
|-------|------|
| API | Go 1.22 + Fiber v3 |
| Database | PostgreSQL 16 |
| Cache + Rate Limit | Redis 7 |
| Search | Typesense 27 |
| Frontend | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Payments | Stripe |
| Email | Resend |
| Containers | Docker + Compose |
| DB Migrations | golang-migrate v4 |
| DB Queries | sqlc |

## Seeds — Data Files Required

Place these files before running `./seed`:

| Country | Files | Source |
|---------|-------|--------|
| Bangladesh | `seeds/data/bd/divisions.json`, `districts.json`, `upazilas.json`, `unions.json` | [bd-apis](https://github.com/SudipMHX/bd-apis) |
| Sri Lanka | `seeds/data/lk/provinces.csv`, `districts.csv`, `ds_divisions.csv` | statistics.gov.lk |
| Nepal | `seeds/data/np/provinces.json`, `districts.json`, `municipalities.json` | opennepal.net |
| India | `seeds/data/in/states.csv`, `districts.csv`, `subdistricts.csv` | lgdirectory.gov.in |
| USA | `seeds/data/us/states.csv`, `counties.csv`, `cities.csv`, `zipcodes.csv` | census.gov TIGER |
| Japan | `seeds/data/jp/prefectures.csv`, `municipalities.csv`, `wards.csv` | stat.go.jp (convert Shift-JIS → UTF-8 first) |

## API Endpoints

### Public
- `GET /health` — health check
- `GET /v1/geo/countries` — list all supported countries
- `POST /v1/auth/register` — create account
- `POST /v1/auth/login` — get JWT tokens
- `POST /v1/auth/refresh` — refresh access token

### API Key Protected (X-API-Key header)
- `GET /v1/geo/:cc` — country info
- `GET /v1/geo/:cc/l1` — level 1 areas (divisions/states/provinces)
- `GET /v1/geo/:cc/l2` — level 2 areas
- `GET /v1/geo/:cc/l3` — level 3 areas
- `GET /v1/geo/:cc/l4` — level 4 areas
- `GET /v1/geo/:cc/l:n/:id/children` — children of an area
- `GET /v1/geo/:cc/l:n/:id/ancestors` — ancestors of an area
- `GET /v1/search?q=&cc=&level=` — full-text search
- `GET /v1/search/autocomplete?q=` — autocomplete
- `GET /v1/usage` — current usage stats
- `GET /v1/usage/history` — usage history

### JWT Protected (Dashboard)
- `GET /v1/keys` — list API keys
- `POST /v1/keys` — create API key
- `POST /v1/keys/:id/rotate` — rotate key
- `DELETE /v1/keys/:id` — revoke key
- `GET /v1/billing/plans` — list plans
- `POST /v1/billing/subscribe` — start Stripe checkout
- `GET /v1/billing/portal` — Stripe customer portal

## Plans

| Plan | Price | Daily Requests | Per-Min |
|------|-------|---------------|---------|
| Free | $0 | 500 | 10 |
| Starter | $9/mo | 50,000 | 100 |
| Pro | $29/mo | 500,000 | 600 |
| Enterprise | Custom | Unlimited | Unlimited |

## Development

```bash
# Run API locally (with hot reload via air)
cd api && air

# Run frontend locally
cd web && npm run dev

# Run sqlc code generation (after changing queries/geo.sql)
cd api && sqlc generate

# Run migrations
migrate -path api/migrations -database "$DATABASE_URL" up
```

## Security

- API keys: SHA-256 hashed, never stored raw
- Passwords: bcrypt
- JWT: RS256 or HS256, 15min access / 30d refresh
- Rate limiting: per-minute sliding window + daily quota in Redis
- Security headers: CSP, HSTS, X-Frame-Options, etc.

## License

Proprietary — All Rights Reserved

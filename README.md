# GeoNest

**Commercial-grade REST API for administrative & geographic hierarchy data.**

GeoNest provides high-performance access to geographic data (divisions, districts, cities, ZIP codes, wards) for 6 major countries. Built for developers who need clean, structured, and reliable geo-data via a "Stripe-like" integration experience.

---

## 🌍 Supported Countries (Phase 1)

*   **Bangladesh (BD)** — 4 levels (Division, District, Upazila, Union)
*   **Sri Lanka (LK)** — 4 levels (Province, District, DS Division, GN Division)
*   **Nepal (NP)** — 4 levels (Province, District, Municipality, Ward)
*   **India (IN)** — 3 levels (State, District, Sub-District)
*   **USA (US)** — 4 levels (State, County, City, ZIP Code)
*   **Japan (JP)** — 3 levels (Prefecture, Municipality, Ward)

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **API Server** | [Go 1.22+](https://go.dev/) + [Fiber v3](https://docs.gofiber.io/) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) |
| **Cache & RL** | [Redis 7](https://redis.io/) (Sliding window rate limiting) |
| **Search** | [Typesense 27](https://typesense.org/) (Typo-tolerant search) |
| **Frontend** | [Next.js 15](https://nextjs.org/) (App Router, TypeScript) |
| **UI Components**| [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Payments** | [Stripe](https://stripe.com/) (Checkout & Customer Portal) |
| **Email** | [Resend](https://resend.com/) (Transactional) |
| **Infrastructure**| [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/) |
| **Tooling** | [sqlc](https://sqlc.dev/), [golang-migrate](https://github.com/golang-migrate/migrate) |

---

## 🚀 Getting Started

### Prerequisites

*   [Docker](https://www.docker.com/products/docker-desktop/) & [Docker Compose](https://docs.docker.com/compose/install/)
*   [Go 1.22+](https://go.dev/doc/install) (for local development)
*   [Node.js 20+](https://nodejs.org/) (for local development)
*   Stripe Account (for billing features)
*   Resend API Key (for email features)

### 1. Environment Configuration

Clone the repository and create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and fill in the following critical variables:
*   `DATABASE_URL`: Connection string for PostgreSQL.
*   `REDIS_URL`: Connection string for Redis.
*   `TYPESENSE_API_KEY`: Your Typesense master key.
*   `JWT_SECRET`: A 64-character random string for signing tokens.
*   `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: From your Stripe Dashboard.
*   `RESEND_API_KEY`: From your Resend Dashboard.

### 2. Start Services via Docker

The easiest way to get started is using Docker Compose:

```bash
docker-compose up -d
```

This will spin up:
*   **PostgreSQL**: Port 5432
*   **Redis**: Port 6379
*   **Typesense**: Port 8108
*   **API (Fiber)**: Port 8000
*   **Web (Next.js)**: Port 3000

### 3. Database Migrations

Run the SQL migrations to set up the schema and seed initial plans:

```bash
# Using golang-migrate (if installed locally)
migrate -path api/migrations -database "$DATABASE_URL" up

# OR via the API container
docker-compose exec api ./migrate -path migrations -database "$DATABASE_URL" up
```

### 4. Seed Geographic Data

GeoNest requires source data files to be present in `api/seeds/data/`. See the [Data Sources](#data-sources) section for links.

Once the data is in place, run the seed script:

```bash
docker-compose exec api go run seeds/main.go
```

This script will:
1.  Insert geographic hierarchies for all 6 countries.
2.  Sync all data to **Typesense** for high-speed searching.

---

## 📂 Project Structure

```text
geonest/
├── api/                # Go Backend (Fiber v3)
│   ├── cmd/server/     # Entry point
│   ├── internal/       # Business logic, handlers, services
│   ├── migrations/     # SQL migration files
│   ├── queries/        # sqlc input queries
│   ├── seeds/          # Data seeding scripts & source JSON/CSV
│   └── sqlc.yaml       # sqlc configuration
├── web/                # Next.js Frontend (App Router)
│   ├── app/            # Pages & Layouts
│   ├── components/     # UI components (shadcn/ui)
│   └── lib/            # API clients & utilities
├── docker-compose.yml  # Development stack
└── docker-compose.prod.yml # Production stack
```

---

## 📡 API Documentation

### Public Endpoints
*   `GET /health` — System status.
*   `GET /v1/geo/countries` — Supported countries & level metadata.
*   `POST /v1/auth/register` — Create a new developer account.
*   `POST /v1/auth/login` — Authenticate and receive JWT.

### Core Data (Requires `X-API-Key`)
*   `GET /v1/geo/:cc/l1` — Get Level 1 (States/Divisions).
*   `GET /v1/geo/:cc/l1/:id/children` — Get children of a specific area.
*   `GET /v1/search?q=query` — Typo-tolerant search across all areas.

### Management (Requires JWT)
*   `GET /v1/keys` — Manage your API keys.
*   `POST /v1/billing/subscribe` — Start Stripe Checkout for Starter/Pro plans.

---

## 📈 Development Workflow

### API Development (Hot Reload)
```bash
cd api
air # Uses 'air' for live reloading
```

### Frontend Development
```bash
cd web
npm run dev
```

### Database Changes
1.  Add a new `.sql` file in `api/migrations/`.
2.  Update `api/queries/geo.sql`.
3.  Run `sqlc generate` inside the `api/` directory.

---

## 🔐 Security Standards

*   **API Keys**: SHA-256 hashed storage. Never exposed after creation.
*   **Rate Limiting**: Sliding window (per-minute) and daily quota enforced via Redis.
*   **Security Headers**: Strict CSP, HSTS, X-Frame-Options, and X-Content-Type-Options.
*   **Infrastructure**: Isolated Docker network; PostgreSQL/Redis not exposed to the public internet.

---

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

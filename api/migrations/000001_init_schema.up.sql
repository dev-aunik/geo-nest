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

// Package seeds populates the geo_areas table from JSON/CSV data files.
// Place data files in seeds/data/<cc>/ before running.
// Seeds are idempotent — safe to run multiple times.
package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/geonest-api/internal/search"
	"github.com/yourusername/geonest-api/internal/repository"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}
	typesenseURL := getEnvOrDefault("TYPESENSE_URL", "http://localhost:8108")
	typesenseKey := getEnvOrDefault("TYPESENSE_API_KEY", "dev_typesense_key")

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("cannot connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("database ping failed: %v", err)
	}
	log.Println("✓ Database connected")

	db := repository.New(pool)

	// ─── Seed all countries ──────────────────────────────────────────────────
	seedFuncs := []struct {
		name string
		fn   func(context.Context, *pgxpool.Pool) error
	}{
		{"Bangladesh", SeedBangladesh},
		{"Sri Lanka", SeedSriLanka},
		{"Nepal", SeedNepal},
		{"India", SeedIndia},
		{"USA", SeedUSA},
		{"Japan", SeedJapan},
	}

	for _, s := range seedFuncs {
		log.Printf("Seeding %s...", s.name)
		if err := s.fn(ctx, pool); err != nil {
			log.Fatalf("seed %s: %v", s.name, err)
		}
		log.Printf("✓ %s seeded", s.name)
	}

	// ─── Sync to Typesense ───────────────────────────────────────────────────
	log.Println("Syncing to Typesense...")
	sc := search.New(typesenseURL, typesenseKey)
	if err := search.SyncAllToTypesense(ctx, db, sc); err != nil {
		log.Printf("Warning: Typesense sync failed: %v", err)
	} else {
		log.Println("✓ Typesense synced")
	}

	log.Println("All seeds complete.")
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

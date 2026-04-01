package main

// USA geographic seed.
//
// Data source: U.S. Census Bureau TIGER Gazetteer Files
//   https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
//
// Required files in seeds/data/us/:
//   - states.csv    → GEOID,STUSAB,NAME,...
//   - counties.csv  → GEOID,NAME,STATEFP,...
//   - cities.csv    → GEOID,NAME,STATEFP,...
//   - zipcodes.csv  → GEOID,NAME,POO,...  (optional for Phase 1)
//
// Hierarchy: State (L1) → County (L2) → City (L3) → ZIP Code (L4)
// Total: 51 states/DC, 3143 counties, ~35K cities, ~42K ZIP codes

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedUSA seeds the United States geographic hierarchy.
func SeedUSA(ctx context.Context, pool *pgxpool.Pool) error {
	dataDir := "seeds/data/us"

	states, err := loadCSV(dataDir + "/states.csv")
	if err != nil {
		return fmt.Errorf("load states: %w", err)
	}
	counties, err := loadCSV(dataDir + "/counties.csv")
	if err != nil {
		return fmt.Errorf("load counties: %w", err)
	}
	cities, err := loadCSV(dataDir + "/cities.csv")
	if err != nil {
		log.Printf("Warning: cities.csv not found: %v", err)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// L1 — States
	// Expected columns: GEOID, STUSAB (2-letter code), NAME
	stateIDs := map[string]int64{} // keyed by GEOID (FIPS)
	stateByAbbr := map[string]int64{}
	for _, row := range states {
		if len(row) < 3 {
			continue
		}
		fips := strings.TrimSpace(row[0])
		abbr := strings.TrimSpace(row[1])
		name := strings.TrimSpace(row[2])
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, name_en, level_label, code, metadata)
			VALUES ('us', 1, $1, 'state', $2, $3)
			ON CONFLICT DO NOTHING RETURNING id`,
			name, abbr, fmt.Sprintf(`{"fips":"%s","abbr":"%s"}`, fips, abbr),
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='us' AND level=1 AND code=$1`, abbr,
			).Scan(&id)
		}
		stateIDs[fips] = id
		stateByAbbr[abbr] = id
	}

	// L2 — Counties
	// Expected columns: GEOID, NAME, STATEFP
	countyIDs := map[string]int64{} // keyed by GEOID
	for _, row := range counties {
		if len(row) < 3 {
			continue
		}
		fips := strings.TrimSpace(row[0])
		name := strings.TrimSpace(row[1])
		stateFIPS := strings.TrimSpace(row[2])
		parentID := stateIDs[stateFIPS]
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
			VALUES ('us', 2, $1, $2, 'county', $3)
			ON CONFLICT DO NOTHING RETURNING id`, parentID, name, fips,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='us' AND level=2 AND code=$1`, fips,
			).Scan(&id)
		}
		countyIDs[fips] = id
	}

	// L3 — Cities (batched)
	// Expected columns: GEOID, NAME, STATEFP or COUNTYFP
	if len(cities) > 0 {
		batch := &pgx.Batch{}
		for _, row := range cities {
			if len(row) < 3 {
				continue
			}
			fips := strings.TrimSpace(row[0])
			name := strings.TrimSpace(row[1])
			stateFIPS := strings.TrimSpace(row[2])
			parentID := stateIDs[stateFIPS]
			if parentID == 0 {
				continue
			}
			batch.Queue(`
				INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
				VALUES ('us', 3, $1, $2, 'city', $3)
				ON CONFLICT DO NOTHING`, parentID, name, fips)
			if batch.Len() >= 500 {
				if err := sendBatch(ctx, tx, batch); err != nil {
					return fmt.Errorf("cities batch: %w", err)
				}
				batch = &pgx.Batch{}
			}
		}
		if batch.Len() > 0 {
			if err := sendBatch(ctx, tx, batch); err != nil {
				return fmt.Errorf("cities final batch: %w", err)
			}
		}
	}

	return tx.Commit(ctx)
}

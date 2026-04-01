package main

// India geographic seed.
//
// Data source: lgdirectory.gov.in
// Required files in seeds/data/in/:
//   - states.csv      → id,name
//   - districts.csv   → id,name,state_id
//   - subdistricts.csv → id,name,district_id
//
// Note: India L4 (villages, ~600K rows) is deferred per Phase 1 spec.
//       Only L1 (states/UTs), L2 (districts), L3 (sub-districts) are seeded.
// Total: 36 states/UTs, 766 districts, ~6000 sub-districts

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedIndia seeds India geographic hierarchy (L1–L3 only).
func SeedIndia(ctx context.Context, pool *pgxpool.Pool) error {
	dataDir := "seeds/data/in"

	states, err := loadCSV(dataDir + "/states.csv")
	if err != nil {
		return fmt.Errorf("load states: %w", err)
	}
	districts, err := loadCSV(dataDir + "/districts.csv")
	if err != nil {
		return fmt.Errorf("load districts: %w", err)
	}
	subdistricts, err := loadCSV(dataDir + "/subdistricts.csv")
	if err != nil {
		log.Printf("Warning: subdistricts.csv not found: %v", err)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// L1 — States / Union Territories
	stateIDs := map[string]int64{}
	for _, row := range states {
		if len(row) < 2 {
			continue
		}
		code := strings.TrimSpace(row[0])
		name := strings.TrimSpace(row[1])
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, name_en, level_label, code)
			VALUES ('in', 1, $1, 'state', $2)
			ON CONFLICT DO NOTHING RETURNING id`, name, code,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='in' AND level=1 AND code=$1`, code,
			).Scan(&id)
		}
		stateIDs[code] = id
	}

	// L2 — Districts
	districtIDs := map[string]int64{}
	for _, row := range districts {
		if len(row) < 3 {
			continue
		}
		code := strings.TrimSpace(row[0])
		name := strings.TrimSpace(row[1])
		stateCode := strings.TrimSpace(row[2])
		parentID := stateIDs[stateCode]
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
			VALUES ('in', 2, $1, $2, 'district', $3)
			ON CONFLICT DO NOTHING RETURNING id`, parentID, name, code,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='in' AND level=2 AND code=$1`, code,
			).Scan(&id)
		}
		districtIDs[code] = id
	}

	// L3 — Sub-districts (batched)
	if len(subdistricts) > 0 {
		batch := &pgx.Batch{}
		for _, row := range subdistricts {
			if len(row) < 3 {
				continue
			}
			code := strings.TrimSpace(row[0])
			name := strings.TrimSpace(row[1])
			districtCode := strings.TrimSpace(row[2])
			parentID := districtIDs[districtCode]
			if parentID == 0 {
				continue
			}
			batch.Queue(`
				INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
				VALUES ('in', 3, $1, $2, 'sub_district', $3)
				ON CONFLICT DO NOTHING`, parentID, name, code)
			if batch.Len() >= 500 {
				if err := sendBatch(ctx, tx, batch); err != nil {
					return fmt.Errorf("subdistrict batch: %w", err)
				}
				batch = &pgx.Batch{}
			}
		}
		if batch.Len() > 0 {
			if err := sendBatch(ctx, tx, batch); err != nil {
				return fmt.Errorf("subdistrict final batch: %w", err)
			}
		}
	}

	return tx.Commit(ctx)
}

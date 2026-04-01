package main

// Japan geographic seed.
//
// Data source: stat.go.jp Statistics Bureau
//   https://www.stat.go.jp/data/chiri/map/c_katsudo/h27/index.html
//
// IMPORTANT: Source files are Shift-JIS encoded. Convert to UTF-8 first:
//   iconv -f SHIFT_JIS -t UTF-8 input.csv > output.csv
//
// Required files in seeds/data/jp/ (UTF-8 encoded):
//   - prefectures.csv    → code,name
//   - municipalities.csv → code,name,prefecture_code
//   - wards.csv         → code,name,municipality_code (optional)
//
// Hierarchy: Prefecture (L1) → Municipality (L2) → Ward (L3)
// Total: 47 prefectures, 1741 municipalities, ~19K wards

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedJapan seeds the Japan geographic hierarchy.
func SeedJapan(ctx context.Context, pool *pgxpool.Pool) error {
	dataDir := "seeds/data/jp"

	prefectures, err := loadCSV(dataDir + "/prefectures.csv")
	if err != nil {
		return fmt.Errorf("load prefectures: %w", err)
	}
	municipalities, err := loadCSV(dataDir + "/municipalities.csv")
	if err != nil {
		return fmt.Errorf("load municipalities: %w", err)
	}
	wards, err := loadCSV(dataDir + "/wards.csv")
	if err != nil {
		log.Printf("Warning: wards.csv not found: %v", err)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// L1 — Prefectures (columns: code, name_en)
	prefectureIDs := map[string]int64{}
	for _, row := range prefectures {
		if len(row) < 2 {
			continue
		}
		code := strings.TrimSpace(row[0])
		name := strings.TrimSpace(row[1])
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, name_en, level_label, code)
			VALUES ('jp', 1, $1, 'prefecture', $2)
			ON CONFLICT DO NOTHING RETURNING id`, name, code,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='jp' AND level=1 AND code=$1`, code,
			).Scan(&id)
		}
		prefectureIDs[code] = id
	}

	// L2 — Municipalities (columns: code, name_en, prefecture_code)
	municipalityIDs := map[string]int64{}
	for _, row := range municipalities {
		if len(row) < 3 {
			continue
		}
		code := strings.TrimSpace(row[0])
		name := strings.TrimSpace(row[1])
		prefCode := strings.TrimSpace(row[2])
		parentID := prefectureIDs[prefCode]
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
			VALUES ('jp', 2, $1, $2, 'municipality', $3)
			ON CONFLICT DO NOTHING RETURNING id`, parentID, name, code,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='jp' AND level=2 AND code=$1`, code,
			).Scan(&id)
		}
		municipalityIDs[code] = id
	}

	// L3 — Wards (batched)
	if len(wards) > 0 {
		batch := &pgx.Batch{}
		for _, row := range wards {
			if len(row) < 3 {
				continue
			}
			code := strings.TrimSpace(row[0])
			name := strings.TrimSpace(row[1])
			munCode := strings.TrimSpace(row[2])
			parentID := municipalityIDs[munCode]
			if parentID == 0 {
				continue
			}
			batch.Queue(`
				INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
				VALUES ('jp', 3, $1, $2, 'ward', $3)
				ON CONFLICT DO NOTHING`, parentID, name, code)
			if batch.Len() >= 500 {
				if err := sendBatch(ctx, tx, batch); err != nil {
					return fmt.Errorf("wards batch: %w", err)
				}
				batch = &pgx.Batch{}
			}
		}
		if batch.Len() > 0 {
			if err := sendBatch(ctx, tx, batch); err != nil {
				return fmt.Errorf("wards final batch: %w", err)
			}
		}
	}

	return tx.Commit(ctx)
}

package main

// Sri Lanka geographic seed.
//
// Data source: statistics.gov.lk
// Required files in seeds/data/lk/:
//   - provinces.csv   → id,name
//   - districts.csv   → id,name,province_id
//   - ds_divisions.csv → id,name,district_id
//
// Hierarchy: Province (L1) → District (L2) → DS Division (L3) → GN Division (L4)
// Total: 9 provinces, 25 districts, 331 DS divisions

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedSriLanka seeds Sri Lanka geographic hierarchy.
func SeedSriLanka(ctx context.Context, pool *pgxpool.Pool) error {
	dataDir := "seeds/data/lk"

	provinces, err := loadCSV(dataDir + "/provinces.csv")
	if err != nil {
		return fmt.Errorf("load provinces: %w", err)
	}
	districts, err := loadCSV(dataDir + "/districts.csv")
	if err != nil {
		return fmt.Errorf("load districts: %w", err)
	}
	dsDivisions, err := loadCSV(dataDir + "/ds_divisions.csv")
	if err != nil {
		log.Printf("Warning: ds_divisions.csv not found: %v", err)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// L1 — Provinces (columns: id, name)
	provinceIDs := map[string]int64{}
	for _, row := range provinces {
		if len(row) < 2 {
			continue
		}
		id, code := int64(0), row[0]
		name := strings.TrimSpace(row[1])
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, name_en, level_label, code)
			VALUES ('lk', 1, $1, 'province', $2)
			ON CONFLICT DO NOTHING RETURNING id`, name, code,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='lk' AND level=1 AND code=$1`, code,
			).Scan(&id)
		}
		provinceIDs[code] = id
	}

	// L2 — Districts (columns: id, name, province_id)
	districtIDs := map[string]int64{}
	for _, row := range districts {
		if len(row) < 3 {
			continue
		}
		code := row[0]
		name := strings.TrimSpace(row[1])
		provinceCode := row[2]
		parentID := provinceIDs[provinceCode]
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
			VALUES ('lk', 2, $1, $2, 'district', $3)
			ON CONFLICT DO NOTHING RETURNING id`, parentID, name, code,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='lk' AND level=2 AND code=$1`, code,
			).Scan(&id)
		}
		districtIDs[code] = id
	}

	// L3 — DS Divisions (columns: id, name, district_id)
	if len(dsDivisions) > 0 {
		batch := &pgx.Batch{}
		for _, row := range dsDivisions {
			if len(row) < 3 {
				continue
			}
			code := row[0]
			name := strings.TrimSpace(row[1])
			districtCode := row[2]
			parentID := districtIDs[districtCode]
			if parentID == 0 {
				continue
			}
			batch.Queue(`
				INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
				VALUES ('lk', 3, $1, $2, 'ds_division', $3)
				ON CONFLICT DO NOTHING`, parentID, name, code)
		}
		if err := sendBatch(ctx, tx, batch); err != nil {
			return fmt.Errorf("ds_divisions batch: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// loadCSV reads a CSV file and returns all rows (skipping header).
func loadCSV(path string) ([][]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.TrimLeadingSpace = true

	var rows [][]string
	header := true
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if header {
			header = false
			continue
		}
		rows = append(rows, record)
	}
	return rows, nil
}

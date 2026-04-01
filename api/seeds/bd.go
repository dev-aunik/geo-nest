package main

// Bangladesh geographic seed.
//
// Data source: https://github.com/SudipMHX/bd-apis/tree/main/src/database
// Required files in seeds/data/bd/:
//   - divisions.json   → [{id, name, bn_name}]
//   - districts.json   → [{id, name, bn_name, division_id}]
//   - upazilas.json    → [{id, name, bn_name, district_id}]
//   - unions.json      → [{id, name, bn_name, upazila_id}]
//
// Hierarchy: Division (L1) → District (L2) → Upazila (L3) → Union (L4)
// Total: 8 divisions, 64 districts, 495 upazilas, 4550+ unions

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type bdDivision struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	BnName string `json:"bn_name"`
}

type bdDistrict struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	BnName     string `json:"bn_name"`
	DivisionID string `json:"division_id"`
}

type bdUpazila struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	BnName     string `json:"bn_name"`
	DistrictID string `json:"district_id"`
}

type bdUnion struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	BnName    string `json:"bn_name"`
	UpazilaID string `json:"upazila_id"`
}

// SeedBangladesh seeds the Bangladesh geographic hierarchy.
func SeedBangladesh(ctx context.Context, pool *pgxpool.Pool) error {
	dataDir := "seeds/data/bd"

	divisions, err := loadJSON[bdDivision](dataDir + "/divisions.json")
	if err != nil {
		return fmt.Errorf("load divisions: %w", err)
	}
	districts, err := loadJSON[bdDistrict](dataDir + "/districts.json")
	if err != nil {
		return fmt.Errorf("load districts: %w", err)
	}
	upazilas, err := loadJSON[bdUpazila](dataDir + "/upazilas.json")
	if err != nil {
		return fmt.Errorf("load upazilas: %w", err)
	}
	unions, err := loadJSON[bdUnion](dataDir + "/unions.json")
	if err != nil {
		log.Printf("Warning: unions.json not found, skipping L4: %v", err)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// L1 — Divisions
	divisionIDs := map[string]int64{}
	for _, div := range divisions {
		var id int64
		err := tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, name_en, level_label, code, metadata)
			VALUES ('bd', 1, $1, 'division', $2, $3)
			ON CONFLICT DO NOTHING
			RETURNING id`,
			div.Name, div.ID,
			fmt.Sprintf(`{"bn_name":"%s"}`, div.BnName),
		).Scan(&id)
		if err != nil {
			// ON CONFLICT — fetch existing id
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='bd' AND level=1 AND code=$1`, div.ID,
			).Scan(&id)
		}
		divisionIDs[div.ID] = id
	}

	// L2 — Districts
	districtIDs := map[string]int64{}
	for _, d := range districts {
		parentID := divisionIDs[d.DivisionID]
		var id int64
		err := tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code, metadata)
			VALUES ('bd', 2, $1, $2, 'district', $3, $4)
			ON CONFLICT DO NOTHING
			RETURNING id`,
			parentID, d.Name, d.ID,
			fmt.Sprintf(`{"bn_name":"%s"}`, d.BnName),
		).Scan(&id)
		if err != nil {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='bd' AND level=2 AND code=$1`, d.ID,
			).Scan(&id)
		}
		districtIDs[d.ID] = id
	}

	// L3 — Upazilas (batched inserts)
	upazilaIDs := map[string]int64{}
	batch := &pgx.Batch{}
	for _, u := range upazilas {
		parentID := districtIDs[u.DistrictID]
		batch.Queue(`
			INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code, metadata)
			VALUES ('bd', 3, $1, $2, 'upazila', $3, $4)
			ON CONFLICT DO NOTHING`,
			parentID, u.Name, u.ID,
			fmt.Sprintf(`{"bn_name":"%s"}`, u.BnName),
		)
	}
	if err := sendBatch(ctx, tx, batch); err != nil {
		return fmt.Errorf("upazila batch: %w", err)
	}
	// Fetch IDs for unions
	rows, _ := tx.Query(ctx, `SELECT id, code FROM geo_areas WHERE country_code='bd' AND level=3`)
	for rows.Next() {
		var id int64
		var code string
		rows.Scan(&id, &code)
		upazilaIDs[code] = id
	}
	rows.Close()

	// L4 — Unions (batched)
	if len(unions) > 0 {
		batch = &pgx.Batch{}
		for _, u := range unions {
			parentID := upazilaIDs[u.UpazilaID]
			if parentID == 0 {
				continue
			}
			batch.Queue(`
				INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code, metadata)
				VALUES ('bd', 4, $1, $2, 'union', $3, $4)
				ON CONFLICT DO NOTHING`,
				parentID, u.Name, u.ID,
				fmt.Sprintf(`{"bn_name":"%s"}`, u.BnName),
			)
			if batch.Len() >= 500 {
				if err := sendBatch(ctx, tx, batch); err != nil {
					return fmt.Errorf("union batch: %w", err)
				}
				batch = &pgx.Batch{}
			}
		}
		if batch.Len() > 0 {
			if err := sendBatch(ctx, tx, batch); err != nil {
				return fmt.Errorf("union final batch: %w", err)
			}
		}
	}

	return tx.Commit(ctx)
}

// ──────────── Generic helpers ────────────

func loadJSON[T any](path string) ([]T, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var items []T
	return items, json.NewDecoder(f).Decode(&items)
}

func sendBatch(ctx context.Context, tx pgx.Tx, batch *pgx.Batch) error {
	if batch.Len() == 0 {
		return nil
	}
	br := tx.SendBatch(ctx, batch)
	for i := 0; i < batch.Len(); i++ {
		if _, err := br.Exec(); err != nil {
			br.Close()
			return err
		}
	}
	return br.Close()
}

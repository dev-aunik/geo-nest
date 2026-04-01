package main

// Nepal geographic seed.
//
// Data source: opennepal.net + cbs.gov.np
// Required files in seeds/data/np/:
//   - provinces.json      → [{id, name}]
//   - districts.json      → [{id, name, province_id}]
//   - municipalities.json → [{id, name, district_id, type}]
//
// Hierarchy: Province (L1) → District (L2) → Municipality (L3) → Ward (L4)
// Total: 7 provinces, 77 districts, 753 municipalities

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type npProvince struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type npDistrict struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	ProvinceID string `json:"province_id"`
}

type npMunicipality struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	DistrictID string `json:"district_id"`
	Type       string `json:"type"` // metropolitan, sub-metropolitan, municipal, rural
}

// SeedNepal seeds Nepal geographic hierarchy.
func SeedNepal(ctx context.Context, pool *pgxpool.Pool) error {
	dataDir := "seeds/data/np"

	provinces, err := loadJSON[npProvince](dataDir + "/provinces.json")
	if err != nil {
		return fmt.Errorf("load provinces: %w", err)
	}
	districts, err := loadJSON[npDistrict](dataDir + "/districts.json")
	if err != nil {
		return fmt.Errorf("load districts: %w", err)
	}
	municipalities, err := loadJSON[npMunicipality](dataDir + "/municipalities.json")
	if err != nil {
		log.Printf("Warning: municipalities.json not found: %v", err)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// L1 — Provinces
	provinceIDs := map[string]int64{}
	for _, p := range provinces {
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, name_en, level_label, code)
			VALUES ('np', 1, $1, 'province', $2)
			ON CONFLICT DO NOTHING RETURNING id`, p.Name, p.ID,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='np' AND level=1 AND code=$1`, p.ID,
			).Scan(&id)
		}
		provinceIDs[p.ID] = id
	}

	// L2 — Districts
	districtIDs := map[string]int64{}
	for _, d := range districts {
		parentID := provinceIDs[d.ProvinceID]
		var id int64
		tx.QueryRow(ctx, `
			INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code)
			VALUES ('np', 2, $1, $2, 'district', $3)
			ON CONFLICT DO NOTHING RETURNING id`, parentID, d.Name, d.ID,
		).Scan(&id)
		if id == 0 {
			tx.QueryRow(ctx,
				`SELECT id FROM geo_areas WHERE country_code='np' AND level=2 AND code=$1`, d.ID,
			).Scan(&id)
		}
		districtIDs[d.ID] = id
	}

	// L3 — Municipalities
	if len(municipalities) > 0 {
		batch := &pgx.Batch{}
		for _, m := range municipalities {
			parentID := districtIDs[m.DistrictID]
			if parentID == 0 {
				continue
			}
			meta := fmt.Sprintf(`{"type":"%s"}`, m.Type)
			batch.Queue(`
				INSERT INTO geo_areas (country_code, level, parent_id, name_en, level_label, code, metadata)
				VALUES ('np', 3, $1, $2, 'municipality', $3, $4)
				ON CONFLICT DO NOTHING`, parentID, m.Name, m.ID, meta)
		}
		if err := sendBatch(ctx, tx, batch); err != nil {
			return fmt.Errorf("municipalities batch: %w", err)
		}
	}

	return tx.Commit(ctx)
}

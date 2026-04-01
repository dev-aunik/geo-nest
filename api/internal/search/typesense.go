package search

import (
	"context"
	"fmt"
	"strconv"

	"github.com/typesense/typesense-go/v2/typesense"
	"github.com/typesense/typesense-go/v2/typesense/api"
	"github.com/typesense/typesense-go/v2/typesense/api/pointer"
	"github.com/yourusername/geonest-api/internal/repository"
)

const collectionName = "geo_areas"

// Client wraps the Typesense client.
type Client struct {
	ts *typesense.Client
}

// New creates a Typesense search client.
func New(url, apiKey string) *Client {
	ts := typesense.NewClient(
		typesense.WithServer(url),
		typesense.WithAPIKey(apiKey),
	)
	return &Client{ts: ts}
}

// EnsureCollection creates the geo_areas collection if it doesn't exist.
func (c *Client) EnsureCollection(ctx context.Context) error {
	_, err := c.ts.Collection(collectionName).Retrieve(ctx)
	if err == nil {
		return nil // already exists
	}

	schema := &api.CollectionSchema{
		Name: collectionName,
		Fields: []api.Field{
			{Name: "id", Type: "string"},
			{Name: "country_code", Type: "string", Facet: pointer.True()},
			{Name: "level", Type: "int32", Facet: pointer.True()},
			{Name: "level_label", Type: "string", Facet: pointer.True()},
			{Name: "name_en", Type: "string"},
			{Name: "parent_name", Type: "string", Optional: pointer.True()},
			{Name: "full_path", Type: "string"},
			{Name: "code", Type: "string", Optional: pointer.True()},
		},
		DefaultSortingField: pointer.String("level"),
	}
	_, err = c.ts.Collections().Create(ctx, schema)
	return err
}

// GeoDocument is a Typesense document for a geo area.
type GeoDocument struct {
	ID          string `json:"id"`
	CountryCode string `json:"country_code"`
	Level       int32  `json:"level"`
	LevelLabel  string `json:"level_label"`
	NameEn      string `json:"name_en"`
	ParentName  string `json:"parent_name,omitempty"`
	FullPath    string `json:"full_path"`
	Code        string `json:"code,omitempty"`
}

// IndexArea indexes a single geo area.
func (c *Client) IndexArea(ctx context.Context, doc GeoDocument) error {
	_, err := c.ts.Collection(collectionName).Documents().Upsert(ctx, doc)
	return err
}

// ImportBatch imports a batch of geo documents.
func (c *Client) ImportBatch(ctx context.Context, docs []GeoDocument) error {
	if len(docs) == 0 {
		return nil
	}
	ifaces := make([]interface{}, len(docs))
	for i, d := range docs {
		ifaces[i] = d
	}
	action := "upsert"
	params := &api.ImportDocumentsParams{Action: &action}
	_, err := c.ts.Collection(collectionName).Documents().Import(ctx, ifaces, params)
	return err
}

// SearchParams contains typed parameters for a geo search.
type SearchParams struct {
	Query       string
	CountryCode string
	Level       string
	Limit       int
}

// SearchResult is a single typesense search hit.
type SearchResult struct {
	ID          string
	CountryCode string
	Level       int
	LevelLabel  string
	Name        string
	FullPath    string
	Code        string
	Highlight   string
}

// Search performs a full-text search against Typesense.
func (c *Client) Search(ctx context.Context, p SearchParams) ([]SearchResult, int, error) {
	filterBy := ""
	if p.CountryCode != "" {
		filterBy = fmt.Sprintf("country_code:=%s", p.CountryCode)
	}
	if p.Level != "" {
		if filterBy != "" {
			filterBy += " && "
		}
		filterBy += fmt.Sprintf("level:=%s", p.Level)
	}

	limit := p.Limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	params := &api.SearchCollectionParams{
		Q:               pointer.String(p.Query),
		QueryBy:         pointer.String("name_en,full_path"),
		NumTypos:        pointer.String("2"),
		PerPage:         &limit,
		HighlightFields: pointer.String("name_en"),
	}
	if filterBy != "" {
		params.FilterBy = &filterBy
	}

	res, err := c.ts.Collection(collectionName).Documents().Search(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	var results []SearchResult
	if res.Hits != nil {
		for _, hit := range *res.Hits {
			if hit.Document == nil {
				continue
			}
			doc := *hit.Document
			sr := SearchResult{}
			if v, ok := doc["id"].(string); ok {
				sr.ID = v
			}
			if v, ok := doc["country_code"].(string); ok {
				sr.CountryCode = v
			}
			if v, ok := doc["level"].(float64); ok {
				sr.Level = int(v)
			}
			if v, ok := doc["level_label"].(string); ok {
				sr.LevelLabel = v
			}
			if v, ok := doc["name_en"].(string); ok {
				sr.Name = v
			}
			if v, ok := doc["full_path"].(string); ok {
				sr.FullPath = v
			}
			if v, ok := doc["code"].(string); ok {
				sr.Code = v
			}
			// Extract highlight
			if hit.Highlights != nil {
				for _, hl := range *hit.Highlights {
					if hl.Field != nil && *hl.Field == "name_en" && hl.Snippet != nil {
						sr.Highlight = *hl.Snippet
					}
				}
			}
			results = append(results, sr)
		}
	}

	found := 0
	if res.Found != nil {
		found = *res.Found
	}

	return results, found, nil
}

// SyncAllToTypesense reads all geo_areas from DB and indexes them.
func SyncAllToTypesense(ctx context.Context, db *repository.Queries, sc *Client) error {
	if err := sc.EnsureCollection(ctx); err != nil {
		return fmt.Errorf("ensure collection: %w", err)
	}

	// Fetch all areas level by level for all countries
	countries := []string{"bd", "lk", "np", "in", "us", "jp"}
	levels := []int16{1, 2, 3, 4}

	var batch []GeoDocument
	const batchSize = 500

	// Build a name lookup for parent IDs
	nameLookup := map[int64]string{}

	for _, cc := range countries {
		for _, level := range levels {
			areas, err := db.GetAreasByLevel(ctx, repository.GetAreasByLevelParams{
				CountryCode: cc,
				Level:       level,
				ParentID:    nil,
			})
			if err != nil {
				continue
			}
			for _, a := range areas {
				nameLookup[a.ID] = a.NameEn

				parentName := ""
				if a.ParentID != nil {
					parentName = nameLookup[*a.ParentID]
				}

				fullPath := a.NameEn
				if parentName != "" {
					fullPath = parentName + " > " + a.NameEn
				}

				code := ""
				if a.Code != nil {
					code = *a.Code
				}

				doc := GeoDocument{
					ID:          strconv.FormatInt(a.ID, 10),
					CountryCode: a.CountryCode,
					Level:       int32(a.Level),
					LevelLabel:  a.LevelLabel,
					NameEn:      a.NameEn,
					ParentName:  parentName,
					FullPath:    fullPath,
					Code:        code,
				}
				batch = append(batch, doc)

				if len(batch) >= batchSize {
					if err := sc.ImportBatch(ctx, batch); err != nil {
						return fmt.Errorf("import batch: %w", err)
					}
					batch = batch[:0]
				}
			}
		}
	}

	if len(batch) > 0 {
		return sc.ImportBatch(ctx, batch)
	}
	return nil
}

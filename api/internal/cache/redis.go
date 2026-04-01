package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/yourusername/geonest-api/internal/repository"
)

const keyWithPlanTTL = 5 * time.Minute

// Client wraps a Redis client with application-specific methods.
type Client struct {
	rdb *redis.Client
}

// New creates a Redis cache client from a URL.
func New(url string) (*Client, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	rdb := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &Client{rdb: rdb}, nil
}

// RDB returns the raw Redis client (for rate limiting pipelines).
func (c *Client) RDB() *redis.Client {
	return c.rdb
}

// GetKeyWithPlan retrieves a cached api key+plan record.
func (c *Client) GetKeyWithPlan(ctx context.Context, hash string) (*repository.GetAPIKeyByHashRow, error) {
	key := "key:" + hash
	b, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err // redis.Nil on miss
	}
	var row repository.GetAPIKeyByHashRow
	if err := json.Unmarshal(b, &row); err != nil {
		return nil, err
	}
	return &row, nil
}

// SetKeyWithPlan caches an api key+plan record for 5 minutes.
func (c *Client) SetKeyWithPlan(ctx context.Context, hash string, row *repository.GetAPIKeyByHashRow) {
	key := "key:" + hash
	b, err := json.Marshal(row)
	if err != nil {
		return
	}
	c.rdb.Set(ctx, key, b, keyWithPlanTTL)
}

// InvalidateKeyCache removes a cached key record (called on revoke/rotate).
func (c *Client) InvalidateKeyCache(ctx context.Context, hash string) {
	c.rdb.Del(ctx, "key:"+hash)
}

// GetGeoAreas retrieves a cached list of geo areas.
func (c *Client) GetGeoAreas(ctx context.Context, cacheKey string) ([]byte, error) {
	return c.rdb.Get(ctx, cacheKey).Bytes()
}

// SetGeoAreas caches a serialized list of geo areas for 24 hours.
func (c *Client) SetGeoAreas(ctx context.Context, cacheKey string, data []byte) {
	c.rdb.Set(ctx, cacheKey, data, 24*time.Hour)
}

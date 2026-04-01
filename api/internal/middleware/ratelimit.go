package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
	"github.com/yourusername/geonest-api/internal/cache"
	"github.com/yourusername/geonest-api/internal/models"
	"github.com/yourusername/geonest-api/internal/repository"
)

// RateLimit implements a dual rate limit:
// - Per-minute sliding window (sorted set in Redis)
// - Per-day counter (INCR + ExpireAt midnight UTC)
func RateLimit(rdb *cache.Client, dbq *repository.Queries) fiber.Handler {
	return func(c fiber.Ctx) error {
		plan := c.Locals("plan").(*models.Plan)
		keyRow := c.Locals("api_key_row").(*repository.GetAPIKeyByHashRow)
		keyHash := c.Locals("api_key_hash").(string)
		ctx := context.Background()
		r := rdb.RDB()

		// Enterprise = unlimited
		if plan.DailyQuota == -1 {
			go dbq.UpsertUsageDaily(ctx, keyRow.ID)
			return c.Next()
		}

		now := time.Now()
		nowMs := now.UnixMilli()

		// Per-minute sliding window (sorted set)
		minKey := fmt.Sprintf("rl:%s:min", keyHash)
		pipe := r.Pipeline()
		pipe.ZRemRangeByScore(ctx, minKey, "0", fmt.Sprint(nowMs-60000))
		pipe.ZAdd(ctx, minKey, redis.Z{Score: float64(nowMs), Member: nowMs})
		pipe.ZCard(ctx, minKey)
		pipe.Expire(ctx, minKey, 61*time.Second)
		res, _ := pipe.Exec(ctx)
		minCount := res[2].(*redis.IntCmd).Val()

		// Per-day counter (INCR, expires at midnight UTC)
		dayKey := fmt.Sprintf("rl:%s:day", keyHash)
		dayCount, _ := r.Incr(ctx, dayKey).Result()
		if dayCount == 1 {
			midnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
			r.ExpireAt(ctx, dayKey, midnight)
		}

		remaining := int64(plan.DailyQuota) - dayCount
		if remaining < 0 {
			remaining = 0
		}
		resetEpoch := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC).Unix()

		c.Set("X-RateLimit-Limit", fmt.Sprint(plan.DailyQuota))
		c.Set("X-RateLimit-Remaining", fmt.Sprint(remaining))
		c.Set("X-RateLimit-Reset", fmt.Sprint(resetEpoch))

		if minCount > int64(plan.PerMinLimit) {
			retryAfter := 60 - now.Second()
			c.Set("Retry-After", fmt.Sprint(retryAfter))
			return respondError(c, 429, "RATE_LIMIT_EXCEEDED",
				fmt.Sprintf("Per-minute limit of %d requests exceeded. Retry after %ds.",
					plan.PerMinLimit, retryAfter))
		}

		if dayCount > int64(plan.DailyQuota) {
			secsLeft := int(time.Until(time.Unix(resetEpoch, 0)).Seconds())
			c.Set("Retry-After", fmt.Sprint(secsLeft))
			return respondError(c, 429, "DAILY_QUOTA_EXCEEDED",
				fmt.Sprintf("Daily quota of %d requests exceeded. Resets in %ds.",
					plan.DailyQuota, secsLeft))
		}

		// Log usage async — never block the API response
		go dbq.UpsertUsageDaily(ctx, keyRow.ID)

		return c.Next()
	}
}

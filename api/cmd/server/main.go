package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	fiberlog "github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/requestid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/geonest-api/internal/cache"
	"github.com/yourusername/geonest-api/internal/config"
	"github.com/yourusername/geonest-api/internal/handlers"
	"github.com/yourusername/geonest-api/internal/middleware"
	"github.com/yourusername/geonest-api/internal/repository"
	"github.com/yourusername/geonest-api/internal/search"
)

func main() {
	cfg := config.Load()

	// ─── Database ────────────────────────────────────────────────────────────
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("cannot connect to database: %v", err)
	}
	defer pool.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("database ping failed: %v", err)
	}
	log.Println("✓ Database connected")

	db := repository.New(pool)

	// ─── Redis ───────────────────────────────────────────────────────────────
	redisClient, err := cache.New(cfg.RedisURL)
	if err != nil {
		log.Fatalf("cannot connect to Redis: %v", err)
	}
	log.Println("✓ Redis connected")

	// ─── Typesense ───────────────────────────────────────────────────────────
	sc := search.New(cfg.TypesenseURL, cfg.TypesenseAPIKey)
	if err := sc.EnsureCollection(context.Background()); err != nil {
		log.Printf("Warning: Typesense collection setup: %v", err)
	} else {
		log.Println("✓ Typesense ready")
	}

	// ─── Handlers ────────────────────────────────────────────────────────────
	authH := handlers.NewAuthHandler(db, cfg.JWTSecret)
	geoH := handlers.NewGeoHandler(db, redisClient)
	searchH := handlers.NewSearchHandler(sc)
	keyH := handlers.NewKeyHandler(db, redisClient)
	usageH := handlers.NewUsageHandler(db)
	billingH := handlers.NewBillingHandler(db,
		cfg.StripeSecretKey, cfg.StripeWebhookSecret,
		cfg.StarterPriceID, cfg.ProPriceID, cfg.FrontendURL)

	// ─── Fiber app ───────────────────────────────────────────────────────────
	app := fiber.New(fiber.Config{
		AppName:      "GeoNest API v1",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		BodyLimit:    64 * 1024,
		ErrorHandler: handlers.ErrorHandler,
	})

	app.Use(requestid.New())
	app.Use(fiberlog.New())
	app.Use(middleware.SecurityHeaders())
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"https://geonest.io", "http://localhost:3000"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization", "X-API-Key"},
		AllowMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
	}))

	// ─── Routes ──────────────────────────────────────────────────────────────
	v1 := app.Group("/v1")

	// Public
	v1.Post("/auth/register", authH.Register)
	v1.Post("/auth/login", authH.Login)
	v1.Post("/auth/refresh", authH.RefreshToken)
	v1.Get("/geo/countries", geoH.ListCountries)
	v1.Post("/billing/webhook", billingH.StripeWebhook)
	app.Get("/health", handlers.HealthCheck)

	// API key protected routes
	apiKeyMW := middleware.APIKeyAuth(db, redisClient)
	rateLimitMW := middleware.RateLimit(redisClient, db)
	api := v1.Group("", apiKeyMW, rateLimitMW)

	api.Get("/geo/:cc", geoH.GetCountry)
	api.Get("/geo/:cc/l:n", geoH.GetLevel)
	api.Get("/geo/:cc/l:n/:id", geoH.GetAreaByID)
	api.Get("/geo/:cc/l:n/:id/children", geoH.GetChildren)
	api.Get("/geo/:cc/l:n/:id/ancestors", geoH.GetAncestors)
	api.Get("/search", searchH.Search)
	api.Get("/search/autocomplete", searchH.Autocomplete)
	api.Get("/usage", usageH.GetUsage)
	api.Get("/usage/history", usageH.GetUsageHistory)

	// JWT protected routes (dashboard actions)
	jwtMW := middleware.JWTAuth(cfg.JWTSecret)
	jwt := v1.Group("", jwtMW)

	jwt.Get("/keys", keyH.ListKeys)
	jwt.Post("/keys", keyH.CreateKey)
	jwt.Post("/keys/:id/rotate", keyH.RotateKey)
	jwt.Delete("/keys/:id", keyH.RevokeKey)
	jwt.Get("/billing/plans", billingH.ListPlans)
	jwt.Post("/billing/subscribe", billingH.Subscribe)
	jwt.Get("/billing/portal", billingH.BillingPortal)

	// ─── Graceful shutdown ───────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("Shutting down...")
		if err := app.Shutdown(); err != nil {
			log.Printf("Shutdown error: %v", err)
		}
	}()

	log.Printf("GeoNest API listening on :%s", cfg.APIPort)
	if err := app.Listen(":" + cfg.APIPort); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

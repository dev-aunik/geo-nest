package config

import (
	"log"
	"os"

	"github.com/spf13/viper"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// Typesense
	TypesenseURL    string
	TypesenseAPIKey string

	// App
	APIPort      string
	JWTSecret    string
	APIKeyPrefix string

	// Stripe
	StripeSecretKey      string
	StripeWebhookSecret  string
	StarterPriceID       string
	ProPriceID           string

	// Resend
	ResendAPIKey string
	EmailFrom    string

	// Frontend
	FrontendURL string
}

// Load reads configuration from environment variables (or .env file via viper).
func Load() *Config {
	viper.AutomaticEnv()

	// Default values for development
	viper.SetDefault("API_PORT", "8000")
	viper.SetDefault("TYPESENSE_URL", "http://localhost:8108")
	viper.SetDefault("TYPESENSE_API_KEY", "dev_typesense_key")
	viper.SetDefault("API_KEY_PREFIX", "gn_live_")
	viper.SetDefault("EMAIL_FROM", "noreply@geonest.io")
	viper.SetDefault("FRONTEND_URL", "http://localhost:3000")

	cfg := &Config{
		DatabaseURL:         getRequired("DATABASE_URL"),
		RedisURL:            getRequired("REDIS_URL"),
		TypesenseURL:        viper.GetString("TYPESENSE_URL"),
		TypesenseAPIKey:     viper.GetString("TYPESENSE_API_KEY"),
		APIPort:             viper.GetString("API_PORT"),
		JWTSecret:           getRequired("JWT_SECRET"),
		APIKeyPrefix:        viper.GetString("API_KEY_PREFIX"),
		StripeSecretKey:     os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StarterPriceID:      os.Getenv("STRIPE_STARTER_PRICE_ID"),
		ProPriceID:          os.Getenv("STRIPE_PRO_PRICE_ID"),
		ResendAPIKey:        os.Getenv("RESEND_API_KEY"),
		EmailFrom:           viper.GetString("EMAIL_FROM"),
		FrontendURL:         viper.GetString("FRONTEND_URL"),
	}

	return cfg
}

func getRequired(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("required environment variable %s is not set", key)
	}
	return val
}

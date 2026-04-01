package handlers

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/yourusername/geonest-api/internal/models"
)

// ErrorHandler is the global Fiber error handler.
func ErrorHandler(c fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	code := "INTERNAL_ERROR"
	msg := "An unexpected error occurred."

	var fe *fiber.Error
	if errors.As(err, &fe) {
		status = fe.Code
		msg = fe.Message
		switch status {
		case 400:
			code = "BAD_REQUEST"
		case 401:
			code = "UNAUTHORIZED"
		case 403:
			code = "FORBIDDEN"
		case 404:
			code = "NOT_FOUND"
		case 422:
			code = "INVALID_PARAMETER"
		case 429:
			code = "RATE_LIMIT_EXCEEDED"
		}
	}

	// Log real error server-side. Never send stack traces to clients.
	log.Printf("ERROR [%s] %s %s: %v", c.Locals("requestid"), c.Method(), c.Path(), err)
	return respondError(c, status, code, msg)
}

// HealthCheck handles GET /health
func HealthCheck(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok"})
}

// respondError is the shared error response helper used by all handlers.
func respondError(c fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(models.ErrorResponse{
		Error: models.ErrorDetail{
			Code:    code,
			Message: message,
			Docs:    fmt.Sprintf("https://docs.geonest.io/errors#%s", strings.ToLower(code)),
		},
		RequestID: fmt.Sprint(c.Locals("requestid")),
	})
}

package handlers

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/fiber/v3"
	stripe "github.com/stripe/stripe-go/v79"
	billingsession "github.com/stripe/stripe-go/v79/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v79/checkout/session"
	"github.com/stripe/stripe-go/v79/customer"
	"github.com/stripe/stripe-go/v79/webhook"
	"github.com/yourusername/geonest-api/internal/models"
	"github.com/yourusername/geonest-api/internal/repository"
)

// BillingHandler holds dependencies for billing endpoints.
type BillingHandler struct {
	db                  *repository.Queries
	stripeSecretKey     string
	stripeWebhookSecret string
	starterPriceID      string
	proPriceID          string
	frontendURL         string
}

// NewBillingHandler creates a BillingHandler.
func NewBillingHandler(
	db *repository.Queries,
	stripeSecretKey, stripeWebhookSecret, starterPriceID, proPriceID, frontendURL string,
) *BillingHandler {
	stripe.Key = stripeSecretKey
	return &BillingHandler{
		db:                  db,
		stripeSecretKey:     stripeSecretKey,
		stripeWebhookSecret: stripeWebhookSecret,
		starterPriceID:      starterPriceID,
		proPriceID:          proPriceID,
		frontendURL:         frontendURL,
	}
}

// ListPlans handles GET /v1/billing/plans — public (JWT protected in practice)
func (h *BillingHandler) ListPlans(c fiber.Ctx) error {
	rows, err := h.db.ListPlans(c.Context())
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not retrieve plans.")
	}

	plans := make([]models.PlanResponse, 0, len(rows))
	for _, row := range rows {
		var features map[string]any
		json.Unmarshal(row.Features, &features)
		plans = append(plans, models.PlanResponse{
			ID:          row.ID,
			Name:        row.Name,
			PriceCents:  row.PriceCents,
			DailyQuota:  row.DailyQuota,
			PerMinLimit: row.PerMinLimit,
			MaxKeys:     row.MaxKeys,
			Features:    features,
		})
	}

	return c.JSON(fiber.Map{"plans": plans})
}

// Subscribe handles POST /v1/billing/subscribe — body: {"plan": "starter"|"pro"}
func (h *BillingHandler) Subscribe(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	user, err := h.db.GetUser(c.Context(), userID)
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not load user.")
	}

	body := &struct {
		Plan string `json:"plan"`
	}{}
	if err := c.Bind().JSON(body); err != nil || body.Plan == "" {
		return respondError(c, 400, "BAD_REQUEST", "plan is required (starter or pro).")
	}

	priceIDMap := map[string]string{
		"starter": h.starterPriceID,
		"pro":     h.proPriceID,
	}
	priceID, ok := priceIDMap[body.Plan]
	if !ok || priceID == "" {
		return respondError(c, 422, "INVALID_PARAMETER", "Plan must be 'starter' or 'pro'.")
	}

	customerID := ""
	if user.StripeCustomerID != nil {
		customerID = *user.StripeCustomerID
	}

	// Create Stripe customer if needed
	if customerID == "" {
		cust, err := customer.New(&stripe.CustomerParams{
			Email: stripe.String(user.Email),
		})
		if err != nil {
			return respondError(c, 500, "INTERNAL_ERROR", "Billing setup failed.")
		}
		h.db.UpdateUserStripeCustomer(c.Context(), userID, cust.ID)
		customerID = cust.ID
	}

	successURL := h.frontendURL + "/dashboard/billing?success=1"
	cancelURL := h.frontendURL + "/dashboard/billing"

	sess, err := checkoutsession.New(&stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{Price: stripe.String(priceID), Quantity: stripe.Int64(1)},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
	})
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Checkout setup failed.")
	}

	return c.JSON(fiber.Map{"checkout_url": sess.URL})
}

// BillingPortal handles GET /v1/billing/portal — redirects to Stripe Customer Portal
func (h *BillingHandler) BillingPortal(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	user, err := h.db.GetUser(c.Context(), userID)
	if err != nil || user.StripeCustomerID == nil || *user.StripeCustomerID == "" {
		return respondError(c, 400, "BAD_REQUEST", "No active subscription found.")
	}

	returnURL := h.frontendURL + "/dashboard/billing"
	sess, err := billingsession.New(&stripe.BillingPortalSessionParams{
		Customer:  stripe.String(*user.StripeCustomerID),
		ReturnURL: stripe.String(returnURL),
	})
	if err != nil {
		return respondError(c, 500, "INTERNAL_ERROR", "Could not open billing portal.")
	}

	return c.JSON(fiber.Map{"portal_url": sess.URL})
}

// StripeWebhook handles POST /v1/billing/webhook
func (h *BillingHandler) StripeWebhook(c fiber.Ctx) error {
	event, err := webhook.ConstructEvent(
		c.Body(), c.Get("Stripe-Signature"), h.stripeWebhookSecret)
	if err != nil {
		log.Printf("Stripe webhook signature verification failed: %v", err)
		return c.Status(400).SendString("Invalid signature")
	}

	switch event.Type {
	case "checkout.session.completed":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			return c.Status(400).SendString("Bad payload")
		}
		h.handleCheckoutCompleted(c, &sess)

	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return c.Status(400).SendString("Bad payload")
		}
		h.handleSubscriptionUpdated(c, &sub)

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return c.Status(400).SendString("Bad payload")
		}
		h.handleSubscriptionDeleted(c, &sub)

	case "invoice.payment_failed":
		var inv stripe.Invoice
		if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
			return c.Status(400).SendString("Bad payload")
		}
		h.handlePaymentFailed(c, &inv)
	}

	return c.SendStatus(200)
}

func (h *BillingHandler) handleCheckoutCompleted(c fiber.Ctx, sess *stripe.CheckoutSession) {
	if sess.Customer == nil || sess.Subscription == nil {
		return
	}
	user, err := h.db.GetUserByStripeCustomer(c.Context(), sess.Customer.ID)
	if err != nil {
		log.Printf("checkout.session.completed: user not found for customer %s", sess.Customer.ID)
		return
	}

	// Find the plan by the price ID in the subscription line items
	// For simplicity match priceID to plan
	plan, err := h.db.GetPlanByStripePriceID(c.Context(), sess.Subscription.ID)
	if err != nil {
		// Default to starter if we can't find price mapping
		log.Printf("checkout.session.completed: could not find plan for sub %s", sess.Subscription.ID)
	}

	planID := 2 // starter by default
	if plan != nil {
		planID = plan.ID
	}

	h.db.UpdateUserPlan(c.Context(), user.ID, planID)

	now := time.Now()
	end := now.AddDate(0, 1, 0)
	h.db.UpsertSubscription(c.Context(), repository.UpsertSubscriptionParams{
		UserID:      user.ID,
		PlanID:      planID,
		StripeSubID: sess.Subscription.ID,
		Status:      "active",
		PeriodStart: &now,
		PeriodEnd:   &end,
	})
}

func (h *BillingHandler) handleSubscriptionUpdated(c fiber.Ctx, sub *stripe.Subscription) {
	h.db.UpdateSubscriptionStatus(c.Context(), sub.ID, string(sub.Status))
}

func (h *BillingHandler) handleSubscriptionDeleted(c fiber.Ctx, sub *stripe.Subscription) {
	if sub.Customer == nil {
		return
	}
	user, err := h.db.GetUserByStripeCustomer(c.Context(), sub.Customer.ID)
	if err != nil {
		return
	}
	// Downgrade to free plan (plan_id = 1)
	h.db.UpdateUserPlan(c.Context(), user.ID, 1)
	h.db.UpdateSubscriptionStatus(c.Context(), sub.ID, "canceled")
}

func (h *BillingHandler) handlePaymentFailed(c fiber.Ctx, inv *stripe.Invoice) {
	if inv.Subscription == nil {
		return
	}
	h.db.UpdateSubscriptionStatus(c.Context(), inv.Subscription.ID, "past_due")
	log.Printf("Payment failed for subscription %s", inv.Subscription.ID)
}

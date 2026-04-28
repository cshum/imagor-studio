package billing

import "context"

type CheckoutSessionInput struct {
	OrgID      string
	Plan       string
	SuccessURL string
	CancelURL  string
}

type PortalSessionInput struct {
	OrgID     string
	ReturnURL string
}

type Session struct {
	URL string
}

// Service defines the billing operations the management runtime needs from a billing provider.
type Service interface {
	CreateCheckoutSession(ctx context.Context, input CheckoutSessionInput) (*Session, error)
	CreatePortalSession(ctx context.Context, input PortalSessionInput) (*Session, error)
	HandleWebhook(ctx context.Context, payload []byte, signature string) error
}

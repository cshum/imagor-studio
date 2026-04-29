package signup

import "context"

type Config struct {
	SESFromEmail       string
	SESRegion          string
	AWSRegion          string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSSessionToken    string
	AppURL             string
	AppAPIURL          string
	AppTitle           string
}

type StartPublicSignupParams struct {
	DisplayName string
	Email       string
	Password    string
	InviteToken string
}

type StartPublicSignupResult struct {
	Email                string
	VerificationRequired bool
	CooldownSeconds      int
	ExpiresInSeconds     int
	MaskedDestination    string
}

type VerifyPublicSignupResult struct {
	UserID       string
	OrgID        string
	RedirectPath string
}

type Runtime interface {
	StartPublicSignup(ctx context.Context, params StartPublicSignupParams) (*StartPublicSignupResult, error)
	VerifyPublicSignup(ctx context.Context, token string) (*VerifyPublicSignupResult, error)
	ResendPublicSignupVerification(ctx context.Context, email string) (*StartPublicSignupResult, error)
}

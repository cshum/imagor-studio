package invitedefault

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceinvite"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/uptrace/bun"
)

func NewStore(db *bun.DB) cloudcontract.SpaceInviteStore {
	return spaceinvite.NewStore(db)
}

func NewSender(cfg *config.Config) (cloudcontract.InviteSender, error) {
	if cfg.SESFromEmail == "" {
		return nil, nil
	}
	sesRegion := cfg.SESRegion
	if sesRegion == "" {
		sesRegion = cfg.AWSRegion
	}
	return newSESEmailSender(sesRegion, cfg.SESFromEmail, cfg.AppUrl, cfg.AppApiUrl)
}

type sesEmailSender struct {
	client    *sesv2.Client
	fromEmail string
	loginURL  string
}

func newSESEmailSender(region, fromEmail, appBaseURL, appAPIBaseURL string) (cloudcontract.InviteSender, error) {
	region = strings.TrimSpace(region)
	fromEmail = strings.TrimSpace(fromEmail)
	if region == "" {
		return nil, fmt.Errorf("ses region is required when ses-from-email is set")
	}
	if fromEmail == "" {
		return nil, fmt.Errorf("ses from email is required")
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), awsconfig.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	apiBase := strings.TrimRight(strings.TrimSpace(appAPIBaseURL), "/")
	if apiBase == "" {
		apiBase = strings.TrimRight(strings.TrimSpace(appBaseURL), "/")
	}
	if apiBase == "" {
		return nil, fmt.Errorf("app url or app api url is required for invitation links")
	}

	return &sesEmailSender{client: sesv2.NewFromConfig(awsCfg), fromEmail: fromEmail, loginURL: apiBase + "/api/auth/google/login"}, nil
}

func (s *sesEmailSender) SendSpaceInvitation(ctx context.Context, params cloudcontract.EmailParams) error {
	inviteURL := s.loginURL + "?invite_token=" + url.QueryEscape(params.InviteToken)
	subject := fmt.Sprintf("You were invited to %s", params.SpaceName)
	textBody := fmt.Sprintf("You were invited to join the space %s in %s as %s.\n\nAccept the invite: %s\n", params.SpaceName, params.OrgName, params.Role, inviteURL)
	htmlBody := fmt.Sprintf("<p>You were invited to join the space <strong>%s</strong> in <strong>%s</strong> as %s.</p><p><a href=%q>Accept invitation with Google</a></p>", params.SpaceName, params.OrgName, params.Role, inviteURL)

	_, err := s.client.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress: &s.fromEmail,
		Destination:      &types.Destination{ToAddresses: []string{params.ToEmail}},
		Content:          &types.EmailContent{Simple: &types.Message{Subject: &types.Content{Data: &subject}, Body: &types.Body{Text: &types.Content{Data: &textBody}, Html: &types.Content{Data: &htmlBody}}}},
	})
	if err != nil {
		return fmt.Errorf("send invitation email: %w", err)
	}
	return nil
}

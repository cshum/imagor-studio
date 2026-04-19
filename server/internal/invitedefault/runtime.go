package invitedefault

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
)

type store struct{ db *bun.DB }

func NewStore(db *bun.DB) cloudcontract.SpaceInviteStore { return &store{db: db} }

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

func rowToInvitation(row *model.SpaceInvitation) *cloudcontract.Invitation {
	if row == nil {
		return nil
	}
	return &cloudcontract.Invitation{
		ID:              row.ID,
		OrgID:           row.OrgID,
		SpaceKey:        row.SpaceKey,
		Email:           row.Email,
		Role:            row.Role,
		Token:           row.Token,
		InvitedByUserID: row.InvitedByUserID,
		AcceptedAt:      row.AcceptedAt,
		ExpiresAt:       row.ExpiresAt,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
	}
}

func (s *store) CreateOrRefreshPending(ctx context.Context, orgID, spaceKey, email, role, invitedByUserID string, expiresAt time.Time) (*cloudcontract.Invitation, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return nil, fmt.Errorf("email is required")
	}
	now := time.Now().UTC()
	var result *cloudcontract.Invitation
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var existing model.SpaceInvitation
		scanErr := tx.NewSelect().Model(&existing).Where("org_id = ?", orgID).Where("space_key = ?", spaceKey).Where("email = ?", normalizedEmail).Where("accepted_at IS NULL").Limit(1).Scan(ctx)
		if scanErr != nil && !errors.Is(scanErr, sql.ErrNoRows) {
			return fmt.Errorf("lookup pending invitation: %w", scanErr)
		}
		if scanErr == nil {
			existing.Role = role
			existing.InvitedByUserID = invitedByUserID
			existing.ExpiresAt = expiresAt
			existing.UpdatedAt = now
			if existing.Token == "" {
				token, tokenErr := generateToken()
				if tokenErr != nil {
					return tokenErr
				}
				existing.Token = token
			}
			if _, err := tx.NewUpdate().Model(&existing).Column("role", "invited_by_user_id", "expires_at", "updated_at", "token").WherePK().Exec(ctx); err != nil {
				return fmt.Errorf("refresh pending invitation: %w", err)
			}
			result = rowToInvitation(&existing)
			return nil
		}
		token, tokenErr := generateToken()
		if tokenErr != nil {
			return tokenErr
		}
		entry := &model.SpaceInvitation{ID: uuid.GenerateUUID(), OrgID: orgID, SpaceKey: spaceKey, Email: normalizedEmail, Role: role, Token: token, InvitedByUserID: invitedByUserID, ExpiresAt: expiresAt, CreatedAt: now, UpdatedAt: now}
		if _, err := tx.NewInsert().Model(entry).Exec(ctx); err != nil {
			return fmt.Errorf("create pending invitation: %w", err)
		}
		result = rowToInvitation(entry)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *store) ListPendingBySpace(ctx context.Context, orgID, spaceKey string) ([]*cloudcontract.Invitation, error) {
	var rows []model.SpaceInvitation
	err := s.db.NewSelect().Model(&rows).Where("org_id = ?", orgID).Where("space_key = ?", spaceKey).Where("accepted_at IS NULL").Where("expires_at > ?", time.Now().UTC()).OrderExpr("created_at ASC").Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("list space invitations: %w", err)
	}
	result := make([]*cloudcontract.Invitation, 0, len(rows))
	for i := range rows {
		result = append(result, rowToInvitation(&rows[i]))
	}
	return result, nil
}

func (s *store) GetPendingByToken(ctx context.Context, token string) (*cloudcontract.Invitation, error) {
	var row model.SpaceInvitation
	err := s.db.NewSelect().Model(&row).Where("token = ?", token).Where("accepted_at IS NULL").Where("expires_at > ?", time.Now().UTC()).Limit(1).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get invitation by token: %w", err)
	}
	return rowToInvitation(&row), nil
}

func (s *store) MarkAccepted(ctx context.Context, id string, acceptedAt time.Time) error {
	_, err := s.db.NewUpdate().Model((*model.SpaceInvitation)(nil)).Set("accepted_at = ?", acceptedAt).Set("updated_at = ?", acceptedAt).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return fmt.Errorf("mark invitation accepted: %w", err)
	}
	return nil
}

func (s *store) RenameSpaceKey(ctx context.Context, orgID, oldSpaceKey, newSpaceKey string) error {
	oldSpaceKey = strings.TrimSpace(oldSpaceKey)
	newSpaceKey = strings.TrimSpace(newSpaceKey)
	if oldSpaceKey == newSpaceKey {
		return nil
	}
	_, err := s.db.NewUpdate().Model((*model.SpaceInvitation)(nil)).Set("space_key = ?", newSpaceKey).Set("updated_at = ?", time.Now().UTC()).Where("org_id = ?", orgID).Where("space_key = ?", oldSpaceKey).Exec(ctx)
	if err != nil {
		return fmt.Errorf("rename invitation space key %s -> %s: %w", oldSpaceKey, newSpaceKey, err)
	}
	return nil
}

func generateToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate invitation token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

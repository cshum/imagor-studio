package httphandler

import (
	"context"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/internal/spaceinvite"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"go.uber.org/zap"
)

type oauthModeBehavior interface {
	loadPendingInvite(ctx context.Context, inviteToken string) (*spaceinvite.Invitation, error)
	resolveOrgID(ctx context.Context, user *userstore.User) string
	acceptInvitation(ctx context.Context, userID string, invite *spaceinvite.Invitation) error
}

type selfHostedOAuthMode struct{}

func (selfHostedOAuthMode) loadPendingInvite(context.Context, string) (*spaceinvite.Invitation, error) {
	return nil, nil
}

func (selfHostedOAuthMode) resolveOrgID(context.Context, *userstore.User) string { return "" }

func (selfHostedOAuthMode) acceptInvitation(context.Context, string, *spaceinvite.Invitation) error {
	return nil
}

type cloudOAuthMode struct {
	handler *OAuthHandler
}

func (m cloudOAuthMode) loadPendingInvite(ctx context.Context, inviteToken string) (*spaceinvite.Invitation, error) {
	if inviteToken == "" || m.handler.inviteStore == nil || m.handler.orgStore == nil || m.handler.spaceStore == nil {
		return nil, nil
	}
	invite, err := m.handler.inviteStore.GetPendingByToken(ctx, inviteToken)
	if err != nil {
		return nil, fmt.Errorf("load invitation: %w", err)
	}
	return invite, nil
}

func (m cloudOAuthMode) resolveOrgID(ctx context.Context, user *userstore.User) string {
	org, orgErr := m.handler.orgStore.GetByUserID(ctx, user.ID)
	if orgErr != nil {
		m.handler.logger.Warn("OAuth callback: failed to get org for user", zap.String("userID", user.ID), zap.Error(orgErr))
		return ""
	}
	if org == nil {
		trialEndsAt := time.Now().UTC().Add(14 * 24 * time.Hour)
		newOrg, createErr := m.handler.orgStore.CreateWithMember(ctx, user.ID, user.DisplayName, user.Username, &trialEndsAt)
		if createErr != nil {
			m.handler.logger.Warn("OAuth callback: failed to create org for user", zap.String("userID", user.ID), zap.Error(createErr))
			return ""
		}
		if roleErr := m.handler.userStore.UpdateRole(ctx, user.ID, "admin"); roleErr != nil {
			m.handler.logger.Warn("OAuth callback: failed to set admin role for org owner", zap.String("userID", user.ID), zap.Error(roleErr))
		} else {
			user.Role = "admin"
		}
		return newOrg.ID
	}
	return org.ID
}

func (m cloudOAuthMode) acceptInvitation(ctx context.Context, userID string, invite *spaceinvite.Invitation) error {
	if invite == nil {
		return nil
	}
	hasSpaceAccess, err := m.handler.spaceStore.HasMember(ctx, invite.SpaceKey, userID)
	if err != nil {
		return fmt.Errorf("check space membership: %w", err)
	}
	if !hasSpaceAccess {
		if err := m.handler.spaceStore.AddMember(ctx, invite.SpaceKey, userID, invite.Role); err != nil {
			return fmt.Errorf("add invited user to space: %w", err)
		}
	}

	if err := m.handler.inviteStore.MarkAccepted(ctx, invite.ID, time.Now().UTC()); err != nil {
		return fmt.Errorf("mark invitation accepted: %w", err)
	}
	return nil
}

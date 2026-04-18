package httphandler

import (
	"context"
	"time"

	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"go.uber.org/zap"
)

type authModeBehavior interface {
	firstRunResponse(isFirstRun bool) FirstRunResponse
	resolveLoginOrgID(ctx context.Context, userID string) string
	createUserOrg(ctx context.Context, user *userstore.User, normalizedDisplayName, normalizedUsername string) (string, error)
}

type selfHostedAuthMode struct{}

func (selfHostedAuthMode) firstRunResponse(isFirstRun bool) FirstRunResponse {
	return FirstRunResponse{
		IsFirstRun:  isFirstRun,
		Timestamp:   time.Now().UnixMilli(),
		MultiTenant: false,
	}
}

func (selfHostedAuthMode) resolveLoginOrgID(context.Context, string) string { return "" }

func (selfHostedAuthMode) createUserOrg(context.Context, *userstore.User, string, string) (string, error) {
	return "", nil
}

type cloudAuthMode struct {
	orgStore orgstore.Store
	logger   *zap.Logger
}

func (m cloudAuthMode) firstRunResponse(isFirstRun bool) FirstRunResponse {
	return FirstRunResponse{
		IsFirstRun:  isFirstRun,
		Timestamp:   time.Now().UnixMilli(),
		MultiTenant: true,
	}
}

func (m cloudAuthMode) resolveLoginOrgID(ctx context.Context, userID string) string {
	org, err := m.orgStore.GetByUserID(ctx, userID)
	if err != nil {
		m.logger.Warn("Failed to look up org for user on login", zap.String("userID", userID), zap.Error(err))
		return ""
	}
	if org == nil {
		return ""
	}
	return org.ID
}

func (m cloudAuthMode) createUserOrg(ctx context.Context, user *userstore.User, normalizedDisplayName, normalizedUsername string) (string, error) {
	trialEndsAt := time.Now().UTC().Add(14 * 24 * time.Hour)
	org, err := m.orgStore.CreateWithMember(ctx, user.ID, normalizedDisplayName, normalizedUsername, &trialEndsAt)
	if err != nil {
		m.logger.Error("Failed to create org for user on register", zap.String("userID", user.ID), zap.Error(err))
		return "", err
	}
	return org.ID, nil
}

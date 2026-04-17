package resolver

import (
	"context"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/spacestore"
	"go.uber.org/zap"
)

// ---------- helpers ----------------------------------------------------------

func mapOrgToGQL(o *orgstore.Org) *gql.Organization {
	return &gql.Organization{
		ID:          o.ID,
		Name:        o.Name,
		Slug:        o.Slug,
		OwnerUserID: o.OwnerID,
		Plan:        o.Plan,
		PlanStatus:  o.PlanStatus,
		CreatedAt:   o.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   o.UpdatedAt.Format(time.RFC3339),
	}
}

func mapSpaceToGQL(s *spacestore.Space) *gql.Space {
	return &gql.Space{
		OrgID:                s.OrgID,
		Key:                  s.Key,
		Name:                 s.Name,
		StorageType:          s.StorageType,
		Bucket:               s.Bucket,
		Prefix:               s.Prefix,
		Region:               s.Region,
		Endpoint:             s.Endpoint,
		UsePathStyle:         s.UsePathStyle,
		CustomDomain:         s.CustomDomain,
		CustomDomainVerified: s.CustomDomainVerified,
		Suspended:            s.Suspended,
		IsShared:             s.IsShared,
		SignerAlgorithm:      s.SignerAlgorithm,
		SignerTruncate:       s.SignerTruncate,
		UpdatedAt:            s.UpdatedAt.Format(time.RFC3339),
	}
}

func mapSpaceMemberToGQL(m *spacestore.SpaceMemberView) *gql.SpaceMember {
	return &gql.SpaceMember{
		UserID:      m.UserID,
		Username:    m.Username,
		DisplayName: m.DisplayName,
		Role:        m.Role,
		CreatedAt:   m.CreatedAt.UTC().Format(time.RFC3339),
	}
}

// getUserOrgID returns the org ID for the authenticated user.
// It prefers the OrgID embedded in the JWT claims (no DB round-trip);
// falls back to a DB lookup via orgStore when the claim is absent.
func (r *Resolver) getUserOrgID(ctx context.Context) (string, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return "", err
	}
	if claims.OrgID != "" {
		return claims.OrgID, nil
	}
	// Fallback: look up via orgStore (self-hosted or legacy token without org_id claim).
	if r.orgStore == nil {
		return "", nil
	}
	org, err := r.orgStore.GetByUserID(ctx, claims.UserID)
	if err != nil {
		return "", fmt.Errorf("get org for user: %w", err)
	}
	if org == nil {
		return "", nil
	}
	return org.ID, nil
}

func (r *Resolver) canReadSpace(ctx context.Context, space *spacestore.Space) (bool, error) {
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return false, err
	}
	if orgID != "" && space.OrgID != orgID {
		return false, nil
	}
	if RequireAdminPermission(ctx) == nil {
		return true, nil
	}
	if space.IsShared {
		return true, nil
	}
	if r.spaceStore == nil {
		return false, nil
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	return r.spaceStore.HasMember(ctx, space.Key, claims.UserID)
}

// applySpaceInput applies a SpaceInput onto a Space struct.
// Nil-pointer fields in SpaceInput are skipped (keep existing value).
func applySpaceInput(sp *spacestore.Space, input gql.SpaceInput) {
	sp.Key = input.Key
	sp.Name = input.Name
	if input.StorageType != nil {
		sp.StorageType = *input.StorageType
	}
	if input.Bucket != nil {
		sp.Bucket = *input.Bucket
	}
	if input.Prefix != nil {
		sp.Prefix = *input.Prefix
	}
	if input.Region != nil {
		sp.Region = *input.Region
	}
	if input.Endpoint != nil {
		sp.Endpoint = *input.Endpoint
	}
	if input.AccessKeyID != nil {
		sp.AccessKeyID = *input.AccessKeyID
	}
	if input.SecretKey != nil {
		sp.SecretKey = *input.SecretKey
	}
	if input.UsePathStyle != nil {
		sp.UsePathStyle = *input.UsePathStyle
	}
	if input.CustomDomain != nil {
		sp.CustomDomain = *input.CustomDomain
	}
	if input.IsShared != nil {
		sp.IsShared = *input.IsShared
	}
	if input.SignerAlgorithm != nil {
		sp.SignerAlgorithm = *input.SignerAlgorithm
	}
	if input.SignerTruncate != nil {
		sp.SignerTruncate = *input.SignerTruncate
	}
	if input.ImagorSecret != nil {
		sp.ImagorSecret = *input.ImagorSecret
	}
}

// ---------- Query resolvers --------------------------------------------------

// MyOrganization returns the organization for the currently authenticated user.
func (r *queryResolver) MyOrganization(ctx context.Context) (*gql.Organization, error) {
	if r.orgStore == nil {
		return nil, nil
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	org, err := r.orgStore.GetByUserID(ctx, claims.UserID)
	if err != nil {
		r.logger.Error("MyOrganization: failed to get org", zap.Error(err))
		return nil, fmt.Errorf("failed to retrieve organization: %w", err)
	}
	if org == nil {
		return nil, nil
	}
	return mapOrgToGQL(org), nil
}

// Spaces returns all active spaces for the authenticated user's organization.
func (r *queryResolver) Spaces(ctx context.Context) ([]*gql.Space, error) {
	if r.spaceStore == nil {
		return []*gql.Space{}, nil
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if orgID == "" {
		return []*gql.Space{}, nil
	}
	spaces, err := r.spaceStore.ListByOrgID(ctx, orgID)
	if err != nil {
		r.logger.Error("Spaces: failed to list spaces", zap.Error(err))
		return nil, fmt.Errorf("failed to list spaces: %w", err)
	}
	result := make([]*gql.Space, 0, len(spaces))
	for _, s := range spaces {
		allowed, allowErr := r.canReadSpace(ctx, s)
		if allowErr != nil {
			return nil, allowErr
		}
		if !allowed {
			continue
		}
		result = append(result, mapSpaceToGQL(s))
	}
	return result, nil
}

// SpaceKeyExists reports whether the given key is already taken (admin only).
func (r *queryResolver) SpaceKeyExists(ctx context.Context, key string) (bool, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return false, err
	}
	if r.spaceStore == nil {
		return false, nil
	}
	return r.spaceStore.KeyExists(ctx, key)
}

// Space returns a single space by key, scoped to the authenticated user's org.
func (r *queryResolver) Space(ctx context.Context, key string) (*gql.Space, error) {
	if r.spaceStore == nil {
		return nil, nil
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	s, err := r.spaceStore.Get(ctx, key)
	if err != nil {
		r.logger.Error("Space: failed to get space", zap.String("key", key), zap.Error(err))
		return nil, fmt.Errorf("failed to get space: %w", err)
	}
	if s == nil {
		return nil, nil
	}
	if orgID != "" && s.OrgID != orgID {
		r.logger.Warn("Space: org mismatch", zap.String("key", key), zap.String("spaceOrgID", s.OrgID), zap.String("callerOrgID", orgID))
		return nil, nil
	}
	allowed, allowErr := r.canReadSpace(ctx, s)
	if allowErr != nil {
		return nil, allowErr
	}
	if !allowed {
		return nil, nil
	}
	return mapSpaceToGQL(s), nil
}

// ---------- Mutation resolvers -----------------------------------------------

// CreateSpace creates a new space (admin only).
func (r *mutationResolver) CreateSpace(ctx context.Context, input gql.SpaceInput) (*gql.Space, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.spaceStore == nil {
		return nil, fmt.Errorf("space management is not available in this deployment")
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if orgID == "" {
		if r.orgStore == nil {
			return nil, fmt.Errorf("no organization found for current user")
		}
		// Auto-provision a personal org for this admin on their first space creation.
		// Uses the first 8 chars of the user UUID as a unique org slug.
		claims, claimsErr := auth.GetClaimsFromContext(ctx)
		if claimsErr != nil {
			return nil, claimsErr
		}
		n := 8
		if len(claims.UserID) < n {
			n = len(claims.UserID)
		}
		orgSlug := "org-" + claims.UserID[:n]
		newOrg, createErr := r.orgStore.CreateWithMember(ctx, claims.UserID, "My Organization", orgSlug, nil)
		if createErr != nil {
			r.logger.Error("CreateSpace: failed to auto-create org", zap.Error(createErr))
			return nil, fmt.Errorf("failed to create organization: %w", createErr)
		}
		r.logger.Info("Auto-created org for user", zap.String("userID", claims.UserID), zap.String("orgID", newOrg.ID))
		orgID = newOrg.ID
	}

	sp := &spacestore.Space{OrgID: orgID}
	applySpaceInput(sp, input)

	if err := r.spaceStore.Create(ctx, sp); err != nil {
		r.logger.Error("CreateSpace: failed to create", zap.String("key", input.Key), zap.Error(err))
		return nil, err
	}

	claims, claimsErr := auth.GetClaimsFromContext(ctx)
	if claimsErr == nil {
		memberRoles := map[string]string{claims.UserID: "admin"}
		if r.orgStore != nil {
			members, listErr := r.orgStore.ListMembers(ctx, orgID)
			if listErr != nil {
				return nil, fmt.Errorf("space created but failed to seed members: %w", listErr)
			}
			for _, member := range members {
				if member.Role == "owner" || member.Role == "admin" {
					memberRoles[member.UserID] = "admin"
				}
			}
		}
		for userID, role := range memberRoles {
			if err := r.spaceStore.AddMember(ctx, input.Key, userID, role); err != nil {
				return nil, fmt.Errorf("space created but failed to seed members: %w", err)
			}
		}
	}

	created, err := r.spaceStore.Get(ctx, input.Key)
	if err != nil || created == nil {
		r.logger.Error("CreateSpace: failed to fetch after upsert", zap.String("key", input.Key), zap.Error(err))
		return nil, fmt.Errorf("space created but could not be retrieved")
	}
	r.logger.Info("Space created", zap.String("key", input.Key), zap.String("orgID", orgID))
	return mapSpaceToGQL(created), nil
}

// UpdateSpace updates an existing space by key (admin only).
// Nil fields in the input are ignored — they preserve the existing value.
func (r *mutationResolver) UpdateSpace(ctx context.Context, key string, input gql.SpaceInput) (*gql.Space, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.spaceStore == nil {
		return nil, fmt.Errorf("space management is not available in this deployment")
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}

	// Load existing space so we can apply partial updates.
	existing, err := r.spaceStore.Get(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if existing == nil {
		return nil, fmt.Errorf("space %q not found", key)
	}
	if orgID != "" && existing.OrgID != orgID {
		return nil, fmt.Errorf("space %q not found", key)
	}

	applySpaceInput(existing, input)

	if err := r.spaceStore.Upsert(ctx, existing); err != nil {
		r.logger.Error("UpdateSpace: upsert failed", zap.String("key", key), zap.Error(err))
		return nil, fmt.Errorf("failed to update space: %w", err)
	}

	updated, err := r.spaceStore.Get(ctx, input.Key)
	if err != nil || updated == nil {
		return nil, fmt.Errorf("space updated but could not be retrieved")
	}
	r.logger.Info("Space updated", zap.String("key", key))
	return mapSpaceToGQL(updated), nil
}

// DeleteSpace soft-deletes a space by key (admin only).
func (r *mutationResolver) DeleteSpace(ctx context.Context, key string) (bool, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return false, err
	}
	if r.spaceStore == nil {
		return false, fmt.Errorf("space management is not available in this deployment")
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return false, err
	}

	// Verify ownership before deleting.
	existing, err := r.spaceStore.Get(ctx, key)
	if err != nil {
		return false, fmt.Errorf("failed to fetch space: %w", err)
	}
	if existing == nil {
		return false, fmt.Errorf("space %q not found", key)
	}
	if orgID != "" && existing.OrgID != orgID {
		return false, fmt.Errorf("space %q not found", key)
	}

	if err := r.spaceStore.SoftDelete(ctx, key); err != nil {
		r.logger.Error("DeleteSpace: soft-delete failed", zap.String("key", key), zap.Error(err))
		return false, fmt.Errorf("failed to delete space: %w", err)
	}
	r.logger.Info("Space deleted", zap.String("key", key))
	return true, nil
}

// ---------- Member management resolvers -------------------------------------

// mapMemberToGQL converts an OrgMemberView to the GraphQL OrgMember type.
func mapMemberToGQL(m *orgstore.OrgMemberView) *gql.OrgMember {
	return &gql.OrgMember{
		UserID:      m.UserID,
		Username:    m.Username,
		DisplayName: m.DisplayName,
		Role:        m.Role,
		CreatedAt:   m.CreatedAt.UTC().Format(time.RFC3339),
	}
}

// SpaceMembers lists all explicit members of a space (admin only).
func (r *queryResolver) SpaceMembers(ctx context.Context, spaceKey string) ([]*gql.SpaceMember, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.spaceStore == nil {
		return []*gql.SpaceMember{}, nil
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return []*gql.SpaceMember{}, nil
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if orgID != "" && space.OrgID != orgID {
		return []*gql.SpaceMember{}, nil
	}
	members, err := r.spaceStore.ListMembers(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list space members: %w", err)
	}
	result := make([]*gql.SpaceMember, 0, len(members))
	for _, member := range members {
		result = append(result, mapSpaceMemberToGQL(member))
	}
	return result, nil
}

// OrgMembers lists all members of the caller's organization (admin only).
func (r *queryResolver) OrgMembers(ctx context.Context) ([]*gql.OrgMember, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.orgStore == nil {
		return []*gql.OrgMember{}, nil
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil || orgID == "" {
		return []*gql.OrgMember{}, err
	}
	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		r.logger.Error("OrgMembers: failed to list members", zap.String("orgID", orgID), zap.Error(err))
		return nil, fmt.Errorf("failed to list org members: %w", err)
	}
	result := make([]*gql.OrgMember, 0, len(members))
	for _, m := range members {
		result = append(result, mapMemberToGQL(m))
	}
	return result, nil
}

// AddOrgMember adds a user (found by username) to the caller's org (admin only).
// Enforces the plan's MaxMembers limit before inserting.
func (r *mutationResolver) AddOrgMember(ctx context.Context, username string, role string) (*gql.OrgMember, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.orgStore == nil || r.userStore == nil {
		return nil, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil || orgID == "" {
		return nil, fmt.Errorf("no organization found")
	}

	// Look up user by username.
	user, err := r.userStore.GetByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to look up user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user %q not found", username)
	}

	// Enforce plan member limit.
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	org, err := r.orgStore.GetByUserID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve organization: %w", err)
	}
	if org != nil {
		limits := model.GetLimits(org.Plan)
		if limits.MaxMembers != -1 {
			members, err := r.orgStore.ListMembers(ctx, orgID)
			if err != nil {
				return nil, fmt.Errorf("failed to check member count: %w", err)
			}
			if len(members) >= limits.MaxMembers {
				return nil, fmt.Errorf("member limit (%d) reached for plan %q", limits.MaxMembers, org.Plan)
			}
		}
	}

	if err := r.orgStore.AddMember(ctx, orgID, user.ID, role); err != nil {
		r.logger.Error("AddOrgMember: failed", zap.String("orgID", orgID), zap.String("userID", user.ID), zap.Error(err))
		return nil, fmt.Errorf("failed to add member: %w", err)
	}
	r.logger.Info("OrgMember added", zap.String("orgID", orgID), zap.String("username", username), zap.String("role", role))

	// Reload to get joined username.
	memberList, err := r.orgStore.ListMembers(ctx, orgID)
	if err == nil {
		for _, m := range memberList {
			if m.UserID == user.ID {
				return mapMemberToGQL(m), nil
			}
		}
	}
	// Fallback if list fails.
	return &gql.OrgMember{
		UserID:   user.ID,
		Username: user.Username,
		Role:     role,
	}, nil
}

// RemoveOrgMember removes a member from the caller's org (admin only).
func (r *mutationResolver) RemoveOrgMember(ctx context.Context, userID string) (bool, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return false, err
	}
	if r.orgStore == nil {
		return false, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil || orgID == "" {
		return false, fmt.Errorf("no organization found")
	}

	if err := r.orgStore.RemoveMember(ctx, orgID, userID); err != nil {
		r.logger.Error("RemoveOrgMember: failed", zap.String("orgID", orgID), zap.String("userID", userID), zap.Error(err))
		return false, fmt.Errorf("failed to remove member: %w", err)
	}
	r.logger.Info("OrgMember removed", zap.String("orgID", orgID), zap.String("userID", userID))
	return true, nil
}

// AddSpaceMember adds an existing org member to a space (admin only).
func (r *mutationResolver) AddSpaceMember(ctx context.Context, spaceKey string, userID string, role string) (*gql.SpaceMember, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.spaceStore == nil || r.orgStore == nil {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil || orgID == "" {
		return nil, fmt.Errorf("no organization found")
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil || space.OrgID != orgID {
		return nil, fmt.Errorf("space %q not found", spaceKey)
	}
	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify org membership: %w", err)
	}
	var matched *orgstore.OrgMemberView
	for _, member := range members {
		if member.UserID == userID {
			matched = member
			break
		}
	}
	if matched == nil {
		return nil, fmt.Errorf("user is not a member of this organization")
	}
	if err := r.spaceStore.AddMember(ctx, spaceKey, userID, role); err != nil {
		return nil, fmt.Errorf("failed to add space member: %w", err)
	}
	spaceMembers, err := r.spaceStore.ListMembers(ctx, spaceKey)
	if err == nil {
		for _, member := range spaceMembers {
			if member.UserID == userID {
				return mapSpaceMemberToGQL(member), nil
			}
		}
	}
	return &gql.SpaceMember{UserID: userID, Username: matched.Username, DisplayName: matched.DisplayName, Role: role}, nil
}

// RemoveSpaceMember removes an explicit member from a space (admin only).
func (r *mutationResolver) RemoveSpaceMember(ctx context.Context, spaceKey string, userID string) (bool, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return false, err
	}
	if r.spaceStore == nil {
		return false, fmt.Errorf("space member management is not available in this deployment")
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return false, fmt.Errorf("failed to fetch space: %w", err)
	}
	orgID, orgErr := r.getUserOrgID(ctx)
	if orgErr != nil {
		return false, orgErr
	}
	if space == nil || (orgID != "" && space.OrgID != orgID) {
		return false, fmt.Errorf("space %q not found", spaceKey)
	}
	if err := r.spaceStore.RemoveMember(ctx, spaceKey, userID); err != nil {
		return false, fmt.Errorf("failed to remove space member: %w", err)
	}
	return true, nil
}

// UpdateOrgMemberRole changes a member's role within the caller's org (admin only).
func (r *mutationResolver) UpdateOrgMemberRole(ctx context.Context, userID string, role string) (*gql.OrgMember, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.orgStore == nil {
		return nil, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil || orgID == "" {
		return nil, fmt.Errorf("no organization found")
	}

	if err := r.orgStore.UpdateMemberRole(ctx, orgID, userID, role); err != nil {
		r.logger.Error("UpdateOrgMemberRole: failed", zap.String("orgID", orgID), zap.String("userID", userID), zap.Error(err))
		return nil, fmt.Errorf("failed to update member role: %w", err)
	}
	r.logger.Info("OrgMember role updated", zap.String("orgID", orgID), zap.String("userID", userID), zap.String("role", role))

	// Reload to return updated member.
	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err == nil {
		for _, m := range members {
			if m.UserID == userID {
				return mapMemberToGQL(m), nil
			}
		}
	}
	return &gql.OrgMember{UserID: userID, Role: role}, nil
}

// UpdateSpaceMemberRole changes a member's explicit role within a space (admin only).
func (r *mutationResolver) UpdateSpaceMemberRole(ctx context.Context, spaceKey string, userID string, role string) (*gql.SpaceMember, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if r.spaceStore == nil {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	orgID, orgErr := r.getUserOrgID(ctx)
	if orgErr != nil {
		return nil, orgErr
	}
	if space == nil || (orgID != "" && space.OrgID != orgID) {
		return nil, fmt.Errorf("space %q not found", spaceKey)
	}
	if err := r.spaceStore.UpdateMemberRole(ctx, spaceKey, userID, role); err != nil {
		return nil, fmt.Errorf("failed to update space member role: %w", err)
	}
	members, err := r.spaceStore.ListMembers(ctx, spaceKey)
	if err == nil {
		for _, member := range members {
			if member.UserID == userID {
				return mapSpaceMemberToGQL(member), nil
			}
		}
	}
	return &gql.SpaceMember{UserID: userID, Role: role}, nil
}

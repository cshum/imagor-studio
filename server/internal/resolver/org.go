package resolver

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/spaceinvite"
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
		CanManage:            false,
		CanDelete:            false,
		CanLeave:             false,
		UpdatedAt:            s.UpdatedAt.Format(time.RFC3339),
	}
}

type spacePermissions struct {
	CanRead    bool
	CanManage  bool
	CanDelete  bool
	CanLeave   bool
	MemberRole string
}

func normalizeSpaceMemberRole(role string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin", "manager":
		return "admin", nil
	case "member", "":
		return "member", nil
	default:
		return "", fmt.Errorf("invalid space role %q", role)
	}
}

func (r *Resolver) getSpacePermissions(ctx context.Context, space *spacestore.Space) (*spacePermissions, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	sameOrg := orgID != "" && space.OrgID == orgID
	permissions := &spacePermissions{}

	if sameOrg && space.IsShared {
		permissions.CanRead = true
	}
	if sameOrg && RequireAdminPermission(ctx) == nil {
		permissions.CanRead = true
		permissions.CanManage = true
		permissions.CanDelete = true
		return permissions, nil
	}

	if r.spaceStore == nil {
		return permissions, nil
	}

	members, err := r.spaceStore.ListMembers(ctx, space.Key)
	if err != nil {
		return nil, fmt.Errorf("failed to list space members: %w", err)
	}
	for _, member := range members {
		if member.UserID != claims.UserID {
			continue
		}
		role, roleErr := normalizeSpaceMemberRole(member.Role)
		if roleErr != nil {
			return nil, roleErr
		}
		permissions.MemberRole = role
		permissions.CanRead = true
		permissions.CanLeave = !sameOrg
		if role == "admin" {
			permissions.CanManage = true
		}
		break
	}

	return permissions, nil
}

func (r *Resolver) isProtectedHostSpaceMember(ctx context.Context, space *spacestore.Space, userID string) (bool, error) {
	if r.orgStore == nil {
		return false, nil
	}
	members, err := r.orgStore.ListMembers(ctx, space.OrgID)
	if err != nil {
		return false, fmt.Errorf("failed to verify host organization membership: %w", err)
	}
	for _, member := range members {
		if member.UserID != userID {
			continue
		}
		return member.Role == "owner" || member.Role == "admin", nil
	}
	return false, nil
}

func (r *Resolver) mapSpaceToGQLWithPermissions(ctx context.Context, s *spacestore.Space) (*gql.Space, error) {
	space := mapSpaceToGQL(s)
	permissions, err := r.getSpacePermissions(ctx, s)
	if err != nil {
		return nil, err
	}
	space.CanManage = permissions.CanManage
	space.CanDelete = permissions.CanDelete
	space.CanLeave = permissions.CanLeave
	return space, nil
}

func mapSpaceMemberToGQL(m *spacestore.SpaceMemberView) *gql.SpaceMember {
	return &gql.SpaceMember{
		UserID:        m.UserID,
		Username:      m.Username,
		DisplayName:   m.DisplayName,
		Email:         m.Email,
		AvatarURL:     m.AvatarURL,
		Role:          m.Role,
		CanChangeRole: false,
		CanRemove:     false,
		CreatedAt:     m.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func (r *Resolver) mapSpaceMemberToGQLWithPermissions(ctx context.Context, space *spacestore.Space, member *spacestore.SpaceMemberView) (*gql.SpaceMember, error) {
	gqlMember := mapSpaceMemberToGQL(member)
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return gqlMember, nil
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	if claims.UserID == member.UserID {
		return gqlMember, nil
	}
	protectedMember, err := r.isProtectedHostSpaceMember(ctx, space, member.UserID)
	if err != nil {
		return nil, err
	}
	if protectedMember {
		return gqlMember, nil
	}
	gqlMember.CanChangeRole = true
	gqlMember.CanRemove = true
	return gqlMember, nil
}

func mapSpaceInvitationToGQL(invitation *spaceinvite.Invitation) *gql.SpaceInvitation {
	return &gql.SpaceInvitation{
		ID:        invitation.ID,
		Email:     invitation.Email,
		Role:      invitation.Role,
		CreatedAt: invitation.CreatedAt.UTC().Format(time.RFC3339),
		ExpiresAt: invitation.ExpiresAt.UTC().Format(time.RFC3339),
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
	sameOrg := orgID != "" && space.OrgID == orgID
	if sameOrg && RequireAdminPermission(ctx) == nil {
		return true, nil
	}
	if sameOrg && space.IsShared {
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
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	spacesByKey := map[string]*spacestore.Space{}
	if orgID != "" {
		ownSpaces, listErr := r.spaceStore.ListByOrgID(ctx, orgID)
		if listErr != nil {
			r.logger.Error("Spaces: failed to list own spaces", zap.Error(listErr))
			return nil, fmt.Errorf("failed to list spaces: %w", listErr)
		}
		for _, s := range ownSpaces {
			spacesByKey[s.Key] = s
		}
	}
	memberSpaces, err := r.spaceStore.ListByMemberUserID(ctx, claims.UserID)
	if err != nil {
		r.logger.Error("Spaces: failed to list guest spaces", zap.Error(err))
		return nil, fmt.Errorf("failed to list spaces: %w", err)
	}
	for _, s := range memberSpaces {
		spacesByKey[s.Key] = s
	}

	result := make([]*gql.Space, 0, len(spacesByKey))
	for _, s := range spacesByKey {
		allowed, allowErr := r.canReadSpace(ctx, s)
		if allowErr != nil {
			return nil, allowErr
		}
		if !allowed {
			continue
		}
		mapped, mapErr := r.mapSpaceToGQLWithPermissions(ctx, s)
		if mapErr != nil {
			return nil, mapErr
		}
		result = append(result, mapped)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Key < result[j].Key
	})
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
	s, err := r.spaceStore.Get(ctx, key)
	if err != nil {
		r.logger.Error("Space: failed to get space", zap.String("key", key), zap.Error(err))
		return nil, fmt.Errorf("failed to get space: %w", err)
	}
	if s == nil {
		return nil, nil
	}
	allowed, allowErr := r.canReadSpace(ctx, s)
	if allowErr != nil {
		return nil, allowErr
	}
	if !allowed {
		return nil, nil
	}
	return r.mapSpaceToGQLWithPermissions(ctx, s)
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
	return r.mapSpaceToGQLWithPermissions(ctx, created)
}

// UpdateSpace updates an existing space by key (space manager).
// Nil fields in the input are ignored — they preserve the existing value.
func (r *mutationResolver) UpdateSpace(ctx context.Context, key string, input gql.SpaceInput) (*gql.Space, error) {
	if r.spaceStore == nil {
		return nil, fmt.Errorf("space management is not available in this deployment")
	}

	// Load existing space so we can apply partial updates.
	existing, err := r.spaceStore.Get(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if existing == nil {
		return nil, fmt.Errorf("space %q not found", key)
	}
	permissions, err := r.getSpacePermissions(ctx, existing)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, fmt.Errorf("forbidden: space manager access required")
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
	return r.mapSpaceToGQLWithPermissions(ctx, updated)
}

// DeleteSpace soft-deletes a space by key (owning organization admins only).
func (r *mutationResolver) DeleteSpace(ctx context.Context, key string) (bool, error) {
	if r.spaceStore == nil {
		return false, fmt.Errorf("space management is not available in this deployment")
	}

	// Verify ownership before deleting.
	existing, err := r.spaceStore.Get(ctx, key)
	if err != nil {
		return false, fmt.Errorf("failed to fetch space: %w", err)
	}
	if existing == nil {
		return false, fmt.Errorf("space %q not found", key)
	}
	permissions, err := r.getSpacePermissions(ctx, existing)
	if err != nil {
		return false, err
	}
	if !permissions.CanDelete {
		return false, fmt.Errorf("forbidden: only the owning organization admins can delete this space")
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

// SpaceMembers lists all explicit members of a space (space manager).
func (r *queryResolver) SpaceMembers(ctx context.Context, spaceKey string) ([]*gql.SpaceMember, error) {
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
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, fmt.Errorf("forbidden: space manager access required")
	}
	members, err := r.spaceStore.ListMembers(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list space members: %w", err)
	}
	result := make([]*gql.SpaceMember, 0, len(members))
	for _, member := range members {
		mapped, mapErr := r.mapSpaceMemberToGQLWithPermissions(ctx, space, member)
		if mapErr != nil {
			return nil, mapErr
		}
		result = append(result, mapped)
	}
	return result, nil
}

func (r *queryResolver) SpaceInvitations(ctx context.Context, spaceKey string) ([]*gql.SpaceInvitation, error) {
	if r.spaceStore == nil || r.spaceInviteStore == nil {
		return []*gql.SpaceInvitation{}, nil
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return []*gql.SpaceInvitation{}, nil
	}
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, fmt.Errorf("forbidden: space manager access required")
	}
	invitations, err := r.spaceInviteStore.ListPendingBySpace(ctx, space.OrgID, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list space invitations: %w", err)
	}
	result := make([]*gql.SpaceInvitation, 0, len(invitations))
	for _, invitation := range invitations {
		result = append(result, mapSpaceInvitationToGQL(invitation))
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

// AddOrgMemberByEmail adds an existing user (found by email) to the caller's org (admin only).
// Enforces the plan's MaxMembers limit before inserting.
func (r *mutationResolver) AddOrgMemberByEmail(ctx context.Context, email string, role string) (*gql.OrgMember, error) {
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

	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return nil, fmt.Errorf("email is required")
	}

	user, err := r.userStore.GetByEmail(ctx, normalizedEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to look up user by email: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user with email %q not found", normalizedEmail)
	}

	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify org membership: %w", err)
	}
	for _, member := range members {
		if member.UserID == user.ID {
			return nil, fmt.Errorf("user is already a member of your organization")
		}
	}

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
		if limits.MaxMembers != -1 && len(members) >= limits.MaxMembers {
			return nil, fmt.Errorf("member limit (%d) reached for plan %q", limits.MaxMembers, org.Plan)
		}
	}

	if err := r.orgStore.AddMember(ctx, orgID, user.ID, role); err != nil {
		r.logger.Error("AddOrgMemberByEmail: failed", zap.String("orgID", orgID), zap.String("userID", user.ID), zap.Error(err))
		return nil, fmt.Errorf("failed to add member: %w", err)
	}
	r.logger.Info("OrgMember added by email", zap.String("orgID", orgID), zap.String("email", normalizedEmail), zap.String("role", role))

	memberList, err := r.orgStore.ListMembers(ctx, orgID)
	if err == nil {
		for _, member := range memberList {
			if member.UserID == user.ID {
				return mapMemberToGQL(member), nil
			}
		}
	}

	return &gql.OrgMember{
		UserID:      user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        role,
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

// AddSpaceMember adds an existing org member to a space (space manager).
func (r *mutationResolver) AddSpaceMember(ctx context.Context, spaceKey string, userID string, role string) (*gql.SpaceMember, error) {
	if r.spaceStore == nil || r.orgStore == nil {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	normalizedRole, err := normalizeSpaceMemberRole(role)
	if err != nil {
		return nil, err
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return nil, fmt.Errorf("space %q not found", spaceKey)
	}
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, fmt.Errorf("forbidden: space manager access required")
	}
	members, err := r.orgStore.ListMembers(ctx, space.OrgID)
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
	if err := r.spaceStore.AddMember(ctx, spaceKey, userID, normalizedRole); err != nil {
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
	return &gql.SpaceMember{UserID: userID, Username: matched.Username, DisplayName: matched.DisplayName, Role: normalizedRole}, nil
}

func (r *mutationResolver) InviteSpaceMember(ctx context.Context, spaceKey string, email string, role string) (*gql.SpaceInviteResult, error) {
	if r.spaceStore == nil || r.orgStore == nil || r.userStore == nil {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	normalizedRole, err := normalizeSpaceMemberRole(role)
	if err != nil {
		return nil, err
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return nil, fmt.Errorf("space %q not found", spaceKey)
	}
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, fmt.Errorf("forbidden: space manager access required")
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return nil, fmt.Errorf("email is required")
	}

	orgMembers, err := r.orgStore.ListMembers(ctx, space.OrgID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify org membership: %w", err)
	}

	existingUser, err := r.userStore.GetByEmail(ctx, normalizedEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to look up user by email: %w", err)
	}
	if existingUser != nil {
		hasAccess, hasAccessErr := r.spaceStore.HasMember(ctx, spaceKey, existingUser.ID)
		if hasAccessErr != nil {
			return nil, fmt.Errorf("failed to check space membership: %w", hasAccessErr)
		}
		if hasAccess {
			return nil, fmt.Errorf("member already has access to this space")
		}

		for _, member := range orgMembers {
			if member.UserID != existingUser.ID {
				continue
			}
			if err := r.spaceStore.AddMember(ctx, spaceKey, existingUser.ID, normalizedRole); err != nil {
				return nil, fmt.Errorf("failed to add space member: %w", err)
			}
			spaceMembers, listErr := r.spaceStore.ListMembers(ctx, spaceKey)
			if listErr == nil {
				for _, spaceMember := range spaceMembers {
					if spaceMember.UserID == existingUser.ID {
						return &gql.SpaceInviteResult{Status: "added", Member: mapSpaceMemberToGQL(spaceMember)}, nil
					}
				}
			}
			return &gql.SpaceInviteResult{Status: "added", Member: &gql.SpaceMember{UserID: existingUser.ID, Username: member.Username, DisplayName: member.DisplayName, Email: existingUser.Email, AvatarURL: existingUser.AvatarUrl, Role: normalizedRole}}, nil
		}

		if err := r.spaceStore.AddMember(ctx, spaceKey, existingUser.ID, normalizedRole); err != nil {
			return nil, fmt.Errorf("failed to add space member: %w", err)
		}
		spaceMembers, listErr := r.spaceStore.ListMembers(ctx, spaceKey)
		if listErr == nil {
			for _, spaceMember := range spaceMembers {
				if spaceMember.UserID == existingUser.ID {
					return &gql.SpaceInviteResult{Status: "added", Member: mapSpaceMemberToGQL(spaceMember)}, nil
				}
			}
		}
		return &gql.SpaceInviteResult{Status: "added", Member: &gql.SpaceMember{UserID: existingUser.ID, Username: existingUser.Username, DisplayName: existingUser.DisplayName, Email: existingUser.Email, AvatarURL: existingUser.AvatarUrl, Role: normalizedRole}}, nil
	}

	if r.spaceInviteStore == nil || r.inviteSender == nil {
		return nil, fmt.Errorf("email invitations are not configured")
	}

	claims, claimsErr := auth.GetClaimsFromContext(ctx)
	if claimsErr != nil {
		return nil, claimsErr
	}
	invitation, err := r.spaceInviteStore.CreateOrRefreshPending(ctx, space.OrgID, spaceKey, normalizedEmail, normalizedRole, claims.UserID, time.Now().UTC().Add(7*24*time.Hour))
	if err != nil {
		return nil, fmt.Errorf("failed to create invitation: %w", err)
	}

	orgName := "your organization"
	org, orgErr := r.orgStore.GetByUserID(ctx, claims.UserID)
	if orgErr == nil && org != nil && org.Name != "" {
		orgName = org.Name
	}
	if err := r.inviteSender.SendSpaceInvitation(ctx, spaceinvite.EmailParams{
		ToEmail:     normalizedEmail,
		OrgName:     orgName,
		SpaceName:   space.Name,
		InviteToken: invitation.Token,
		Role:        normalizedRole,
	}); err != nil {
		return nil, fmt.Errorf("failed to send invitation email: %w", err)
	}

	return &gql.SpaceInviteResult{Status: "invited", Invitation: mapSpaceInvitationToGQL(invitation)}, nil
}

// RemoveSpaceMember removes an explicit member from a space (space manager).
func (r *mutationResolver) RemoveSpaceMember(ctx context.Context, spaceKey string, userID string) (bool, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if claims.UserID == userID {
		return false, fmt.Errorf("you cannot remove yourself from this space")
	}
	if r.spaceStore == nil {
		return false, fmt.Errorf("space member management is not available in this deployment")
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return false, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return false, fmt.Errorf("space %q not found", spaceKey)
	}
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return false, err
	}
	if !permissions.CanManage {
		return false, fmt.Errorf("forbidden: space manager access required")
	}
	protectedMember, err := r.isProtectedHostSpaceMember(ctx, space, userID)
	if err != nil {
		return false, err
	}
	if protectedMember {
		return false, fmt.Errorf("you cannot remove a host organization owner or admin from this space")
	}
	if err := r.spaceStore.RemoveMember(ctx, spaceKey, userID); err != nil {
		return false, fmt.Errorf("failed to remove space member: %w", err)
	}
	return true, nil
}

func (r *mutationResolver) LeaveSpace(ctx context.Context, spaceKey string) (bool, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if r.spaceStore == nil {
		return false, fmt.Errorf("space member management is not available in this deployment")
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return false, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return false, fmt.Errorf("space %q not found", spaceKey)
	}
	orgID, orgErr := r.getUserOrgID(ctx)
	if orgErr != nil {
		return false, orgErr
	}
	if orgID != "" && space.OrgID == orgID {
		return false, fmt.Errorf("you can only leave shared spaces from another organization")
	}
	hasAccess, err := r.spaceStore.HasMember(ctx, spaceKey, claims.UserID)
	if err != nil {
		return false, fmt.Errorf("failed to check space membership: %w", err)
	}
	if !hasAccess {
		return false, fmt.Errorf("you are not an explicit member of this space")
	}
	if err := r.spaceStore.RemoveMember(ctx, spaceKey, claims.UserID); err != nil {
		return false, fmt.Errorf("failed to leave space: %w", err)
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

// UpdateSpaceMemberRole changes a member's explicit role within a space (space manager).
func (r *mutationResolver) UpdateSpaceMemberRole(ctx context.Context, spaceKey string, userID string, role string) (*gql.SpaceMember, error) {
	if r.spaceStore == nil {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	if claims.UserID == userID {
		return nil, fmt.Errorf("you cannot change your own role in this space")
	}
	normalizedRole, err := normalizeSpaceMemberRole(role)
	if err != nil {
		return nil, err
	}
	space, err := r.spaceStore.Get(ctx, spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return nil, fmt.Errorf("space %q not found", spaceKey)
	}
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, fmt.Errorf("forbidden: space manager access required")
	}
	protectedMember, err := r.isProtectedHostSpaceMember(ctx, space, userID)
	if err != nil {
		return nil, err
	}
	if protectedMember {
		return nil, fmt.Errorf("you cannot change the space role for a host organization owner or admin")
	}
	if err := r.spaceStore.UpdateMemberRole(ctx, spaceKey, userID, normalizedRole); err != nil {
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
	return &gql.SpaceMember{UserID: userID, Role: normalizedRole}, nil
}

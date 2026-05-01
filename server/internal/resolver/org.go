package resolver

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/billing"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

var billablePlans = map[string]struct{}{
	org.PlanStarter: {},
	org.PlanPro:     {},
	org.PlanTeam:    {},
}

// ---------- helpers ----------------------------------------------------------

func mapOrgToGQL(o *org.Org) *gql.Organization {
	return &gql.Organization{
		ID:              o.ID,
		Name:            o.Name,
		Slug:            o.Slug,
		OwnerUserID:     o.OwnerID,
		CurrentUserRole: gql.OrgMemberRoleMember,
		Plan:            o.Plan,
		PlanStatus:      o.PlanStatus,
		CreatedAt:       o.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       o.UpdatedAt.Format(time.RFC3339),
	}
}

func (r *Resolver) getCurrentOrganizationRole(ctx context.Context, orgID string) (string, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return "", err
	}
	if orgID == "" || r.orgStore == nil {
		return "", nil
	}

	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return "", fmt.Errorf("failed to load organization: %w", err)
	}
	if currentOrg == nil {
		return "", nil
	}
	if currentOrg.OwnerID == claims.UserID {
		return "owner", nil
	}

	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return "", fmt.Errorf("failed to list org members: %w", err)
	}
	for _, member := range members {
		if member == nil || member.UserID != claims.UserID {
			continue
		}
		role := strings.ToLower(strings.TrimSpace(member.Role))
		if role == "owner" || role == "admin" || role == "member" {
			return role, nil
		}
		return "member", nil
	}

	return "", nil
}

func (r *Resolver) requireOrganizationAdminPermission(ctx context.Context) (string, string, error) {
	if !r.cloudEnabled() {
		if err := RequireAdminPermission(ctx); err != nil {
			return "", "", err
		}
		return "", "admin", nil
	}

	orgID, err := r.requireUserOrgID(ctx)
	if err != nil {
		return "", "", err
	}
	if RequireAdminPermission(ctx) == nil {
		return orgID, "admin", nil
	}
	role, err := r.getCurrentOrganizationRole(ctx, orgID)
	if err != nil {
		return "", "", err
	}
	if role != "owner" && role != "admin" {
		return "", "", apperror.Forbidden("organization admin access required")
	}
	return orgID, role, nil
}

func mapSpaceToGQL(s *space.Space) *gql.Space {
	return &gql.Space{
		ID:                    s.ID,
		OrgID:                 s.OrgID,
		Key:                   s.Key,
		Name:                  s.Name,
		StorageUsageBytes:     nil,
		ProcessingUsageCount:  nil,
		StorageMode:           space.NormalizeStorageMode(s.StorageMode),
		StorageType:           s.StorageType,
		Bucket:                s.Bucket,
		Prefix:                s.Prefix,
		Region:                s.Region,
		Endpoint:              s.Endpoint,
		UsePathStyle:          s.UsePathStyle,
		CustomDomain:          s.CustomDomain,
		CustomDomainVerified:  s.CustomDomainVerified,
		Suspended:             s.Suspended,
		IsShared:              s.IsShared,
		SignerAlgorithm:       s.SignerAlgorithm,
		SignerTruncate:        s.SignerTruncate,
		ImagorCORSOrigins:     s.ImagorCORSOrigins,
		HasCustomImagorSecret: strings.TrimSpace(s.ImagorSecret) != "",
		CanManage:             false,
		CanDelete:             false,
		CanLeave:              false,
		UpdatedAt:             s.UpdatedAt.Format(time.RFC3339),
	}
}

type spacePermissions struct {
	CanRead    bool
	CanManage  bool
	CanDelete  bool
	CanLeave   bool
	MemberRole string
}

func mapOrgMemberRole(role string) gql.OrgMemberRole {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "owner":
		return gql.OrgMemberRoleOwner
	case "admin":
		return gql.OrgMemberRoleAdmin
	default:
		return gql.OrgMemberRoleMember
	}
}

func mapSpaceMemberRole(role string) gql.SpaceMemberRole {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "owner":
		return gql.SpaceMemberRoleOwner
	case "admin":
		return gql.SpaceMemberRoleAdmin
	default:
		return gql.SpaceMemberRoleMember
	}
}

func mapSpaceMemberRoleSource(source string) gql.SpaceMemberRoleSource {
	if strings.EqualFold(strings.TrimSpace(source), "organization") {
		return gql.SpaceMemberRoleSourceOrganization
	}
	return gql.SpaceMemberRoleSourceSpace
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

func (r *Resolver) getSpacePermissions(ctx context.Context, space *space.Space) (*spacePermissions, error) {
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

	if sameOrg {
		permissions.CanRead = true
	}
	if sameOrg && RequireAdminPermission(ctx) == nil {
		permissions.CanRead = true
		permissions.CanManage = true
		permissions.CanDelete = true
		return permissions, nil
	}
	if sameOrg && r.orgStore != nil {
		members, listErr := r.orgStore.ListMembers(ctx, orgID)
		if listErr != nil {
			return nil, fmt.Errorf("failed to list org members: %w", listErr)
		}
		for _, member := range members {
			if member == nil || member.UserID != claims.UserID {
				continue
			}
			permissions.MemberRole = strings.ToLower(strings.TrimSpace(member.Role))
			if permissions.MemberRole == "owner" || permissions.MemberRole == "admin" {
				permissions.CanRead = true
				permissions.CanManage = true
				permissions.CanDelete = true
			}
			return permissions, nil
		}
	}

	if !r.cloudEnabled() {
		return permissions, nil
	}

	if !sameOrg {
		if r.spaceStore == nil {
			return permissions, nil
		}
		members, err := r.spaceStore.ListMembers(ctx, space.ID)
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
			permissions.CanLeave = true
			if role == "admin" {
				permissions.CanManage = true
			}
			break
		}
		return permissions, nil
	}
	if r.orgStore == nil {
		return permissions, nil
	}

	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list org members: %w", err)
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

func (r *Resolver) isProtectedHostSpaceMember(ctx context.Context, space *space.Space, userID string) (bool, error) {
	if !r.cloudEnabled() {
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

func (r *Resolver) applyHostedStorageUsage(gqlSpace *gql.Space, usageBytes int64, spaceID string) {
	gqlSpace.StorageUsageBytes = r.toGraphQLIntPtr(usageBytes, "hosted storage usage exceeds GraphQL int range", zap.String("spaceID", spaceID), zap.Int64("usageBytes", usageBytes))
}

func (r *Resolver) applyProcessingUsage(gqlSpace *gql.Space, processedCount int64, spaceID string) {
	gqlSpace.ProcessingUsageCount = r.toGraphQLIntPtr(processedCount, "processing usage exceeds GraphQL int range", zap.String("spaceID", spaceID), zap.Int64("processedCount", processedCount))
}

func (r *Resolver) toGraphQLIntPtr(value int64, message string, fields ...zap.Field) *int {
	converted := int(value)
	if int64(converted) != value {
		r.logger.Warn(message, fields...)
		return nil
	}
	return &converted
}

func (r *Resolver) listHostedUsageBySpaceID(ctx context.Context, orgID string, spacesByKey map[string]*space.Space) map[string]int64 {
	if r.hostedStorageStore == nil {
		return map[string]int64{}
	}
	aggregator, ok := r.hostedStorageStore.(management.HostedStorageUsageAggregator)
	if !ok {
		return map[string]int64{}
	}

	spaceIDs := make([]string, 0, len(spacesByKey))
	for _, s := range spacesByKey {
		if space.NormalizeStorageMode(s.StorageMode) != space.StorageModePlatform {
			continue
		}
		if orgID != "" && s.OrgID != orgID {
			continue
		}
		spaceIDs = append(spaceIDs, s.ID)
	}
	if len(spaceIDs) == 0 {
		return map[string]int64{}
	}
	sort.Strings(spaceIDs)

	hostedUsageBySpaceID, err := aggregator.ListUsageBytesBySpace(ctx, orgID, spaceIDs)
	if err != nil {
		r.logger.Warn("Spaces: failed to list hosted storage usage", zap.String("orgID", orgID), zap.Error(err))
		return map[string]int64{}
	}
	return hostedUsageBySpaceID
}

func (r *Resolver) getCurrentProcessingUsageSummary(ctx context.Context, orgID string) *management.ProcessingUsageSummary {
	if r.processingUsageStore == nil || orgID == "" {
		return &management.ProcessingUsageSummary{ProcessedCountBySpace: map[string]int64{}}
	}

	summary, err := r.processingUsageStore.GetCurrentUsageSummary(ctx, orgID)
	if err != nil {
		r.logger.Warn("failed to get processing usage summary", zap.String("orgID", orgID), zap.Error(err))
		return &management.ProcessingUsageSummary{ProcessedCountBySpace: map[string]int64{}}
	}
	if summary == nil {
		return &management.ProcessingUsageSummary{ProcessedCountBySpace: map[string]int64{}}
	}
	if summary.ProcessedCountBySpace == nil {
		summary.ProcessedCountBySpace = map[string]int64{}
	}
	return summary
}

func (r *Resolver) mapSpaceToUsageSummary(spaceRecord *space.Space, hostedUsageBySpaceID map[string]int64, processingUsageBySpaceID map[string]int64) *gql.SpaceUsage {
	usageSummary := &gql.SpaceUsage{
		SpaceID: spaceRecord.ID,
		Key:     spaceRecord.Key,
		Name:    spaceRecord.Name,
	}
	if usageBytes, ok := hostedUsageBySpaceID[spaceRecord.ID]; ok {
		usageSummary.StorageUsageBytes = r.toGraphQLIntPtr(usageBytes, "hosted storage usage exceeds GraphQL int range", zap.String("spaceID", spaceRecord.ID), zap.Int64("usageBytes", usageBytes))
	}
	if processedCount, ok := processingUsageBySpaceID[spaceRecord.ID]; ok {
		usageSummary.ProcessingUsageCount = r.toGraphQLIntPtr(processedCount, "processing usage exceeds GraphQL int range", zap.String("spaceID", spaceRecord.ID), zap.Int64("processedCount", processedCount))
	}
	return usageSummary
}

func (r *Resolver) mapSpaceToGQLWithPermissionsOnly(ctx context.Context, s *space.Space) (*gql.Space, error) {
	gqlSpace := mapSpaceToGQL(s)
	permissions, err := r.getSpacePermissions(ctx, s)
	if err != nil {
		return nil, err
	}
	gqlSpace.CanManage = permissions.CanManage
	gqlSpace.CanDelete = permissions.CanDelete
	gqlSpace.CanLeave = permissions.CanLeave
	return gqlSpace, nil
}

func (r *Resolver) mapSpaceToGQLWithPermissions(ctx context.Context, s *space.Space) (*gql.Space, error) {
	gqlSpace, err := r.mapSpaceToGQLWithPermissionsOnly(ctx, s)
	if err != nil {
		return nil, err
	}

	if r.hostedStorageStore != nil && space.NormalizeStorageMode(s.StorageMode) == space.StorageModePlatform {
		usageBytes, usageErr := r.hostedStorageStore.GetUsageBytes(ctx, s.OrgID, s.ID)
		if usageErr != nil {
			r.logger.Warn("mapSpaceToGQLWithPermissions: failed to get hosted storage usage", zap.String("spaceID", s.ID), zap.Error(usageErr))
		} else {
			r.applyHostedStorageUsage(gqlSpace, usageBytes, s.ID)
		}
	}

	if s.OrgID != "" {
		processingSummary := r.getCurrentProcessingUsageSummary(ctx, s.OrgID)
		if processedCount, ok := processingSummary.ProcessedCountBySpace[s.ID]; ok {
			r.applyProcessingUsage(gqlSpace, processedCount, s.ID)
		}
	}

	return gqlSpace, nil
}

func mapSpaceMemberToGQL(m *space.SpaceMemberView) *gql.SpaceMember {
	return &gql.SpaceMember{
		UserID:        m.UserID,
		Username:      m.Username,
		DisplayName:   m.DisplayName,
		Email:         m.Email,
		AvatarURL:     m.AvatarURL,
		Role:          mapSpaceMemberRole(m.Role),
		RoleSource:    gql.SpaceMemberRoleSourceSpace,
		CanChangeRole: false,
		CanRemove:     false,
		CreatedAt:     m.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func mapOrgMemberToSpaceAccess(m *org.OrgMemberView) *gql.SpaceMember {
	return &gql.SpaceMember{
		UserID:        m.UserID,
		Username:      m.Username,
		DisplayName:   m.DisplayName,
		Email:         m.Email,
		AvatarURL:     m.AvatarURL,
		Role:          mapSpaceMemberRole(m.Role),
		RoleSource:    gql.SpaceMemberRoleSourceOrganization,
		CanChangeRole: false,
		CanRemove:     false,
		CreatedAt:     m.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func mergeSpaceMemberProfile(member *space.SpaceMemberView, orgMember *org.OrgMemberView) *space.SpaceMemberView {
	if member == nil || orgMember == nil {
		return member
	}
	merged := *member
	if merged.Username == "" {
		merged.Username = orgMember.Username
	}
	if merged.DisplayName == "" {
		merged.DisplayName = orgMember.DisplayName
	}
	if merged.Email == nil {
		merged.Email = orgMember.Email
	}
	if merged.AvatarURL == nil {
		merged.AvatarURL = orgMember.AvatarURL
	}
	return &merged
}

func (r *Resolver) hydrateOrgMemberProfiles(ctx context.Context, members []*org.OrgMemberView) {
	if r.userStore == nil {
		return
	}
	for _, member := range members {
		if member == nil || member.UserID == "" {
			continue
		}
		userRecord, userErr := r.userStore.GetByID(ctx, member.UserID)
		if userErr != nil {
			r.logger.Warn("failed to hydrate org member profile", zap.String("userID", member.UserID), zap.Error(userErr))
			continue
		}
		if userRecord == nil {
			continue
		}
		member.Email = userRecord.Email
		member.AvatarURL = userRecord.AvatarUrl
	}
}

func (r *Resolver) mapSpaceMemberToGQLWithPermissions(ctx context.Context, space *space.Space, member *space.SpaceMemberView) (*gql.SpaceMember, error) {
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
		if protectedMember, protectErr := r.isProtectedHostSpaceMember(ctx, space, member.UserID); protectErr == nil && protectedMember {
			gqlMember.Role, gqlMember.RoleSource = r.getProtectedSpaceRole(ctx, space, member.UserID)
		}
		return gqlMember, nil
	}
	protectedMember, err := r.isProtectedHostSpaceMember(ctx, space, member.UserID)
	if err != nil {
		return nil, err
	}
	if protectedMember {
		gqlMember.Role, gqlMember.RoleSource = r.getProtectedSpaceRole(ctx, space, member.UserID)
		return gqlMember, nil
	}
	gqlMember.CanChangeRole = true
	gqlMember.CanRemove = true
	return gqlMember, nil
}

func (r *Resolver) getProtectedSpaceRole(ctx context.Context, space *space.Space, userID string) (gql.SpaceMemberRole, gql.SpaceMemberRoleSource) {
	if !r.cloudEnabled() {
		return gql.SpaceMemberRoleMember, gql.SpaceMemberRoleSourceSpace
	}
	members, err := r.orgStore.ListMembers(ctx, space.OrgID)
	if err != nil {
		return gql.SpaceMemberRoleMember, gql.SpaceMemberRoleSourceSpace
	}
	for _, member := range members {
		if member.UserID != userID {
			continue
		}
		switch member.Role {
		case "owner":
			return gql.SpaceMemberRoleOwner, gql.SpaceMemberRoleSourceOrganization
		case "admin":
			return gql.SpaceMemberRoleAdmin, gql.SpaceMemberRoleSourceOrganization
		}
	}
	return gql.SpaceMemberRoleMember, gql.SpaceMemberRoleSourceSpace
}

func mapSpaceInvitationToGQL(invitation *space.Invitation) *gql.SpaceInvitation {
	return &gql.SpaceInvitation{
		ID:        invitation.ID,
		Email:     invitation.Email,
		Role:      gql.SpaceMemberAssignableRole(strings.ToLower(strings.TrimSpace(invitation.Role))),
		CreatedAt: invitation.CreatedAt.UTC().Format(time.RFC3339),
		ExpiresAt: invitation.ExpiresAt.UTC().Format(time.RFC3339),
	}
}

func mapOrgInvitationToGQL(invitation *space.Invitation) *gql.OrgInvitation {
	return &gql.OrgInvitation{
		ID:        invitation.ID,
		Email:     invitation.Email,
		Role:      gql.OrgMemberAssignableRole(strings.ToLower(strings.TrimSpace(invitation.Role))),
		CreatedAt: invitation.CreatedAt.UTC().Format(time.RFC3339),
		ExpiresAt: invitation.ExpiresAt.UTC().Format(time.RFC3339),
	}
}

// getUserOrgID returns the current org ID for the authenticated user.
// For ordinary multi-tenant users, a claimed org_id is validated against the
// current membership row so stale sessions do not retain org access after leave,
// removal, or deletion. Global admin/self-hosted paths keep the claim fast path.
func (r *Resolver) getUserOrgID(ctx context.Context) (string, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return "", err
	}
	if claims.OrgID != "" {
		if claims.Role == "admin" || r.orgStore == nil || !r.cloudEnabled() {
			return claims.OrgID, nil
		}
		org, lookupErr := r.orgStore.GetByUserID(ctx, claims.UserID)
		if lookupErr != nil {
			return "", fmt.Errorf("get org for user: %w", lookupErr)
		}
		if org == nil {
			return "", nil
		}
		return org.ID, nil
	}
	// Fallback: look up via orgStore (self-hosted or legacy token without org_id claim).
	if r.orgStore == nil || !r.cloudEnabled() {
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

func (r *Resolver) requireUserOrgID(ctx context.Context) (string, error) {
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return "", err
	}
	if orgID == "" {
		return "", apperror.BadRequest("organization is required", map[string]interface{}{"reason": "organization_required"})
	}
	return orgID, nil
}

func (r *Resolver) canReadSpace(ctx context.Context, space *space.Space) (bool, error) {
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return false, err
	}
	sameOrg := orgID != "" && space.OrgID == orgID
	if sameOrg {
		return true, nil
	}
	if !r.cloudEnabled() {
		return false, nil
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if r.registryStore != nil {
		publicAccess, registryErr := r.registryStore.Get(ctx, registrystore.SpaceOwnerID(space.ID), "config.allow_guest_mode")
		if registryErr != nil {
			return false, fmt.Errorf("failed to check space public access: %w", registryErr)
		}
		if publicAccess != nil && publicAccess.Value == "true" {
			return true, nil
		}
	}
	return r.spaceStore.HasMember(ctx, space.ID, claims.UserID)
}

func normalizeSpaceStorageType(storageType string) string {
	return strings.TrimSpace(strings.ToLower(storageType))
}

func inferStorageMode(storageMode, storageType string) string {
	normalizedMode := strings.TrimSpace(storageMode)
	if normalizedMode != "" {
		return space.NormalizeStorageMode(normalizedMode)
	}

	switch normalizeSpaceStorageType(storageType) {
	case "managed":
		return space.StorageModePlatform
	case "s3", "r2":
		return space.StorageModeBYOB
	default:
		return space.StorageModePlatform
	}
}

func validateSpaceStorageConfig(sp *space.Space) error {
	storageType := normalizeSpaceStorageType(sp.StorageType)
	storageMode := inferStorageMode(sp.StorageMode, storageType)

	sp.StorageMode = storageMode
	sp.StorageType = storageType

	switch storageMode {
	case space.StorageModePlatform:
		if sp.StorageType == "" {
			sp.StorageType = "managed"
		}
		if sp.StorageType != "managed" {
			return fmt.Errorf("platform storage requires storageType \"managed\"")
		}
		if strings.TrimSpace(sp.Bucket) != "" || strings.TrimSpace(sp.Prefix) != "" || strings.TrimSpace(sp.Region) != "" || strings.TrimSpace(sp.Endpoint) != "" || strings.TrimSpace(sp.AccessKeyID) != "" || strings.TrimSpace(sp.SecretKey) != "" || sp.UsePathStyle {
			return fmt.Errorf("platform storage does not allow custom bucket, prefix, endpoint, or credential fields")
		}
	case space.StorageModeBYOB:
		if sp.StorageType != "s3" && sp.StorageType != "r2" {
			return fmt.Errorf("byob storage requires storageType \"s3\" or \"r2\"")
		}
		if strings.TrimSpace(sp.Bucket) == "" {
			return fmt.Errorf("byob storage requires bucket")
		}
		if strings.TrimSpace(sp.Region) == "" {
			return fmt.Errorf("byob storage requires region")
		}
	default:
		return fmt.Errorf("invalid storage mode %q", sp.StorageMode)
	}

	return nil
}

// applySpaceInput applies a SpaceInput onto a Space struct.
// Nil-pointer fields in SpaceInput are skipped (keep existing value).
func applySpaceInput(sp *space.Space, input gql.SpaceInput) error {
	sp.Key = input.Key
	sp.Name = input.Name
	if input.StorageMode != nil {
		storageMode := space.NormalizeStorageMode(*input.StorageMode)
		if !space.IsValidStorageMode(storageMode) {
			return fmt.Errorf("invalid storage mode %q", *input.StorageMode)
		}
		sp.StorageMode = storageMode
	}
	if input.StorageType != nil {
		sp.StorageType = normalizeSpaceStorageType(*input.StorageType)
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
		nextCustomDomain := normalizeCustomDomain(*input.CustomDomain)
		if normalizeCustomDomain(sp.CustomDomain) != nextCustomDomain {
			sp.CustomDomainVerified = false
		}
		sp.CustomDomain = nextCustomDomain
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
	if input.ImagorCORSOrigins != nil {
		sp.ImagorCORSOrigins = strings.TrimSpace(*input.ImagorCORSOrigins)
	}
	return validateSpaceStorageConfig(sp)
}

func normalizeCustomDomain(domain string) string {
	trimmed := strings.TrimSpace(strings.ToLower(domain))
	return strings.TrimSuffix(trimmed, ".")
}

func (r *mutationResolver) enforceCustomDomainQuota(ctx context.Context, orgID string, before, after *space.Space) error {
	if r.orgStore == nil || r.spaceStore == nil || after == nil {
		return nil
	}

	previousDomain := ""
	if before != nil {
		previousDomain = normalizeCustomDomain(before.CustomDomain)
	}
	nextDomain := normalizeCustomDomain(after.CustomDomain)
	if nextDomain == "" || nextDomain == previousDomain {
		return nil
	}

	orgRecord, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to load organization plan: %w", err)
	}
	if orgRecord == nil {
		return fmt.Errorf("organization %q not found", orgID)
	}

	entitlements := billing.EntitlementsForPlan(orgRecord.Plan)
	if entitlements.MaxCustomDomains < 0 {
		return nil
	}

	spaces, err := r.spaceStore.ListByOrgID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to list organization spaces: %w", err)
	}

	count := 0
	for _, existingSpace := range spaces {
		if existingSpace == nil || normalizeCustomDomain(existingSpace.CustomDomain) == "" {
			continue
		}
		if before != nil && existingSpace.ID == before.ID {
			continue
		}
		count++
	}
	if count < entitlements.MaxCustomDomains {
		return nil
	}

	return apperror.BadRequest(
		fmt.Sprintf("custom domain limit (%d) reached for plan %q", entitlements.MaxCustomDomains, orgRecord.Plan),
		map[string]interface{}{"reason": "custom_domain_limit_reached"},
	)
}

func (r *mutationResolver) enforceSpaceQuota(ctx context.Context, orgID string) error {
	if r.orgStore == nil || r.spaceStore == nil || orgID == "" {
		return nil
	}

	orgRecord, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to load organization plan: %w", err)
	}
	if orgRecord == nil {
		return fmt.Errorf("organization %q not found", orgID)
	}

	entitlements := billing.EntitlementsForPlan(orgRecord.Plan)
	if entitlements.MaxSpaces < 0 {
		return nil
	}

	spaces, err := r.spaceStore.ListByOrgID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to list organization spaces: %w", err)
	}
	if len(spaces) < entitlements.MaxSpaces {
		return nil
	}

	return apperror.BadRequest(
		fmt.Sprintf("space limit (%d) reached for plan %q", entitlements.MaxSpaces, orgRecord.Plan),
		map[string]interface{}{"reason": "space_limit_reached"},
	)
}

// ---------- Query resolvers --------------------------------------------------

// MyOrganization returns the organization for the currently authenticated user.
func (r *queryResolver) MyOrganization(ctx context.Context) (*gql.Organization, error) {
	if !r.cloudEnabled() || r.orgStore == nil {
		return nil, nil
	}
	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if orgID == "" {
		return nil, nil
	}
	org, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		r.logger.Error("MyOrganization: failed to get org", zap.String("orgID", orgID), zap.Error(err))
		return nil, fmt.Errorf("failed to retrieve organization: %w", err)
	}
	if org == nil {
		return nil, nil
	}
	result := mapOrgToGQL(org)
	role, roleErr := r.getCurrentOrganizationRole(ctx, orgID)
	if roleErr != nil {
		return nil, roleErr
	}
	result.CurrentUserRole = mapOrgMemberRole(role)
	return result, nil
}

func (r *queryResolver) UsageSummary(ctx context.Context) (*gql.UsageSummary, error) {
	if !r.cloudEnabled() || r.orgStore == nil || r.spaceStore == nil {
		return &gql.UsageSummary{UsedSpaces: 0, Spaces: []*gql.SpaceUsage{}}, nil
	}

	orgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if orgID == "" {
		return &gql.UsageSummary{UsedSpaces: 0, Spaces: []*gql.SpaceUsage{}}, nil
	}

	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		r.logger.Error("UsageSummary: failed to get org", zap.String("orgID", orgID), zap.Error(err))
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}
	if currentOrg == nil {
		return &gql.UsageSummary{UsedSpaces: 0, Spaces: []*gql.SpaceUsage{}}, nil
	}

	orgSpaces, err := r.spaceStore.ListByOrgID(ctx, orgID)
	if err != nil {
		r.logger.Error("UsageSummary: failed to list spaces", zap.String("orgID", orgID), zap.Error(err))
		return nil, fmt.Errorf("failed to list spaces: %w", err)
	}

	spacesByKey := make(map[string]*space.Space, len(orgSpaces))
	for _, s := range orgSpaces {
		spacesByKey[s.Key] = s
	}

	hostedUsageBySpaceID := r.listHostedUsageBySpaceID(ctx, orgID, spacesByKey)
	processingSummary := r.getCurrentProcessingUsageSummary(ctx, orgID)
	entitlements := billing.EntitlementsForPlan(currentOrg.Plan)

	totalHostedUsageBytes := int64(0)
	for _, usageBytes := range hostedUsageBySpaceID {
		totalHostedUsageBytes += usageBytes
	}

	spaceUsage := make([]*gql.SpaceUsage, 0, len(orgSpaces))
	for _, s := range orgSpaces {
		spaceUsage = append(spaceUsage, r.mapSpaceToUsageSummary(s, hostedUsageBySpaceID, processingSummary.ProcessedCountBySpace))
	}
	sort.Slice(spaceUsage, func(i, j int) bool {
		return spaceUsage[i].Key < spaceUsage[j].Key
	})

	result := &gql.UsageSummary{
		UsedSpaces:             len(orgSpaces),
		UsedHostedStorageBytes: r.toGraphQLIntPtr(totalHostedUsageBytes, "hosted storage total exceeds GraphQL int range", zap.String("orgID", orgID), zap.Int64("usageBytes", totalHostedUsageBytes)),
		UsedTransforms:         r.toGraphQLIntPtr(processingSummary.TotalProcessedCount, "processing usage total exceeds GraphQL int range", zap.String("orgID", orgID), zap.Int64("processedCount", processingSummary.TotalProcessedCount)),
		Spaces:                 spaceUsage,
	}
	if entitlements.MaxSpaces >= 0 {
		result.MaxSpaces = &entitlements.MaxSpaces
	}
	if entitlements.StorageLimitGB >= 0 {
		result.StorageLimitGb = r.toGraphQLIntPtr(entitlements.StorageLimitGB, "storage limit exceeds GraphQL int range", zap.String("orgID", orgID), zap.Int64("storageLimitGB", entitlements.StorageLimitGB))
	}
	if entitlements.TransformsLimit >= 0 {
		result.TransformsLimit = r.toGraphQLIntPtr(entitlements.TransformsLimit, "transforms limit exceeds GraphQL int range", zap.String("orgID", orgID), zap.Int64("transformsLimit", entitlements.TransformsLimit))
	}
	if !processingSummary.PeriodStart.IsZero() {
		periodStart := processingSummary.PeriodStart.UTC().Format(time.RFC3339)
		result.PeriodStart = &periodStart
	}
	if !processingSummary.PeriodEnd.IsZero() {
		periodEnd := processingSummary.PeriodEnd.UTC().Format(time.RFC3339)
		result.PeriodEnd = &periodEnd
	}

	return result, nil
}

// Spaces returns all active spaces for the authenticated user's organization.
func (r *queryResolver) Spaces(ctx context.Context) ([]*gql.Space, error) {
	if !r.cloudEnabled() {
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

	spacesByKey := map[string]*space.Space{}
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

	hostedUsageBySpaceID := r.listHostedUsageBySpaceID(ctx, orgID, spacesByKey)
	processingSummary := r.getCurrentProcessingUsageSummary(ctx, orgID)

	result := make([]*gql.Space, 0, len(spacesByKey))
	for _, s := range spacesByKey {
		allowed, allowErr := r.canReadSpace(ctx, s)
		if allowErr != nil {
			return nil, allowErr
		}
		if !allowed {
			continue
		}
		mapped, mapErr := r.mapSpaceToGQLWithPermissionsOnly(ctx, s)
		if mapErr != nil {
			return nil, mapErr
		}
		if usageBytes, ok := hostedUsageBySpaceID[s.ID]; ok {
			r.applyHostedStorageUsage(mapped, usageBytes, s.ID)
		}
		if processedCount, ok := processingSummary.ProcessedCountBySpace[s.ID]; ok && orgID != "" && s.OrgID == orgID {
			r.applyProcessingUsage(mapped, processedCount, s.ID)
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
	if !r.cloudEnabled() {
		if err := RequireAdminPermission(ctx); err != nil {
			return false, err
		}
		return false, nil
	}
	if _, _, err := r.requireOrganizationAdminPermission(ctx); err != nil {
		return false, err
	}
	return r.spaceStore.KeyExists(ctx, key)
}

// Space returns a single space by key, scoped to the authenticated user's org.
func (r *queryResolver) Space(ctx context.Context, key string) (*gql.Space, error) {
	if !r.cloudEnabled() {
		return nil, nil
	}
	s, err := r.spaceStore.GetByKey(ctx, key)
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
		return nil, &gqlerror.Error{
			Message:    "forbidden: you do not have access to this space",
			Extensions: map[string]interface{}{"code": "FORBIDDEN"},
		}
	}
	return r.mapSpaceToGQLWithPermissions(ctx, s)
}

// ---------- Mutation resolvers -----------------------------------------------

func mapBillingSessionToGQL(session *billing.Session) *gql.BillingSession {
	return &gql.BillingSession{URL: session.URL}
}

func validateBillablePlan(plan string) error {
	plan = strings.TrimSpace(plan)
	if _, ok := billablePlans[plan]; !ok {
		return apperror.BadRequest("unsupported billing plan", map[string]interface{}{"reason": "unsupported_billing_plan"})
	}
	return nil
}

func validateBillingRedirectURL(rawURL string, reason string) error {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed == nil || parsed.Scheme == "" || parsed.Host == "" {
		return apperror.BadRequest("billing redirect URL must be an absolute http or https URL", map[string]interface{}{"reason": reason})
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return nil
	default:
		return apperror.BadRequest("billing redirect URL must be an absolute http or https URL", map[string]interface{}{"reason": reason})
	}
}

func (r *mutationResolver) CreateCheckoutSession(ctx context.Context, plan string, successURL string, cancelURL string) (*gql.BillingSession, error) {
	if !r.cloudEnabled() || r.orgStore == nil {
		return nil, apperror.BadRequest("billing is not available in this deployment", map[string]interface{}{"reason": "billing_unavailable"})
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}
	if r.billingService == nil {
		return nil, apperror.BadRequest("billing is not configured", map[string]interface{}{"reason": "billing_unavailable"})
	}
	if err := validateBillablePlan(plan); err != nil {
		return nil, err
	}
	if strings.TrimSpace(successURL) == "" || strings.TrimSpace(cancelURL) == "" {
		return nil, apperror.BadRequest("success and cancel URLs are required", map[string]interface{}{"reason": "billing_redirect_urls_required"})
	}
	if err := validateBillingRedirectURL(successURL, "billing_redirect_url_invalid"); err != nil {
		return nil, err
	}
	if err := validateBillingRedirectURL(cancelURL, "billing_redirect_url_invalid"); err != nil {
		return nil, err
	}
	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		r.logger.Error("CreateCheckoutSession: failed to load organization", zap.String("orgID", orgID), zap.Error(err))
		return nil, apperror.InternalServerError("failed to load organization")
	}
	if currentOrg == nil {
		return nil, apperror.BadRequest("organization not found", map[string]interface{}{"reason": "organization_required"})
	}
	isPaidPlan := currentOrg.Plan == org.PlanStarter || currentOrg.Plan == org.PlanPro || currentOrg.Plan == org.PlanTeam
	isPortalManagedStatus := currentOrg.PlanStatus == org.PlanStatusActive || currentOrg.PlanStatus == org.PlanStatusTrialing || currentOrg.PlanStatus == org.PlanStatusPastDue
	if isPaidPlan && isPortalManagedStatus {
		return nil, apperror.BadRequest("existing paid subscriptions must use the billing portal", map[string]interface{}{"reason": "billing_checkout_requires_portal"})
	}
	session, err := r.billingService.CreateCheckoutSession(ctx, billing.CheckoutSessionInput{
		OrgID:      orgID,
		Plan:       strings.TrimSpace(plan),
		SuccessURL: strings.TrimSpace(successURL),
		CancelURL:  strings.TrimSpace(cancelURL),
	})
	if err != nil {
		r.logger.Error("CreateCheckoutSession: billing provider failed",
			zap.String("orgID", orgID),
			zap.String("plan", strings.TrimSpace(plan)),
			zap.Error(err),
		)
		return nil, apperror.InternalServerError("checkout is temporarily unavailable")
	}
	if session == nil || strings.TrimSpace(session.URL) == "" {
		return nil, fmt.Errorf("billing service returned an empty checkout session")
	}
	return mapBillingSessionToGQL(session), nil
}

func (r *mutationResolver) CreateBillingPortalSession(ctx context.Context, returnURL string) (*gql.BillingSession, error) {
	if !r.cloudEnabled() || r.orgStore == nil {
		return nil, apperror.BadRequest("billing is not available in this deployment", map[string]interface{}{"reason": "billing_unavailable"})
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}
	if r.billingService == nil {
		return nil, apperror.BadRequest("billing is not configured", map[string]interface{}{"reason": "billing_unavailable"})
	}
	if strings.TrimSpace(returnURL) == "" {
		return nil, apperror.BadRequest("return URL is required", map[string]interface{}{"reason": "billing_return_url_required"})
	}
	if err := validateBillingRedirectURL(returnURL, "billing_return_url_invalid"); err != nil {
		return nil, err
	}
	session, err := r.billingService.CreatePortalSession(ctx, billing.PortalSessionInput{
		OrgID:     orgID,
		ReturnURL: strings.TrimSpace(returnURL),
	})
	if err != nil {
		r.logger.Error("CreateBillingPortalSession: billing provider failed",
			zap.String("orgID", orgID),
			zap.Error(err),
		)
		return nil, apperror.InternalServerError("billing portal is temporarily unavailable")
	}
	if session == nil || strings.TrimSpace(session.URL) == "" {
		return nil, fmt.Errorf("billing service returned an empty portal session")
	}
	return mapBillingSessionToGQL(session), nil
}

// CreateOrganization provisions a personal organization for the current user when none exists yet.
func (r *mutationResolver) CreateOrganization(ctx context.Context) (*gql.Organization, error) {
	if !r.cloudEnabled() {
		return nil, fmt.Errorf("organization management is not available in this deployment")
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	existingOrgID, err := r.getUserOrgID(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to check organization membership: %w", err)
	}
	if existingOrgID != "" {
		return nil, apperror.Conflict("organization already exists for this account", "organization")
	}
	user, err := r.userStore.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to load user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}
	orgName := strings.TrimSpace(user.DisplayName)
	if orgName == "" {
		orgName = strings.TrimSpace(user.Username)
	}
	trialEndsAt := time.Now().UTC().Add(14 * 24 * time.Hour)
	createdOrg, err := r.orgStore.CreateWithMember(ctx, user.ID, orgName, user.Username, &trialEndsAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create organization: %w", err)
	}
	if createdOrg == nil {
		return nil, fmt.Errorf("organization was not created")
	}
	result := mapOrgToGQL(createdOrg)
	result.CurrentUserRole = gql.OrgMemberRoleOwner
	return result, nil
}

// CreateSpace creates a new space (admin only).
func (r *mutationResolver) CreateSpace(ctx context.Context, input gql.SpaceInput) (*gql.Space, error) {
	if r.spaceStore == nil {
		return nil, fmt.Errorf("space management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}

	sp := &space.Space{OrgID: orgID}
	if err := applySpaceInput(sp, input); err != nil {
		return nil, err
	}
	if err := r.enforceCustomDomainQuota(ctx, orgID, nil, sp); err != nil {
		return nil, err
	}
	if sp.StorageMode == space.StorageModeBYOB && sp.StorageType == "s3" {
		testResult := r.validateStorageConfig(ctx, storageConfigInputFromSpace(sp))
		if !testResult.Success {
			if testResult.Details != nil {
				return nil, fmt.Errorf("invalid BYOB storage configuration: %s: %s", testResult.Message, *testResult.Details)
			}
			return nil, fmt.Errorf("invalid BYOB storage configuration: %s", testResult.Message)
		}
	}
	if err := r.enforceSpaceQuota(ctx, orgID); err != nil {
		return nil, err
	}

	if err := r.spaceStore.Create(ctx, sp); err != nil {
		r.logger.Error("CreateSpace: failed to create", zap.String("key", input.Key), zap.Error(err))
		return nil, err
	}

	created, err := r.spaceStore.GetByKey(ctx, input.Key)
	if err != nil || created == nil {
		r.logger.Error("CreateSpace: failed to fetch after upsert", zap.String("key", input.Key), zap.Error(err))
		return nil, fmt.Errorf("space created but could not be retrieved")
	}

	claims, claimsErr := auth.GetClaimsFromContext(ctx)
	if claimsErr == nil {
		memberRoles := map[string]string{claims.UserID: "admin"}
		if r.cloudEnabled() {
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
			if err := r.spaceStore.AddMember(ctx, created.ID, userID, role); err != nil {
				return nil, fmt.Errorf("space created but failed to seed members: %w", err)
			}
		}
	}
	r.logger.Info("Space created", zap.String("key", input.Key), zap.String("orgID", orgID))
	return r.mapSpaceToGQLWithPermissions(ctx, created)
}

// UpdateSpace updates an existing space by key (space manager).
// Nil fields in the input are ignored — they preserve the existing value.
func (r *mutationResolver) UpdateSpace(ctx context.Context, key string, input gql.SpaceInput) (*gql.Space, error) {
	if !r.cloudEnabled() {
		return nil, fmt.Errorf("space management is not available in this deployment")
	}

	// Load existing space so we can apply partial updates.
	existing, err := r.spaceStore.GetByKey(ctx, key)
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
		return nil, apperror.Forbidden("space manager access required")
	}
	original := *existing
	candidate := *existing
	if err := applySpaceInput(&candidate, input); err != nil {
		return nil, err
	}
	if err := r.enforceCustomDomainQuota(ctx, existing.OrgID, &original, &candidate); err != nil {
		return nil, err
	}
	if shouldValidateUpdatedByobStorage(&original, &candidate, input) {
		testResult := r.validateStorageConfig(ctx, storageConfigInputFromSpace(&candidate))
		if !testResult.Success {
			if testResult.Details != nil {
				return nil, fmt.Errorf("invalid BYOB storage configuration: %s: %s", testResult.Message, *testResult.Details)
			}
			return nil, fmt.Errorf("invalid BYOB storage configuration: %s", testResult.Message)
		}
	}
	oldKey := existing.Key
	newKey := strings.TrimSpace(candidate.Key)
	keyChanged := newKey != "" && newKey != oldKey
	if keyChanged {
		if err := r.spaceStore.RenameKey(ctx, oldKey, newKey); err != nil {
			return nil, err
		}
	}

	*existing = candidate

	if err := r.spaceStore.Upsert(ctx, existing); err != nil {
		r.logger.Error("UpdateSpace: upsert failed", zap.String("key", key), zap.Error(err))
		return nil, fmt.Errorf("failed to update space: %w", err)
	}

	updated, err := r.spaceStore.GetByKey(ctx, input.Key)
	if err != nil || updated == nil {
		return nil, fmt.Errorf("space updated but could not be retrieved")
	}
	r.logger.Info("Space updated", zap.String("key", key))
	return r.mapSpaceToGQLWithPermissions(ctx, updated)
}

func shouldValidateUpdatedByobStorage(before, after *space.Space, input gql.SpaceInput) bool {
	if after == nil {
		return false
	}
	afterMode := inferStorageMode(after.StorageMode, after.StorageType)
	afterType := normalizeSpaceStorageType(after.StorageType)
	if afterMode != space.StorageModeBYOB || afterType != "s3" {
		return false
	}
	if before == nil {
		return true
	}
	beforeMode := inferStorageMode(before.StorageMode, before.StorageType)
	beforeType := normalizeSpaceStorageType(before.StorageType)
	if beforeMode != space.StorageModeBYOB || beforeType != "s3" {
		return true
	}

	return input.StorageMode != nil ||
		input.StorageType != nil ||
		input.Bucket != nil ||
		input.Prefix != nil ||
		input.Region != nil ||
		input.Endpoint != nil ||
		input.AccessKeyID != nil ||
		input.SecretKey != nil ||
		input.UsePathStyle != nil
}

// DeleteSpace soft-deletes a space by key (owning organization admins only).
func (r *mutationResolver) DeleteSpace(ctx context.Context, key string) (bool, error) {
	if !r.cloudEnabled() {
		return false, fmt.Errorf("space management is not available in this deployment")
	}

	// Verify ownership before deleting.
	existing, err := r.spaceStore.GetByKey(ctx, key)
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
		return false, apperror.Forbidden("only the owning organization admins can delete this space")
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
func mapMemberToGQL(m *org.OrgMemberView) *gql.OrgMember {
	return &gql.OrgMember{
		UserID:      m.UserID,
		Username:    m.Username,
		DisplayName: m.DisplayName,
		Email:       m.Email,
		AvatarURL:   m.AvatarURL,
		Role:        mapOrgMemberRole(m.Role),
		CreatedAt:   m.CreatedAt.UTC().Format(time.RFC3339),
	}
}

// SpaceMembers lists all members who can access a space (space manager).
func (r *queryResolver) SpaceMembers(ctx context.Context, spaceID string) ([]*gql.SpaceMember, error) {
	if !r.cloudEnabled() {
		return []*gql.SpaceMember{}, nil
	}
	spaceRecord, err := r.spaceStore.GetByID(ctx, spaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if spaceRecord == nil {
		return []*gql.SpaceMember{}, nil
	}
	permissions, err := r.getSpacePermissions(ctx, spaceRecord)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, apperror.Forbidden("space manager access required")
	}
	orgMembers, err := r.orgStore.ListMembers(ctx, spaceRecord.OrgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list organization members: %w", err)
	}
	r.hydrateOrgMemberProfiles(ctx, orgMembers)

	members, err := r.spaceStore.ListMembers(ctx, spaceRecord.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list space members: %w", err)
	}
	explicitMembersByUserID := make(map[string]*space.SpaceMemberView, len(members))
	for _, member := range members {
		if member == nil || member.UserID == "" {
			continue
		}
		explicitMembersByUserID[member.UserID] = member
	}

	result := make([]*gql.SpaceMember, 0, len(orgMembers)+len(members))
	for _, member := range orgMembers {
		if member == nil || member.UserID == "" {
			continue
		}
		explicitMember, hasExplicitAccess := explicitMembersByUserID[member.UserID]
		if !hasExplicitAccess {
			result = append(result, mapOrgMemberToSpaceAccess(member))
			continue
		}

		// Same-org explicit member rows only matter when they override the baseline org access.
		if member.Role != "owner" && member.Role != "admin" && explicitMember.Role == "admin" {
			mapped, mapErr := r.mapSpaceMemberToGQLWithPermissions(ctx, spaceRecord, mergeSpaceMemberProfile(explicitMember, member))
			if mapErr != nil {
				return nil, mapErr
			}
			result = append(result, mapped)
		} else {
			result = append(result, mapOrgMemberToSpaceAccess(member))
		}
		delete(explicitMembersByUserID, member.UserID)
	}

	for _, member := range members {
		if member == nil || member.UserID == "" {
			continue
		}
		if _, stillExplicit := explicitMembersByUserID[member.UserID]; !stillExplicit {
			continue
		}
		mapped, mapErr := r.mapSpaceMemberToGQLWithPermissions(ctx, spaceRecord, member)
		if mapErr != nil {
			return nil, mapErr
		}
		result = append(result, mapped)
	}
	return result, nil
}

func (r *queryResolver) SpaceInvitations(ctx context.Context, spaceID string) ([]*gql.SpaceInvitation, error) {
	if !r.cloudEnabled() || r.spaceInviteStore == nil {
		return []*gql.SpaceInvitation{}, nil
	}
	space, err := r.spaceStore.GetByID(ctx, spaceID)
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
		return nil, apperror.Forbidden("space manager access required")
	}
	invitations, err := r.spaceInviteStore.ListPendingBySpace(ctx, space.OrgID, space.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list space invitations: %w", err)
	}
	result := make([]*gql.SpaceInvitation, 0, len(invitations))
	for _, invitation := range invitations {
		result = append(result, mapSpaceInvitationToGQL(invitation))
	}
	return result, nil
}

func (r *queryResolver) OrgInvitations(ctx context.Context) ([]*gql.OrgInvitation, error) {
	if !r.cloudEnabled() || r.spaceInviteStore == nil {
		return []*gql.OrgInvitation{}, nil
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}
	invitations, err := r.spaceInviteStore.ListPendingByOrg(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list organization invitations: %w", err)
	}
	result := make([]*gql.OrgInvitation, 0, len(invitations))
	for _, invitation := range invitations {
		result = append(result, mapOrgInvitationToGQL(invitation))
	}
	return result, nil
}

// OrgMembers lists all members of the caller's organization.
func (r *queryResolver) OrgMembers(ctx context.Context) ([]*gql.OrgMember, error) {
	if !r.cloudEnabled() {
		return []*gql.OrgMember{}, nil
	}
	orgID, err := r.requireUserOrgID(ctx)
	if err != nil {
		return nil, err
	}
	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		r.logger.Error("OrgMembers: failed to list members", zap.String("orgID", orgID), zap.Error(err))
		return nil, fmt.Errorf("failed to list org members: %w", err)
	}
	if r.userStore != nil {
		for _, member := range members {
			if member == nil || member.UserID == "" {
				continue
			}
			userRecord, userErr := r.userStore.GetByID(ctx, member.UserID)
			if userErr != nil {
				r.logger.Warn("OrgMembers: failed to hydrate member profile", zap.String("orgID", orgID), zap.String("userID", member.UserID), zap.Error(userErr))
				continue
			}
			if userRecord == nil {
				continue
			}
			member.Email = userRecord.Email
			member.AvatarURL = userRecord.AvatarUrl
		}
	}
	result := make([]*gql.OrgMember, 0, len(members))
	for _, m := range members {
		result = append(result, mapMemberToGQL(m))
	}
	return result, nil
}

func (r *mutationResolver) ensureUserCanJoinOrganization(ctx context.Context, orgID, userID string) error {
	currentOrg, err := r.orgStore.GetByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to verify existing organization membership: %w", err)
	}
	if currentOrg != nil && currentOrg.ID != orgID {
		return apperror.BadRequest("user already belongs to another organization", map[string]interface{}{"reason": "org_member_other_organization"})
	}

	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to verify org membership: %w", err)
	}
	for _, member := range members {
		if member.UserID == userID {
			return apperror.BadRequest("user is already a member of your organization", map[string]interface{}{"reason": "org_member_already_member"})
		}
	}

	return nil
}

// AddOrgMember adds a user (found by username) to the caller's org (admin only).
func (r *mutationResolver) AddOrgMember(ctx context.Context, username string, role gql.OrgMemberAssignableRole) (*gql.OrgMember, error) {
	if !r.cloudEnabled() || r.userStore == nil {
		return nil, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}

	// Look up user by username.
	user, err := r.userStore.GetByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to look up user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user %q not found", username)
	}

	if err := r.ensureUserCanJoinOrganization(ctx, orgID, user.ID); err != nil {
		return nil, err
	}

	roleValue := role.String()
	if err := r.orgStore.AddMember(ctx, orgID, user.ID, roleValue); err != nil {
		r.logger.Error("AddOrgMember: failed", zap.String("orgID", orgID), zap.String("userID", user.ID), zap.Error(err))
		return nil, fmt.Errorf("failed to add member: %w", err)
	}
	r.logger.Info("OrgMember added", zap.String("orgID", orgID), zap.String("username", username), zap.String("role", roleValue))

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
		Role:     mapOrgMemberRole(roleValue),
	}, nil
}

// AddOrgMemberByEmail adds an existing user (found by email) to the caller's org (admin only).
func (r *mutationResolver) AddOrgMemberByEmail(ctx context.Context, email string, role gql.OrgMemberAssignableRole) (*gql.OrgMember, error) {
	if !r.cloudEnabled() || r.userStore == nil {
		return nil, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
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

	if err := r.ensureUserCanJoinOrganization(ctx, orgID, user.ID); err != nil {
		return nil, err
	}

	roleValue := role.String()
	if err := r.orgStore.AddMember(ctx, orgID, user.ID, roleValue); err != nil {
		r.logger.Error("AddOrgMemberByEmail: failed", zap.String("orgID", orgID), zap.String("userID", user.ID), zap.Error(err))
		return nil, fmt.Errorf("failed to add member: %w", err)
	}
	r.logger.Info("OrgMember added by email", zap.String("orgID", orgID), zap.String("email", normalizedEmail), zap.String("role", roleValue))

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
		Role:        mapOrgMemberRole(roleValue),
	}, nil
}

func (r *mutationResolver) InviteOrgMember(ctx context.Context, email string, role gql.OrgMemberAssignableRole) (*gql.OrgInviteResult, error) {
	if !r.cloudEnabled() || r.userStore == nil {
		return nil, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return nil, fmt.Errorf("email is required")
	}

	roleValue := strings.ToLower(strings.TrimSpace(role.String()))
	if roleValue != "admin" && roleValue != "member" {
		return nil, apperror.BadRequest("organization member role must be admin or member", map[string]interface{}{"reason": "org_member_invalid_role"})
	}

	existingUser, err := r.userStore.GetByEmail(ctx, normalizedEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to look up user by email: %w", err)
	}
	if existingUser != nil {
		if err := r.ensureUserCanJoinOrganization(ctx, orgID, existingUser.ID); err != nil {
			return nil, err
		}
		if err := r.orgStore.AddMember(ctx, orgID, existingUser.ID, roleValue); err != nil {
			r.logger.Error("InviteOrgMember: add existing member failed", zap.String("orgID", orgID), zap.String("userID", existingUser.ID), zap.Error(err))
			return nil, fmt.Errorf("failed to add member: %w", err)
		}

		memberList, listErr := r.orgStore.ListMembers(ctx, orgID)
		if listErr == nil {
			for _, member := range memberList {
				if member.UserID == existingUser.ID {
					return &gql.OrgInviteResult{Status: "added", Member: mapMemberToGQL(member)}, nil
				}
			}
		}

		return &gql.OrgInviteResult{
			Status: "added",
			Member: &gql.OrgMember{
				UserID:      existingUser.ID,
				Username:    existingUser.Username,
				DisplayName: existingUser.DisplayName,
				Email:       existingUser.Email,
				AvatarURL:   existingUser.AvatarUrl,
				Role:        mapOrgMemberRole(roleValue),
			},
		}, nil
	}

	if !r.inviteEnabled() {
		return nil, fmt.Errorf("email invitations are not configured")
	}
	if r.spaceInviteStore == nil || r.inviteSender == nil {
		return nil, fmt.Errorf("email invitations are not configured")
	}

	claims, claimsErr := auth.GetClaimsFromContext(ctx)
	if claimsErr != nil {
		return nil, claimsErr
	}
	invitation, err := r.spaceInviteStore.CreateOrRefreshPending(ctx, orgID, "", normalizedEmail, roleValue, claims.UserID, time.Now().UTC().Add(7*24*time.Hour))
	if err != nil {
		return nil, fmt.Errorf("failed to create organization invitation: %w", err)
	}

	orgName := "your organization"
	currentOrg, orgErr := r.orgStore.GetByID(ctx, orgID)
	if orgErr == nil && currentOrg != nil && currentOrg.Name != "" {
		orgName = currentOrg.Name
	}
	if err := r.inviteSender.SendOrganizationInvitation(ctx, space.EmailParams{
		ToEmail:     normalizedEmail,
		OrgName:     orgName,
		InviteToken: invitation.Token,
		Role:        roleValue,
	}); err != nil {
		return nil, fmt.Errorf("failed to send organization invitation email: %w", err)
	}

	return &gql.OrgInviteResult{Status: "invited", Invitation: mapOrgInvitationToGQL(invitation)}, nil
}

func (r *mutationResolver) CancelOrgInvitation(ctx context.Context, invitationID string) (bool, error) {
	if !r.cloudEnabled() || r.spaceInviteStore == nil {
		return false, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return false, err
	}
	invitations, err := r.spaceInviteStore.ListPendingByOrg(ctx, orgID)
	if err != nil {
		return false, fmt.Errorf("failed to list organization invitations: %w", err)
	}
	for _, invitation := range invitations {
		if invitation == nil || invitation.ID != invitationID {
			continue
		}
		if err := r.spaceInviteStore.DeletePending(ctx, invitationID); err != nil {
			return false, fmt.Errorf("failed to cancel organization invitation: %w", err)
		}
		return true, nil
	}
	return false, apperror.BadRequest("organization invitation not found", map[string]interface{}{"reason": "org_invitation_not_found"})
}

// RemoveOrgMember removes a member from the caller's org (admin only).
func (r *mutationResolver) RemoveOrgMember(ctx context.Context, userID string) (bool, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if claims.UserID == userID {
		return false, apperror.BadRequest("you cannot remove yourself from the organization", map[string]interface{}{"reason": "org_member_remove_self"})
	}
	if !r.cloudEnabled() {
		return false, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return false, err
	}

	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return false, fmt.Errorf("failed to load organization: %w", err)
	}
	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return false, fmt.Errorf("failed to verify org membership: %w", err)
	}

	isOwner := currentOrg != nil && currentOrg.OwnerID == userID
	isMember := false
	for _, member := range members {
		if member.UserID != userID {
			continue
		}
		isMember = true
		if member.Role == "owner" {
			isOwner = true
		}
		break
	}
	if isOwner {
		return false, apperror.BadRequest("you cannot remove the organization owner", map[string]interface{}{"reason": "org_member_remove_owner"})
	}
	if isMember && len(members) <= 1 {
		return false, apperror.BadRequest("you cannot remove the last organization member", map[string]interface{}{"reason": "org_member_remove_last_member"})
	}

	if err := r.orgStore.RemoveMember(ctx, orgID, userID); err != nil {
		r.logger.Error("RemoveOrgMember: failed", zap.String("orgID", orgID), zap.String("userID", userID), zap.Error(err))
		return false, fmt.Errorf("failed to remove member: %w", err)
	}
	r.logger.Info("OrgMember removed", zap.String("orgID", orgID), zap.String("userID", userID))
	return true, nil
}

// LeaveOrganization removes the caller from their current organization when safe.
func (r *mutationResolver) LeaveOrganization(ctx context.Context) (bool, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if !r.cloudEnabled() {
		return false, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, err := r.requireUserOrgID(ctx)
	if err != nil {
		return false, err
	}

	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return false, fmt.Errorf("failed to load organization: %w", err)
	}
	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return false, fmt.Errorf("failed to verify org membership: %w", err)
	}

	callerIsOwner := currentOrg != nil && currentOrg.OwnerID == claims.UserID
	callerIsMember := false
	for _, member := range members {
		if member.UserID != claims.UserID {
			continue
		}
		callerIsMember = true
		if member.Role == "owner" {
			callerIsOwner = true
		}
		break
	}
	if !callerIsMember {
		return false, apperror.BadRequest("you are not a member of this organization", map[string]interface{}{"reason": "org_leave_not_member"})
	}
	if callerIsOwner {
		return false, apperror.BadRequest("you must transfer organization ownership before leaving", map[string]interface{}{"reason": "org_leave_owner_must_transfer"})
	}
	if len(members) <= 1 {
		return false, apperror.BadRequest("you cannot leave the last organization member", map[string]interface{}{"reason": "org_leave_last_member"})
	}

	if err := r.orgStore.RemoveMember(ctx, orgID, claims.UserID); err != nil {
		r.logger.Error("LeaveOrganization: failed", zap.String("orgID", orgID), zap.String("userID", claims.UserID), zap.Error(err))
		return false, fmt.Errorf("failed to leave organization: %w", err)
	}
	r.logger.Info("OrgMember left organization", zap.String("orgID", orgID), zap.String("userID", claims.UserID))
	return true, nil
}

// DeleteOrganization permanently deletes the caller's organization when it is safe to do so.
func (r *mutationResolver) DeleteOrganization(ctx context.Context) (bool, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if !r.cloudEnabled() {
		return false, fmt.Errorf("organization management is not available in this deployment")
	}
	orgID, err := r.requireUserOrgID(ctx)
	if err != nil {
		return false, err
	}

	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return false, fmt.Errorf("failed to load organization: %w", err)
	}
	if currentOrg == nil {
		return false, fmt.Errorf("organization %q not found", orgID)
	}
	if currentOrg.OwnerID != claims.UserID {
		return false, apperror.BadRequest("only the current organization owner can delete the organization", map[string]interface{}{"reason": "org_delete_current_owner_required"})
	}

	spaces, err := r.spaceStore.ListByOrgID(ctx, orgID)
	if err != nil {
		return false, fmt.Errorf("failed to list organization spaces: %w", err)
	}
	if len(spaces) > 0 {
		return false, apperror.BadRequest("delete all spaces before deleting the organization", map[string]interface{}{"reason": "org_delete_has_spaces"})
	}

	isPaidPlan := currentOrg.Plan == org.PlanStarter || currentOrg.Plan == org.PlanPro || currentOrg.Plan == org.PlanTeam
	hasActiveBilling := currentOrg.PlanStatus == org.PlanStatusActive || currentOrg.PlanStatus == org.PlanStatusTrialing || currentOrg.PlanStatus == org.PlanStatusPastDue
	if isPaidPlan && hasActiveBilling && currentOrg.StripeSubscriptionID != "" {
		return false, apperror.BadRequest("cancel paid billing before deleting the organization", map[string]interface{}{"reason": "org_delete_billing_active"})
	}

	if err := r.orgStore.Delete(ctx, orgID, claims.UserID); err != nil {
		r.logger.Error("DeleteOrganization: failed", zap.String("orgID", orgID), zap.String("userID", claims.UserID), zap.Error(err))
		return false, fmt.Errorf("failed to delete organization: %w", err)
	}

	r.logger.Info("Organization deleted", zap.String("orgID", orgID), zap.String("userID", claims.UserID))
	return true, nil
}

// AddSpaceMember adds an existing org member to a space (space manager).
func (r *mutationResolver) AddSpaceMember(ctx context.Context, spaceID string, userID string, role gql.SpaceMemberAssignableRole) (*gql.SpaceMember, error) {
	if !r.cloudEnabled() {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	normalizedRole, err := normalizeSpaceMemberRole(role.String())
	if err != nil {
		return nil, err
	}
	space, err := r.spaceStore.GetByID(ctx, spaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return nil, fmt.Errorf("space %q not found", spaceID)
	}
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, apperror.Forbidden("space manager access required")
	}
	members, err := r.orgStore.ListMembers(ctx, space.OrgID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify org membership: %w", err)
	}
	var matched *org.OrgMemberView
	for _, member := range members {
		if member.UserID == userID {
			matched = member
			break
		}
	}
	if matched == nil {
		return nil, fmt.Errorf("user is not a member of this organization")
	}
	if normalizedRole == "member" {
		return nil, fmt.Errorf("member already has access to this space")
	}
	if err := r.spaceStore.AddMember(ctx, space.ID, userID, normalizedRole); err != nil {
		return nil, fmt.Errorf("failed to add space member: %w", err)
	}
	spaceMembers, err := r.spaceStore.ListMembers(ctx, space.ID)
	if err == nil {
		for _, member := range spaceMembers {
			if member.UserID == userID {
				return mapSpaceMemberToGQL(member), nil
			}
		}
	}
	return &gql.SpaceMember{UserID: userID, Username: matched.Username, DisplayName: matched.DisplayName, Role: mapSpaceMemberRole(normalizedRole)}, nil
}

func (r *mutationResolver) InviteSpaceMember(ctx context.Context, spaceID string, email string, role gql.SpaceMemberAssignableRole) (*gql.SpaceInviteResult, error) {
	if !r.cloudEnabled() || r.userStore == nil {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	normalizedRole, err := normalizeSpaceMemberRole(role.String())
	if err != nil {
		return nil, err
	}
	s, err := r.spaceStore.GetByID(ctx, spaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if s == nil {
		return nil, fmt.Errorf("space %q not found", spaceID)
	}
	permissions, err := r.getSpacePermissions(ctx, s)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, apperror.Forbidden("space manager access required")
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return nil, fmt.Errorf("email is required")
	}

	orgMembers, err := r.orgStore.ListMembers(ctx, s.OrgID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify org membership: %w", err)
	}

	existingUser, err := r.userStore.GetByEmail(ctx, normalizedEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to look up user by email: %w", err)
	}
	if existingUser != nil {
		for _, member := range orgMembers {
			if member.UserID != existingUser.ID {
				continue
			}
			if normalizedRole == "member" {
				return nil, fmt.Errorf("member already has access to this space")
			}
			hasAccess, hasAccessErr := r.spaceStore.HasMember(ctx, s.ID, existingUser.ID)
			if hasAccessErr != nil {
				return nil, fmt.Errorf("failed to check space membership: %w", hasAccessErr)
			}
			if hasAccess {
				return nil, fmt.Errorf("member already has access to this space")
			}
			if err := r.spaceStore.AddMember(ctx, s.ID, existingUser.ID, normalizedRole); err != nil {
				return nil, fmt.Errorf("failed to add space member: %w", err)
			}
			spaceMembers, listErr := r.spaceStore.ListMembers(ctx, s.ID)
			if listErr == nil {
				for _, spaceMember := range spaceMembers {
					if spaceMember.UserID == existingUser.ID {
						return &gql.SpaceInviteResult{Status: "added", Member: mapSpaceMemberToGQL(spaceMember)}, nil
					}
				}
			}
			return &gql.SpaceInviteResult{Status: "added", Member: &gql.SpaceMember{UserID: existingUser.ID, Username: member.Username, DisplayName: member.DisplayName, Email: existingUser.Email, AvatarURL: existingUser.AvatarUrl, Role: mapSpaceMemberRole(normalizedRole)}}, nil
		}

		hasAccess, hasAccessErr := r.spaceStore.HasMember(ctx, s.ID, existingUser.ID)
		if hasAccessErr != nil {
			return nil, fmt.Errorf("failed to check space membership: %w", hasAccessErr)
		}
		if hasAccess {
			return nil, fmt.Errorf("member already has access to this space")
		}

		if err := r.spaceStore.AddMember(ctx, s.ID, existingUser.ID, normalizedRole); err != nil {
			return nil, fmt.Errorf("failed to add space member: %w", err)
		}
		spaceMembers, listErr := r.spaceStore.ListMembers(ctx, s.ID)
		if listErr == nil {
			for _, spaceMember := range spaceMembers {
				if spaceMember.UserID == existingUser.ID {
					return &gql.SpaceInviteResult{Status: "added", Member: mapSpaceMemberToGQL(spaceMember)}, nil
				}
			}
		}
		return &gql.SpaceInviteResult{Status: "added", Member: &gql.SpaceMember{UserID: existingUser.ID, Username: existingUser.Username, DisplayName: existingUser.DisplayName, Email: existingUser.Email, AvatarURL: existingUser.AvatarUrl, Role: mapSpaceMemberRole(normalizedRole)}}, nil
	}

	if !r.inviteEnabled() {
		return nil, fmt.Errorf("email invitations are not configured")
	}
	if r.spaceInviteStore == nil || r.inviteSender == nil {
		return nil, fmt.Errorf("email invitations are not configured")
	}

	claims, claimsErr := auth.GetClaimsFromContext(ctx)
	if claimsErr != nil {
		return nil, claimsErr
	}
	invitation, err := r.spaceInviteStore.CreateOrRefreshPending(ctx, s.OrgID, s.ID, normalizedEmail, normalizedRole, claims.UserID, time.Now().UTC().Add(7*24*time.Hour))
	if err != nil {
		return nil, fmt.Errorf("failed to create invitation: %w", err)
	}

	orgName := "your organization"
	org, orgErr := r.orgStore.GetByID(ctx, s.OrgID)
	if orgErr == nil && org != nil && org.Name != "" {
		orgName = org.Name
	}
	if err := r.inviteSender.SendSpaceInvitation(ctx, space.EmailParams{
		ToEmail:     normalizedEmail,
		OrgName:     orgName,
		SpaceName:   s.Name,
		InviteToken: invitation.Token,
		Role:        normalizedRole,
	}); err != nil {
		return nil, fmt.Errorf("failed to send invitation email: %w", err)
	}

	return &gql.SpaceInviteResult{Status: "invited", Invitation: mapSpaceInvitationToGQL(invitation)}, nil
}

// RemoveSpaceMember removes an explicit member from a space (space manager).
func (r *mutationResolver) RemoveSpaceMember(ctx context.Context, spaceID string, userID string) (bool, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if claims.UserID == userID {
		return false, fmt.Errorf("you cannot remove yourself from this space")
	}
	if !r.cloudEnabled() {
		return false, fmt.Errorf("space member management is not available in this deployment")
	}
	s, err := r.spaceStore.GetByID(ctx, spaceID)
	if err != nil {
		return false, fmt.Errorf("failed to fetch space: %w", err)
	}
	if s == nil {
		return false, fmt.Errorf("space %q not found", spaceID)
	}
	permissions, err := r.getSpacePermissions(ctx, s)
	if err != nil {
		return false, err
	}
	if !permissions.CanManage {
		return false, apperror.Forbidden("space manager access required")
	}
	protectedMember, err := r.isProtectedHostSpaceMember(ctx, s, userID)
	if err != nil {
		return false, err
	}
	if protectedMember {
		return false, fmt.Errorf("you cannot remove a host organization owner or admin from this space")
	}
	if err := r.spaceStore.RemoveMember(ctx, s.ID, userID); err != nil {
		return false, fmt.Errorf("failed to remove space member: %w", err)
	}
	return true, nil
}

func (r *mutationResolver) LeaveSpace(ctx context.Context, spaceID string) (bool, error) {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false, err
	}
	if !r.cloudEnabled() {
		return false, fmt.Errorf("space member management is not available in this deployment")
	}
	space, err := r.spaceStore.GetByID(ctx, spaceID)
	if err != nil {
		return false, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return false, fmt.Errorf("space %q not found", spaceID)
	}
	orgID, orgErr := r.getUserOrgID(ctx)
	if orgErr != nil {
		return false, orgErr
	}
	if orgID != "" && space.OrgID == orgID {
		return false, fmt.Errorf("you can only leave shared spaces from another organization")
	}
	hasAccess, err := r.spaceStore.HasMember(ctx, space.ID, claims.UserID)
	if err != nil {
		return false, fmt.Errorf("failed to check space membership: %w", err)
	}
	if !hasAccess {
		return false, fmt.Errorf("you are not an explicit member of this space")
	}
	if err := r.spaceStore.RemoveMember(ctx, space.ID, claims.UserID); err != nil {
		return false, fmt.Errorf("failed to leave space: %w", err)
	}
	return true, nil
}

// UpdateOrgMemberRole changes a member's role within the caller's org (admin only).
func (r *mutationResolver) UpdateOrgMemberRole(ctx context.Context, userID string, role gql.OrgMemberAssignableRole) (*gql.OrgMember, error) {
	if !r.cloudEnabled() {
		return nil, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}

	normalizedRole := strings.ToLower(strings.TrimSpace(role.String()))
	if normalizedRole != "admin" && normalizedRole != "member" {
		return nil, apperror.BadRequest("organization member role must be admin or member", map[string]interface{}{"reason": "org_member_invalid_role"})
	}

	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to load organization: %w", err)
	}
	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify org membership: %w", err)
	}
	for _, member := range members {
		if member.UserID != userID {
			continue
		}
		if (currentOrg != nil && currentOrg.OwnerID == userID) || member.Role == "owner" {
			return nil, apperror.BadRequest("you cannot change the organization owner's role", map[string]interface{}{"reason": "org_member_update_owner_role"})
		}
		break
	}

	if err := r.orgStore.UpdateMemberRole(ctx, orgID, userID, normalizedRole); err != nil {
		r.logger.Error("UpdateOrgMemberRole: failed", zap.String("orgID", orgID), zap.String("userID", userID), zap.Error(err))
		return nil, fmt.Errorf("failed to update member role: %w", err)
	}
	r.logger.Info("OrgMember role updated", zap.String("orgID", orgID), zap.String("userID", userID), zap.String("role", normalizedRole))

	// Reload to return updated member.
	members, err = r.orgStore.ListMembers(ctx, orgID)
	if err == nil {
		for _, m := range members {
			if m.UserID == userID {
				return mapMemberToGQL(m), nil
			}
		}
	}
	return &gql.OrgMember{UserID: userID, Role: mapOrgMemberRole(normalizedRole)}, nil
}

func (r *mutationResolver) TransferOrganizationOwnership(ctx context.Context, userID string) (*gql.Organization, error) {
	if !r.cloudEnabled() {
		return nil, fmt.Errorf("member management is not available in this deployment")
	}
	orgID, _, err := r.requireOrganizationAdminPermission(ctx)
	if err != nil {
		return nil, err
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	if claims.UserID == userID {
		return nil, apperror.BadRequest("organization owner is already assigned to this user", map[string]interface{}{"reason": "org_transfer_same_owner"})
	}

	currentOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to load organization: %w", err)
	}
	if currentOrg == nil {
		return nil, fmt.Errorf("organization %q not found", orgID)
	}
	if currentOrg.OwnerID != claims.UserID {
		return nil, apperror.Forbidden("organization owner access required")
	}

	members, err := r.orgStore.ListMembers(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify org membership: %w", err)
	}
	targetIsMember := false
	for _, member := range members {
		if member.UserID == userID {
			targetIsMember = true
			break
		}
	}
	if !targetIsMember {
		return nil, apperror.BadRequest("new owner must already belong to this organization", map[string]interface{}{"reason": "org_transfer_target_not_member"})
	}

	if err := r.orgStore.TransferOwnership(ctx, orgID, claims.UserID, userID); err != nil {
		r.logger.Error("TransferOrganizationOwnership: failed", zap.String("orgID", orgID), zap.String("currentOwnerID", claims.UserID), zap.String("newOwnerID", userID), zap.Error(err))
		return nil, fmt.Errorf("failed to transfer organization ownership: %w", err)
	}

	updatedOrg, err := r.orgStore.GetByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to reload organization: %w", err)
	}
	if updatedOrg == nil {
		return nil, fmt.Errorf("organization transferred but could not be reloaded")
	}

	r.logger.Info("Organization ownership transferred", zap.String("orgID", orgID), zap.String("previousOwnerID", claims.UserID), zap.String("newOwnerID", userID))
	result := mapOrgToGQL(updatedOrg)
	result.CurrentUserRole = gql.OrgMemberRoleAdmin
	return result, nil
}

// UpdateSpaceMemberRole changes a member's explicit role within a space (space manager).
func (r *mutationResolver) UpdateSpaceMemberRole(ctx context.Context, spaceID string, userID string, role gql.SpaceMemberAssignableRole) (*gql.SpaceMember, error) {
	if !r.cloudEnabled() {
		return nil, fmt.Errorf("space member management is not available in this deployment")
	}
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	if claims.UserID == userID {
		return nil, fmt.Errorf("you cannot change your own role in this space")
	}
	normalizedRole, err := normalizeSpaceMemberRole(role.String())
	if err != nil {
		return nil, err
	}
	space, err := r.spaceStore.GetByID(ctx, spaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch space: %w", err)
	}
	if space == nil {
		return nil, fmt.Errorf("space %q not found", spaceID)
	}
	permissions, err := r.getSpacePermissions(ctx, space)
	if err != nil {
		return nil, err
	}
	if !permissions.CanManage {
		return nil, apperror.Forbidden("space manager access required")
	}
	protectedMember, err := r.isProtectedHostSpaceMember(ctx, space, userID)
	if err != nil {
		return nil, err
	}
	if protectedMember {
		return nil, fmt.Errorf("you cannot change the space role for a host organization owner or admin")
	}
	if err := r.spaceStore.UpdateMemberRole(ctx, space.ID, userID, normalizedRole); err != nil {
		return nil, fmt.Errorf("failed to update space member role: %w", err)
	}
	members, err := r.spaceStore.ListMembers(ctx, space.ID)
	if err == nil {
		for _, member := range members {
			if member.UserID == userID {
				return mapSpaceMemberToGQL(member), nil
			}
		}
	}
	return &gql.SpaceMember{UserID: userID, Role: mapSpaceMemberRole(normalizedRole)}, nil
}

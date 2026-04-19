package httphandler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"go.uber.org/zap"
)

// SpacesDeltaHandler serves GET /internal/spaces/delta.
//
// This is a service-to-service endpoint used by the Fly.io processing cluster
// to keep its in-process SpaceConfigStore in sync with the management service.
//
// Authentication: Bearer token checked against the configured apiSecret.
// The secret should be set as an environment variable on both services and
// never exposed to end users.
//
// Query param:
//
//	since  – optional Unix timestamp (seconds). Only spaces updated after this
//	         time are returned. Omit or pass 0 for a full sync.
//
// Response body (application/json):
//
//	{
//	  "spaces":      [ { ...SpaceConfig fields... }, ... ],  // upserted/active
//	  "deleted":     [ "key1", "key2" ],                     // soft-deleted keys
//	  "server_time": 1744640400                              // Unix seconds; use as next cursor
//	}
type SpacesDeltaHandler struct {
	store     cloudcontract.SpaceStore
	apiSecret string
	logger    *zap.Logger
}

// NewSpacesDeltaHandler creates the handler. apiSecret must be non-empty in
// production; an empty secret disables authentication (test/dev only).
func NewSpacesDeltaHandler(store cloudcontract.SpaceStore, apiSecret string, logger *zap.Logger) *SpacesDeltaHandler {
	return &SpacesDeltaHandler{
		store:     store,
		apiSecret: apiSecret,
		logger:    logger,
	}
}

// spacesDeltaResponse mirrors spaceconfigstore.SpacesDeltaResponse so the
// processing service can decode this directly.
type spacesDeltaResponse struct {
	Spaces     []*spaceConfigPayload `json:"spaces"`
	Deleted    []string              `json:"deleted"`
	ServerTime int64                 `json:"server_time"` // Unix seconds
}

// spaceConfigPayload is the wire representation of a space, matching the
// SpaceConfig struct in the spaceconfigstore package.
type spaceConfigPayload struct {
	OrgID           string `json:"org_id"`
	Key             string `json:"key"`
	Bucket          string `json:"bucket"`
	Prefix          string `json:"prefix"`
	Region          string `json:"region"`
	Endpoint        string `json:"endpoint"`
	AccessKeyID     string `json:"access_key_id"`
	SecretKey       string `json:"secret_key"`
	UsePathStyle    bool   `json:"use_path_style"`
	CustomDomain    string `json:"custom_domain"`
	Suspended       bool   `json:"suspended"`
	SignerAlgorithm string `json:"signer_algorithm"`
	SignerTruncate  int    `json:"signer_truncate"`
	ImagorSecret    string `json:"imagor_secret"`
}

// GetDelta returns the HTTP handler for GET /internal/spaces/delta.
func (h *SpacesDeltaHandler) GetDelta() http.HandlerFunc {
	return Handle(http.MethodGet, func(w http.ResponseWriter, r *http.Request) error {
		// ── Authentication ──────────────────────────────────────────────────
		if h.apiSecret != "" {
			authHeader := r.Header.Get("Authorization")
			token, ok := extractBearer(authHeader)
			if !ok || token != h.apiSecret {
				return apperror.Unauthorized("invalid or missing API token")
			}
		}

		// ── Parse ?since= ───────────────────────────────────────────────────
		var since time.Time
		if s := r.URL.Query().Get("since"); s != "" {
			secs, err := strconv.ParseInt(s, 10, 64)
			if err != nil || secs < 0 {
				return apperror.BadRequest("since must be a non-negative Unix timestamp in seconds", nil)
			}
			if secs > 0 {
				since = time.Unix(secs, 0).UTC()
			}
		}

		// ── Query store ─────────────────────────────────────────────────────
		delta, err := h.store.Delta(r.Context(), since)
		if err != nil {
			h.logger.Error("spaces delta query failed", zap.Error(err))
			return apperror.InternalServerError("failed to query spaces delta")
		}

		// ── Build response ──────────────────────────────────────────────────
		resp := &spacesDeltaResponse{
			Spaces:     make([]*spaceConfigPayload, 0, len(delta.Upserted)),
			Deleted:    delta.Deleted,
			ServerTime: delta.ServerTime.Unix(),
		}
		if resp.Deleted == nil {
			resp.Deleted = []string{}
		}

		for _, sp := range delta.Upserted {
			resp.Spaces = append(resp.Spaces, spaceToPayload(sp))
		}

		return WriteSuccess(w, resp)
	})
}

// extractBearer parses a "Bearer <token>" Authorization header.
// Returns the token and true on success, ("", false) otherwise.
func extractBearer(header string) (string, bool) {
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return "", false
	}
	token := strings.TrimSpace(header[len(prefix):])
	if token == "" {
		return "", false
	}
	return token, true
}

func spaceToPayload(sp *cloudcontract.Space) *spaceConfigPayload {
	signerAlg := sp.SignerAlgorithm
	if signerAlg == "" {
		signerAlg = "sha256"
	}
	return &spaceConfigPayload{
		OrgID:           sp.OrgID,
		Key:             sp.Key,
		Bucket:          sp.Bucket,
		Prefix:          sp.Prefix,
		Region:          sp.Region,
		Endpoint:        sp.Endpoint,
		AccessKeyID:     sp.AccessKeyID,
		SecretKey:       sp.SecretKey,
		UsePathStyle:    sp.UsePathStyle,
		CustomDomain:    sp.CustomDomain,
		Suspended:       sp.Suspended,
		SignerAlgorithm: signerAlg,
		SignerTruncate:  sp.SignerTruncate,
		ImagorSecret:    sp.ImagorSecret,
	}
}

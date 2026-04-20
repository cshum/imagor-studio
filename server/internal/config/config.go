package config

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/peterbourgon/ff/v3"
)

type Config struct {
	Port        int
	DatabaseURL string
	StorageType string

	// JWT Configuration
	JWTSecret     string
	JWTExpiration time.Duration

	// License Configuration
	LicenseKey string

	// Authentication Configuration
	AllowGuestMode bool // Allow guest mode access

	// Embedded Mode Configuration
	EmbeddedMode bool // Enable embedded mode (stateless, no database)

	// Migration Configuration
	ForceAutoMigrate bool   // Force auto-migration even for PostgreSQL/MySQL
	MigrateCommand   string // Migration command for migrate tool

	// File Storage
	FileStorageBaseDir          string
	FileStorageMkdirPermissions os.FileMode
	FileStorageWritePermissions os.FileMode

	// S3 Storage
	S3StorageBucket    string
	AWSRegion          string
	S3Endpoint         string
	S3ForcePathStyle   bool
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSSessionToken    string
	S3StorageBaseDir   string

	// Imagor Configuration
	ImagorSecret         string // Imagor secret key
	ImagorSignerType     string // Signer algorithm: "sha1", "sha256", "sha512"
	ImagorSignerTruncate int    // Signer truncation length

	// Application Configuration
	AppTitle                  string // Custom application title
	AppUrl                    string // Frontend application URL (used for post-OAuth redirect to /auth/callback)
	AppHomeTitle              string // Custom home page title
	AppImageExtensions        string // Comma-separated list of image file extensions
	AppVideoExtensions        string // Comma-separated list of video file extensions
	AppShowHidden             bool   // Show hidden files starting with dot
	AppDefaultSortBy          string // Default file sorting option
	AppDefaultSortOrder       string // Default file sorting order
	AppVideoThumbnailPosition string // Video thumbnail extraction position

	// processing service secret – shared between management service and Fly.io
	// processing cluster. Authenticates GET /internal/spaces/delta requests.
	// Set via --internal-api-secret / INTERNAL_API_SECRET env var.
	// An empty string disables authentication (development only).
	InternalAPISecret string

	// SpacesEndpoint is the base URL of the management service that exposes
	// /internal/spaces/delta.  Set on processing nodes only.
	// Example: "https://studio.example.com"
	SpacesEndpoint string

	// SpaceBaseDomain is the platform domain suffix used by SpaceS3Loader
	// to map subdomain requests to space keys.
	// Must include the leading dot, e.g. ".imagor.cloud".
	SpaceBaseDomain string

	// CORSOrigins is a comma-separated list of allowed CORS origins.
	// Empty (default) means allow all origins ("*").
	// Processing nodes should set this to the management app origin,
	// e.g. "https://app.imagor.net".
	// Set via --cors-origins / CORS_ORIGINS env var.
	CORSOrigins string

	// SpaceMaxConcurrency is the maximum number of concurrent imagor requests
	// allowed per space on a processing node. 0 disables the limit.
	// Maps to --space-max-concurrency / SPACE_MAX_CONCURRENCY env var.
	// Default 8 (= dedicated vCPUs on a Fly.io performance-4x machine).
	SpaceMaxConcurrency int

	// Internal tracking for config overrides
	overriddenFlags map[string]string
	flagSet         *flag.FlagSet // Private field to access flag values
}

// Load loads configuration with optional registry enhancement
// Both args and registryStore are optional (can be nil)
func Load(args []string, registryStore registrystore.Store) (*Config, error) {

	fs := flag.NewFlagSet("imagor-studio", flag.ContinueOnError)

	var (
		port          = fs.String("port", "8080", "port to listen on")
		databaseURL   = fs.String("database-url", "sqlite:./imagor-studio.db", "database URL (sqlite:./path.db, postgres://user:pass@host:port/db, mysql://user:pass@host:port/db)")
		storageType   = fs.String("storage-type", "", "storage type: file or s3 (auto-detected if not specified)")
		jwtSecret     = fs.String("jwt-secret", "", "secret key for JWT signing")
		jwtExpiration = fs.String("jwt-expiration", "168h", "JWT token expiration duration")
		licenseKey    = fs.String("license-key", "", "license key for activation")

		allowGuestMode   = fs.Bool("allow-guest-mode", false, "allow guest mode access")
		embeddedMode     = fs.Bool("embedded-mode", false, "enable embedded mode (stateless, no database)")
		forceAutoMigrate = fs.Bool("force-auto-migrate", false, "force auto-migration even for PostgreSQL/MySQL (use with caution in multi-instance environments)")
		migrateCommand   = fs.String("migrate-command", "up", "migration command: up, down, status, reset")

		fileStorageBaseDir          = fs.String("file-storage-base-dir", "/app/gallery", "base directory for file storage")
		fileStorageMkdirPermissions = fs.String("file-storage-mkdir-permissions", "0755", "directory creation permissions")
		fileStorageWritePermissions = fs.String("file-storage-write-permissions", "0644", "file write permissions")

		awsRegion          = fs.String("aws-region", "", "AWS region")
		awsAccessKeyID     = fs.String("aws-access-key-id", "", "AWS access key ID (optional)")
		awsSecretAccessKey = fs.String("aws-secret-access-key", "", "AWS secret access key (optional)")
		awsSessionToken    = fs.String("aws-session-token", "", "AWS session token (optional)")
		s3StorageBucket    = fs.String("s3-storage-bucket", "", "S3 bucket name")
		s3Endpoint         = fs.String("s3-endpoint", "", "S3 endpoint (optional)")
		s3ForcePathStyle   = fs.Bool("s3-force-path-style", false, "S3 force path style (optional)")
		s3StorageBaseDir   = fs.String("s3-storage-base-dir", "", "S3 base directory (optional)")

		imagorSecret         = fs.String("imagor-secret", "", "secret key for imagor")
		imagorSignerType     = fs.String("imagor-signer-type", "sha1", "imagor signer algorithm: sha1, sha256, sha512")
		imagorSignerTruncate = fs.Int("imagor-signer-truncate", 0, "imagor signer truncation length")

		appTitle                  = fs.String("app-title", "", "custom application title (license required)")
		appUrl                    = fs.String("app-url", "", "frontend application URL used for post-OAuth redirect (license required for branding)")
		appHomeTitle              = fs.String("app-home-title", "", "custom home page title")
		appImageExtensions        = fs.String("app-image-extensions", ".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif,.cr2,.raf,.orf,.rw2,.x3f,.cr3,.dng,.nef,.arw,.pef,.raw,.nrw,.srw,.erf,.mrw,.dcr,.kdc,.3fr,.mef,.iiq,.rwl,.sr2,.srf,.crw", "comma-separated list of image file extensions to show in application")
		appVideoExtensions        = fs.String("app-video-extensions", ".mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg", "comma-separated list of video file extensions to show in application")
		appShowHidden             = fs.Bool("app-show-hidden", false, "show hidden files and folders starting with dot")
		appDefaultSortBy          = fs.String("app-default-sort-by", "MODIFIED_TIME", "default file sorting option: NAME, MODIFIED_TIME, SIZE")
		appDefaultSortOrder       = fs.String("app-default-sort-order", "DESC", "default file sorting order: ASC, DESC")
		appVideoThumbnailPosition = fs.String("app-video-thumbnail-position", "first_frame", "video thumbnail extraction position: first_frame, seek_1s, seek_3s, seek_5s, seek_10pct, seek_25pct")

		internalAPISecret   = fs.String("internal-api-secret", "", "shared secret for /internal/spaces/delta (set via INTERNAL_API_SECRET env var)")
		spacesEndpoint      = fs.String("spaces-endpoint", "", "management service base URL for /internal/spaces/delta polling (processing nodes only)")
		spaceBaseDomain     = fs.String("space-base-domain", "", "platform subdomain suffix for space routing, e.g. .imagor.cloud (processing nodes only)")
		corsOrigins         = fs.String("cors-origins", "", "comma-separated allowed CORS origins; empty = allow all (*). Example: https://app.imagor.net")
		spaceMaxConcurrency = fs.Int("space-max-concurrency", 8, "max concurrent imagor requests per space on processing nodes (0 = disabled)")
	)

	_ = fs.String("config", ".env", "config file (optional)")

	// Prepare ff options
	if args == nil {
		args = os.Args[1:]
	}

	ffOptions := []ff.Option{
		ff.WithEnvVars(),
		ff.WithConfigFileFlag("config"),
		ff.WithConfigFileParser(ff.EnvParser),
		ff.WithIgnoreUndefined(true),
		ff.WithAllowMissingConfigFile(true),
	}

	// For tests, we need to handle the case where test flags might conflict
	// We'll catch the error and try to parse without unknown flags
	err := ff.Parse(fs, args, ffOptions...)
	if err != nil {
		// If parsing failed, try again with ignore undefined to handle test flags
		ffOptionsWithIgnore := append(ffOptions, ff.WithIgnoreUndefined(true))
		if err := ff.Parse(fs, args, ffOptionsWithIgnore...); err != nil {
			return nil, fmt.Errorf("error parsing configuration: %w", err)
		}
	}

	// Track overridden flags AFTER flag parsing
	overriddenFlags := make(map[string]string)
	fs.Visit(func(f *flag.Flag) {
		overriddenFlags[f.Name] = f.Value.String()
	})

	// Apply registry values if registry store is provided
	if registryStore != nil {
		if err := applyRegistryValues(fs, overriddenFlags, registryStore); err != nil {
			return nil, fmt.Errorf("failed to apply registry values: %w", err)
		}
	}

	// JWT secret validation is now handled in bootstrap phase

	// Parse port
	portInt, err := strconv.Atoi(*port)
	if err != nil {
		return nil, fmt.Errorf("invalid port: %w", err)
	}

	// Parse JWT expiration
	jwtExp, err := time.ParseDuration(*jwtExpiration)
	if err != nil {
		return nil, fmt.Errorf("invalid jwt-expiration: %w", err)
	}

	// Parse file permissions
	mkdirPerm, err := strconv.ParseUint(*fileStorageMkdirPermissions, 8, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid file-storage-mkdir-permissions: %w", err)
	}

	writePerm, err := strconv.ParseUint(*fileStorageWritePermissions, 8, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid file-storage-write-permissions: %w", err)
	}

	cfg := &Config{
		Port:                        portInt,
		DatabaseURL:                 *databaseURL,
		JWTSecret:                   *jwtSecret,
		JWTExpiration:               jwtExp,
		LicenseKey:                  *licenseKey,
		AllowGuestMode:              *allowGuestMode,
		EmbeddedMode:                *embeddedMode,
		ForceAutoMigrate:            *forceAutoMigrate,
		MigrateCommand:              *migrateCommand,
		StorageType:                 *storageType,
		FileStorageBaseDir:          *fileStorageBaseDir,
		FileStorageMkdirPermissions: os.FileMode(mkdirPerm),
		FileStorageWritePermissions: os.FileMode(writePerm),
		S3StorageBucket:             *s3StorageBucket,
		AWSRegion:                   *awsRegion,
		S3Endpoint:                  *s3Endpoint,
		S3ForcePathStyle:            *s3ForcePathStyle,
		AWSAccessKeyID:              *awsAccessKeyID,
		AWSSecretAccessKey:          *awsSecretAccessKey,
		AWSSessionToken:             *awsSessionToken,
		S3StorageBaseDir:            *s3StorageBaseDir,
		ImagorSecret:                *imagorSecret,
		ImagorSignerType:            *imagorSignerType,
		ImagorSignerTruncate:        *imagorSignerTruncate,
		AppTitle:                    *appTitle,
		AppUrl:                      *appUrl,
		AppHomeTitle:                *appHomeTitle,
		AppImageExtensions:          *appImageExtensions,
		AppVideoExtensions:          *appVideoExtensions,
		AppShowHidden:               *appShowHidden,
		AppDefaultSortBy:            *appDefaultSortBy,
		AppDefaultSortOrder:         *appDefaultSortOrder,
		AppVideoThumbnailPosition:   *appVideoThumbnailPosition,
		InternalAPISecret:           *internalAPISecret,
		SpacesEndpoint:              *spacesEndpoint,
		SpaceBaseDomain:             *spaceBaseDomain,
		CORSOrigins:                 *corsOrigins,
		SpaceMaxConcurrency:         *spaceMaxConcurrency,
		overriddenFlags:             overriddenFlags,
		flagSet:                     fs, // Store the flagSet for later use
	}

	// Auto-populate storage type if not explicitly set
	if cfg.StorageType == "" {
		if cfg.S3StorageBucket != "" {
			cfg.StorageType = "s3"
		} else {
			cfg.StorageType = "file" // default fallback
		}
	}

	// Validate storage configuration
	if err := cfg.validateStorageConfig(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validateStorageConfig() error {
	switch c.StorageType {
	case "file", "filesystem":
		// File storage is always valid - will create directory if needed
		return nil
	case "s3":
		if c.S3StorageBucket == "" {
			return fmt.Errorf("s3-storage-bucket is required when storage-type is s3")
		}
		return nil
	default:
		return fmt.Errorf("unsupported storage-type: %s (supported: file, s3)", c.StorageType)
	}
}

// GetRegistryKeyForFlag returns the registry key for a given flag name
func GetRegistryKeyForFlag(flagName string) string {
	// Convert flag name to registry key format with config. prefix
	// e.g., "storage-type" -> "config.storage_type"
	configKey := strings.ReplaceAll(strings.ToLower(flagName), "-", "_")
	return "config." + configKey
}

// GetFlagNameForRegistryKey returns the flag name for a given registry key
func GetFlagNameForRegistryKey(registryKey string) string {
	// Handle both old format and new config. prefix format
	key := strings.ToLower(registryKey)

	// If it has config. prefix, strip it
	key = strings.TrimPrefix(key, "config.")

	// Convert registry key to flag name format
	// e.g., "storage_type" -> "storage-type"
	return strings.ReplaceAll(key, "_", "-")
}

// GetByRegistryKey returns the effective config value and whether the config key is overridden by external config
func (c *Config) GetByRegistryKey(registryKey string) (effectiveValue string, isSet bool) {
	// Only handle config. prefixed keys
	if !strings.HasPrefix(strings.ToLower(registryKey), "config.") {
		return "", false
	}

	// Convert registry key to flag name
	flagName := GetFlagNameForRegistryKey(registryKey)

	// Check if this flag was overridden by CLI/env
	if value, overridden := c.overriddenFlags[flagName]; overridden {
		return value, true
	}
	// Check default flag value
	if c.flagSet != nil {
		if f := c.flagSet.Lookup(flagName); f != nil {
			return f.Value.String(), false
		}
	}
	return "", false
}

// IsEmbeddedMode returns whether embedded mode is enabled
func (c *Config) IsEmbeddedMode() bool {
	return c.EmbeddedMode
}

// applyRegistryValues applies registry values to flags that weren't overridden by CLI/env
func applyRegistryValues(flagSet *flag.FlagSet, overriddenFlags map[string]string, registryStore registrystore.Store) error {
	ctx := context.Background()
	prefix := "config."
	entries, err := registryStore.List(ctx, registrystore.SystemOwnerID, &prefix)
	if err != nil {
		// Registry values are optional, so we can continue without them
		return nil
	}

	for _, entry := range entries {
		if entry.Value == "" {
			continue
		}

		flagName := GetFlagNameForRegistryKey(entry.Key)

		// Only apply if not overridden by CLI/env
		if _, overridden := overriddenFlags[flagName]; !overridden {
			// Use the flag system to set the value - this handles type conversion automatically
			if f := flagSet.Lookup(flagName); f != nil {
				if err := f.Value.Set(entry.Value); err != nil {
					return fmt.Errorf("failed to set flag %s to value %s: %w", flagName, entry.Value, err)
				}
			}
		}
	}

	return nil
}

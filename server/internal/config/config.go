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

	// File Storage
	FileBaseDir          string
	FileMkdirPermissions os.FileMode
	FileWritePermissions os.FileMode

	// S3 Storage
	S3Bucket          string
	S3Region          string
	S3Endpoint        string
	S3ForcePathStyle  bool
	S3AccessKeyID     string
	S3SecretAccessKey string
	S3SessionToken    string
	S3BaseDir         string

	// Imagor Configuration
	ImagorMode           string // "external", "embedded"
	ImagorBaseURL        string // External imagor service URL
	ImagorSecret         string // Imagor secret key
	ImagorUnsafe         bool   // For development
	ImagorSignerType     string // Signer algorithm: "sha1", "sha256", "sha512"
	ImagorSignerTruncate int    // Signer truncation length

	// Application Configuration
	AppHomeTitle      string // Custom home page title
	AppFileExtensions string // Comma-separated list of file extensions
	AppShowHidden     bool   // Show hidden files starting with dot

	// Internal tracking for config overrides
	overriddenFlags map[string]string
}

// Load loads configuration with optional registry enhancement
// Both args and registryStore are optional (can be nil)
func Load(args []string, registryStore registrystore.Store) (*Config, error) {

	fs := flag.NewFlagSet("imagor-studio", flag.ContinueOnError)

	var (
		port          = fs.String("port", "8080", "port to listen on")
		databaseURL   = fs.String("database-url", "sqlite:./imagor-studio.db", "database URL (sqlite:./path.db, postgres://user:pass@host:port/db, mysql://user:pass@host:port/db)")
		storageType   = fs.String("storage-type", "file", "storage type: file or s3")
		jwtSecret     = fs.String("jwt-secret", "", "secret key for JWT signing")
		jwtExpiration = fs.String("jwt-expiration", "168h", "JWT token expiration duration")
		licenseKey    = fs.String("license-key", "", "license key for activation")

		allowGuestMode = fs.Bool("allow-guest-mode", false, "allow guest mode access")

		fileBaseDir          = fs.String("file-base-dir", "/app/data/storage", "base directory for file storage")
		fileMkdirPermissions = fs.String("file-mkdir-permissions", "0755", "directory creation permissions")
		fileWritePermissions = fs.String("file-write-permissions", "0644", "file write permissions")

		s3Bucket          = fs.String("s3-bucket", "", "S3 bucket name")
		s3Region          = fs.String("s3-region", "", "S3 region")
		s3Endpoint        = fs.String("s3-endpoint", "", "S3 endpoint (optional)")
		s3ForcePathStyle  = fs.Bool("s3-force-path-style", false, "S3 force path style (optional)")
		s3AccessKeyID     = fs.String("s3-access-key-id", "", "S3 access key ID (optional)")
		s3SecretAccessKey = fs.String("s3-secret-access-key", "", "S3 secret access key (optional)")
		s3SessionToken    = fs.String("s3-session-token", "", "S3 session token (optional)")
		s3BaseDir         = fs.String("s3-base-dir", "", "S3 base directory (optional)")

		imagorMode           = fs.String("imagor-mode", "embedded", "imagor mode: embedded, external")
		imagorSecret         = fs.String("imagor-secret", "", "secret key for imagor")
		imagorBaseURL        = fs.String("imagor-base-url", "", "external imagor service URL")
		imagorUnsafe         = fs.Bool("imagor-unsafe", false, "enable unsafe imagor URLs for development")
		imagorSignerType     = fs.String("imagor-signer-type", "", "imagor signer algorithm: sha1, sha256, sha512")
		imagorSignerTruncate = fs.String("imagor-signer-truncate", "0", "imagor signer truncation length")

		appHomeTitle      = fs.String("app-home-title", "", "custom home page title")
		appFileExtensions = fs.String("app-file-extensions", ".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.psd,.heic,.heif", "comma-separated list of file extensions to show in application")
		appShowHidden     = fs.Bool("app-show-hidden", false, "show hidden files and folders starting with dot")
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
	mkdirPerm, err := strconv.ParseUint(*fileMkdirPermissions, 8, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid file-mkdir-permissions: %w", err)
	}

	writePerm, err := strconv.ParseUint(*fileWritePermissions, 8, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid file-write-permissions: %w", err)
	}

	// Parse imagor signer truncate
	imagorSignerTruncateInt, err := strconv.Atoi(*imagorSignerTruncate)
	if err != nil {
		return nil, fmt.Errorf("invalid imagor-signer-truncate: %w", err)
	}

	cfg := &Config{
		Port:                 portInt,
		DatabaseURL:          *databaseURL,
		JWTSecret:            *jwtSecret,
		JWTExpiration:        jwtExp,
		LicenseKey:           *licenseKey,
		AllowGuestMode:       *allowGuestMode,
		StorageType:          *storageType,
		FileBaseDir:          *fileBaseDir,
		FileMkdirPermissions: os.FileMode(mkdirPerm),
		FileWritePermissions: os.FileMode(writePerm),
		S3Bucket:             *s3Bucket,
		S3Region:             *s3Region,
		S3Endpoint:           *s3Endpoint,
		S3ForcePathStyle:     *s3ForcePathStyle,
		S3AccessKeyID:        *s3AccessKeyID,
		S3SecretAccessKey:    *s3SecretAccessKey,
		S3SessionToken:       *s3SessionToken,
		S3BaseDir:            *s3BaseDir,
		ImagorMode:           *imagorMode,
		ImagorBaseURL:        *imagorBaseURL,
		ImagorSecret:         *imagorSecret,
		ImagorUnsafe:         *imagorUnsafe,
		ImagorSignerType:     *imagorSignerType,
		ImagorSignerTruncate: imagorSignerTruncateInt,
		AppHomeTitle:         *appHomeTitle,
		AppFileExtensions:    *appFileExtensions,
		AppShowHidden:        *appShowHidden,
		overriddenFlags:      overriddenFlags,
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
		if c.S3Bucket == "" {
			return fmt.Errorf("s3-bucket is required when storage-type is s3")
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
	if strings.HasPrefix(key, "config.") {
		key = strings.TrimPrefix(key, "config.")
	}

	// Convert registry key to flag name format
	// e.g., "storage_type" -> "storage-type"
	return strings.ReplaceAll(key, "_", "-")
}

// GetByRegistryKey returns the effective config value and whether the config key is overridden by external config
func (c *Config) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
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

	return "", false
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
			if flag := flagSet.Lookup(flagName); flag != nil {
				if err := flag.Value.Set(entry.Value); err != nil {
					return fmt.Errorf("failed to set flag %s to value %s: %w", flagName, entry.Value, err)
				}
			}
		}
	}

	return nil
}

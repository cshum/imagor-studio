package config

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/peterbourgon/ff/v3"
	"go.uber.org/zap"
)

type Config struct {
	Port        int
	DBPath      string
	StorageType string

	// JWT Configuration
	JWTSecret     string
	JWTExpiration time.Duration

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
	S3AccessKeyID     string
	S3SecretAccessKey string
	S3SessionToken    string
	S3BaseDir         string

	// Imagor Configuration
	ImagorMode          string // "external", "embedded", "disabled"
	ImagorURL           string // External imagor service URL
	ImagorSecret        string // Imagor secret key
	ImagorUnsafe        bool   // For development
	ImagorResultStorage string // "same", "separate"

	Logger *zap.Logger
}

// LoadOptions contains options for loading configuration
type LoadOptions struct {
	RegistryStore registrystore.Store // Optional registry store for enhanced loading
	Args          []string            // Optional args override (defaults to os.Args[1:])
}

// Load loads configuration with optional registry enhancement
func Load(opts *LoadOptions) (*Config, error) {
	if opts == nil {
		opts = &LoadOptions{}
	}

	fs := flag.NewFlagSet("imagor-studio", flag.ContinueOnError)

	var (
		port          = fs.String("port", "8080", "port to listen on")
		dbPath        = fs.String("db-path", "storage.db", "path to SQLite database file")
		storageType   = fs.String("storage-type", "file", "storage type: file or s3")
		jwtSecret     = fs.String("jwt-secret", "", "secret key for JWT signing")
		imagorSecret  = fs.String("imagor-secret", "", "secret key for imagor")
		jwtExpiration = fs.String("jwt-expiration", "24h", "JWT token expiration duration")

		allowGuestMode = fs.Bool("allow-guest-mode", false, "allow guest mode access")

		fileBaseDir          = fs.String("file-base-dir", "./storage", "base directory for file storage")
		fileMkdirPermissions = fs.String("file-mkdir-permissions", "0755", "directory creation permissions")
		fileWritePermissions = fs.String("file-write-permissions", "0644", "file write permissions")

		s3Bucket          = fs.String("s3-bucket", "", "S3 bucket name")
		s3Region          = fs.String("s3-region", "", "S3 region")
		s3Endpoint        = fs.String("s3-endpoint", "", "S3 endpoint (optional)")
		s3AccessKeyID     = fs.String("s3-access-key-id", "", "S3 access key ID (optional)")
		s3SecretAccessKey = fs.String("s3-secret-access-key", "", "S3 secret access key (optional)")
		s3SessionToken    = fs.String("s3-session-token", "", "S3 session token (optional)")
		s3BaseDir         = fs.String("s3-base-dir", "", "S3 base directory (optional)")

		imagorMode          = fs.String("imagor-mode", "external", "imagor mode: external, embedded, or disabled")
		imagorURL           = fs.String("imagor-url", "http://localhost:8000", "external imagor service URL")
		imagorUnsafe        = fs.Bool("imagor-unsafe", false, "enable unsafe imagor URLs for development")
		imagorResultStorage = fs.String("imagor-result-storage", "same", "imagor result storage: same or separate")
	)

	_ = fs.String("config", ".env", "config file (optional)")

	// Prepare ff options
	args := opts.Args
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

	// Pre-populate registry values if registry store is available
	if opts.RegistryStore != nil {
		if err := prePopulateRegistryValues(fs, opts.RegistryStore); err != nil {
			return nil, fmt.Errorf("error loading registry values: %w", err)
		}
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

	logger, err := zap.NewProduction()
	if err != nil {
		return nil, fmt.Errorf("error initializing logger: %w", err)
	}

	if *jwtSecret == "" {
		if *imagorSecret == "" {
			return nil, fmt.Errorf("jwt-secret is required")
		}
		*jwtSecret = *imagorSecret
	}

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

	cfg := &Config{
		Port:                 portInt,
		DBPath:               *dbPath,
		JWTSecret:            *jwtSecret,
		JWTExpiration:        jwtExp,
		AllowGuestMode:       *allowGuestMode,
		StorageType:          *storageType,
		FileBaseDir:          *fileBaseDir,
		FileMkdirPermissions: os.FileMode(mkdirPerm),
		FileWritePermissions: os.FileMode(writePerm),
		S3Bucket:             *s3Bucket,
		S3Region:             *s3Region,
		S3Endpoint:           *s3Endpoint,
		S3AccessKeyID:        *s3AccessKeyID,
		S3SecretAccessKey:    *s3SecretAccessKey,
		S3SessionToken:       *s3SessionToken,
		S3BaseDir:            *s3BaseDir,
		ImagorMode:           *imagorMode,
		ImagorURL:            *imagorURL,
		ImagorSecret:         *imagorSecret,
		ImagorUnsafe:         *imagorUnsafe,
		ImagorResultStorage:  *imagorResultStorage,
		Logger:               logger,
	}

	// Validate storage configuration
	if err := cfg.validateStorageConfig(); err != nil {
		return nil, err
	}

	cfg.Logger.Info("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.String("dbPath", cfg.DBPath),
		zap.Duration("jwtExpiration", cfg.JWTExpiration),
		zap.String("storageType", cfg.StorageType),
	)

	return cfg, nil
}

// LoadBasic loads configuration without registry enhancement (for initial bootstrap)
func LoadBasic() (*Config, error) {
	return Load(nil)
}

// LoadWithRegistry loads configuration with registry enhancement
func LoadWithRegistry(registryStore registrystore.Store) (*Config, error) {
	return Load(&LoadOptions{RegistryStore: registryStore})
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

// RegistryParser implements ff.ConfigFileParser for registry-based configuration
type RegistryParser struct {
	registryStore registrystore.Store
}

// NewRegistryParser creates a new registry parser
func NewRegistryParser(registryStore registrystore.Store) *RegistryParser {
	return &RegistryParser{registryStore: registryStore}
}

// Parse implements ff.ConfigFileParser interface
func (p *RegistryParser) Parse(r io.Reader, set func(name, value string) error) error {
	// The reader is not used for registry parsing, but we need to implement the interface
	// Registry values are fetched directly from the store

	ctx := context.Background()

	// Auto-parse registry entries with "config." prefix
	prefix := "config."
	entries, err := p.registryStore.List(ctx, "system", &prefix)
	if err != nil {
		// Log error but continue - registry values are optional
		return nil
	}

	// Apply registry values to flags using auto-parsing
	for _, entry := range entries {
		if entry.Value != "" {
			// Strip "config." prefix: config.jwt_secret -> jwt_secret
			configKey := strings.TrimPrefix(entry.Key, prefix)
			// Convert to flag format: jwt_secret -> jwt-secret
			flagName := strings.ReplaceAll(configKey, "_", "-")

			if err := set(flagName, entry.Value); err != nil {
				return fmt.Errorf("failed to set flag %s from registry: %w", flagName, err)
			}
		}
	}

	return nil
}

// prePopulateRegistryValues loads values from registry and sets them as defaults in the flag set
func prePopulateRegistryValues(fs *flag.FlagSet, registryStore registrystore.Store) error {
	ctx := context.Background()

	// Auto-parse registry entries with "config." prefix
	prefix := "config."
	entries, err := registryStore.List(ctx, "system", &prefix)
	if err != nil {
		// Log error but continue - registry values are optional
		return nil
	}

	// Apply registry values to flags using auto-parsing
	for _, entry := range entries {
		if entry.Value != "" {
			// Strip "config." prefix: config.jwt_secret -> jwt_secret
			configKey := strings.TrimPrefix(entry.Key, prefix)
			// Convert to flag format: jwt_secret -> jwt-secret
			flagName := strings.ReplaceAll(configKey, "_", "-")

			// Find the flag and set its default value
			flag := fs.Lookup(flagName)
			if flag != nil {
				// Set the default value by updating the flag's DefValue and Value
				flag.DefValue = entry.Value
				flag.Value.Set(entry.Value)
			}
		}
	}

	return nil
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

// GetEffectiveValueByRegistryKey returns the effective config value and whether it's overridden by config/env
func (c *Config) GetEffectiveValueByRegistryKey(registryKey, registryValue string) (effectiveValue string, isOverridden bool) {
	// Only check config override for keys with "config." prefix
	if !strings.HasPrefix(registryKey, "config.") {
		return registryValue, false
	}

	// Convert registry key to flag name
	flagName := GetFlagNameForRegistryKey(registryKey)

	// Create a temporary flag set with the same flags as the main config
	fs := flag.NewFlagSet("temp", flag.ContinueOnError)

	// Add all the flags that we support (same as in Load function)
	fs.String("port", "8080", "")
	fs.String("db-path", "storage.db", "")
	fs.String("storage-type", "file", "")
	fs.String("jwt-secret", "", "")
	fs.String("imagor-secret", "", "")
	fs.String("jwt-expiration", "24h", "")
	fs.Bool("allow-guest-mode", false, "")
	fs.String("file-base-dir", "./storage", "")
	fs.String("file-mkdir-permissions", "0755", "")
	fs.String("file-write-permissions", "0644", "")
	fs.String("s3-bucket", "", "")
	fs.String("s3-region", "", "")
	fs.String("s3-endpoint", "", "")
	fs.String("s3-access-key-id", "", "")
	fs.String("s3-secret-access-key", "", "")
	fs.String("s3-session-token", "", "")
	fs.String("s3-base-dir", "", "")
	fs.String("imagor-mode", "external", "")
	fs.String("imagor-url", "http://localhost:8000", "")
	fs.Bool("imagor-unsafe", false, "")
	fs.String("imagor-result-storage", "same", "")

	// Look up the flag
	flagValue := fs.Lookup(flagName)
	if flagValue == nil {
		// Unknown flag, return registry value
		return registryValue, false
	}

	// Get the actual config value by accessing the config struct directly
	var configStringValue string
	switch flagName {
	case "port":
		configStringValue = fmt.Sprintf("%d", c.Port)
	case "db-path":
		configStringValue = c.DBPath
	case "storage-type":
		configStringValue = c.StorageType
	case "jwt-secret":
		configStringValue = c.JWTSecret
	case "jwt-expiration":
		configStringValue = c.JWTExpiration.String()
	case "allow-guest-mode":
		configStringValue = fmt.Sprintf("%t", c.AllowGuestMode)
	case "file-base-dir":
		configStringValue = c.FileBaseDir
	case "file-mkdir-permissions":
		configStringValue = fmt.Sprintf("%o", c.FileMkdirPermissions)
	case "file-write-permissions":
		configStringValue = fmt.Sprintf("%o", c.FileWritePermissions)
	case "s3-bucket":
		configStringValue = c.S3Bucket
	case "s3-region":
		configStringValue = c.S3Region
	case "s3-endpoint":
		configStringValue = c.S3Endpoint
	case "s3-access-key-id":
		configStringValue = c.S3AccessKeyID
	case "s3-secret-access-key":
		configStringValue = c.S3SecretAccessKey
	case "s3-session-token":
		configStringValue = c.S3SessionToken
	case "s3-base-dir":
		configStringValue = c.S3BaseDir
	case "imagor-mode":
		configStringValue = c.ImagorMode
	case "imagor-url":
		configStringValue = c.ImagorURL
	case "imagor-secret":
		configStringValue = c.ImagorSecret
	case "imagor-unsafe":
		configStringValue = fmt.Sprintf("%t", c.ImagorUnsafe)
	case "imagor-result-storage":
		configStringValue = c.ImagorResultStorage
	default:
		// Unknown flag, return registry value
		return registryValue, false
	}

	// If config value differs from registry value, it means config overrides registry
	if configStringValue != registryValue {
		return configStringValue, true
	}

	return registryValue, false
}

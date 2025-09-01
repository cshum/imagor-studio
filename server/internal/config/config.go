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
}

// Load loads configuration with optional registry enhancement
// Both args and registryStore are optional (can be nil)
func Load(args []string, registryStore registrystore.Store) (*Config, error) {

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
		if err := ApplyRegistryValues(fs, overriddenFlags, registryStore); err != nil {
			return nil, fmt.Errorf("failed to apply registry values: %w", err)
		}
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
	}

	// Validate storage configuration
	if err := cfg.validateStorageConfig(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// LoadBasic loads configuration without registry enhancement (for initial bootstrap)
func LoadBasic() (*Config, error) {
	return Load(nil, nil)
}

// LoadWithRegistry loads configuration with registry enhancement
func LoadWithRegistry(registryStore registrystore.Store) (*Config, error) {
	return Load(nil, registryStore)
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
// This is a simplified version that always returns false since we no longer track overridden flags in the config
func (c *Config) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
	// For now, always return false since we don't track overridden flags in the config anymore
	// This method is mainly used by tests and can be simplified or removed in the future
	return "", false
}

// ApplyRegistryValues applies registry values to flags that weren't overridden by CLI/env
func ApplyRegistryValues(flagSet *flag.FlagSet, overriddenFlags map[string]string, registryStore registrystore.Store) error {
	ctx := context.Background()
	prefix := "config."
	entries, err := registryStore.List(ctx, "system", &prefix)
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

// ApplyRegistryToConfig applies registry values directly to an existing config
// This is used when we want to enhance a config without re-parsing command line arguments
func ApplyRegistryToConfig(cfg *Config, registryStore registrystore.Store) error {
	ctx := context.Background()
	prefix := "config."
	entries, err := registryStore.List(ctx, "system", &prefix)
	if err != nil {
		// Registry values are optional, so we can continue without them
		return nil
	}

	for _, entry := range entries {
		if entry.Value == "" {
			continue
		}

		flagName := GetFlagNameForRegistryKey(entry.Key)

		// Apply registry values directly to config fields
		switch flagName {
		case "port":
			if portInt, err := strconv.Atoi(entry.Value); err == nil {
				cfg.Port = portInt
			}
		case "db-path":
			cfg.DBPath = entry.Value
		case "storage-type":
			cfg.StorageType = entry.Value
		case "jwt-secret":
			cfg.JWTSecret = entry.Value
		case "jwt-expiration":
			if duration, err := time.ParseDuration(entry.Value); err == nil {
				cfg.JWTExpiration = duration
			}
		case "allow-guest-mode":
			if boolVal, err := strconv.ParseBool(entry.Value); err == nil {
				cfg.AllowGuestMode = boolVal
			}
		case "file-base-dir":
			cfg.FileBaseDir = entry.Value
		case "file-mkdir-permissions":
			if perm, err := strconv.ParseUint(entry.Value, 8, 32); err == nil {
				cfg.FileMkdirPermissions = os.FileMode(perm)
			}
		case "file-write-permissions":
			if perm, err := strconv.ParseUint(entry.Value, 8, 32); err == nil {
				cfg.FileWritePermissions = os.FileMode(perm)
			}
		case "s3-bucket":
			cfg.S3Bucket = entry.Value
		case "s3-region":
			cfg.S3Region = entry.Value
		case "s3-endpoint":
			cfg.S3Endpoint = entry.Value
		case "s3-access-key-id":
			cfg.S3AccessKeyID = entry.Value
		case "s3-secret-access-key":
			cfg.S3SecretAccessKey = entry.Value
		case "s3-session-token":
			cfg.S3SessionToken = entry.Value
		case "s3-base-dir":
			cfg.S3BaseDir = entry.Value
		case "imagor-mode":
			cfg.ImagorMode = entry.Value
		case "imagor-url":
			cfg.ImagorURL = entry.Value
		case "imagor-secret":
			cfg.ImagorSecret = entry.Value
		case "imagor-unsafe":
			if boolVal, err := strconv.ParseBool(entry.Value); err == nil {
				cfg.ImagorUnsafe = boolVal
			}
		case "imagor-result-storage":
			cfg.ImagorResultStorage = entry.Value
		}
	}

	// Validate storage configuration after applying registry values
	return cfg.validateStorageConfig()
}

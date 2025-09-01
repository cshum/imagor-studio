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

	// FlagSet used for configuration parsing - exposed for reuse
	FlagSet *flag.FlagSet

	// Track where each configuration value came from
	ValueSources map[string]string // flag_name -> source ("registry", "env", "config_file", "args", "default")
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
		FlagSet:              fs,
		ValueSources:         make(map[string]string),
	}

	// Track value sources for configuration override detection AFTER flag parsing
	if err := cfg.trackValueSources(opts.RegistryStore, args); err != nil {
		return nil, fmt.Errorf("error tracking value sources: %w", err)
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

// trackValueSources determines where each configuration value came from
func (c *Config) trackValueSources(registryStore registrystore.Store, args []string) error {
	// Initialize all flags as defaults first
	c.FlagSet.VisitAll(func(f *flag.Flag) {
		c.ValueSources[f.Name] = "default"
	})

	// Track registry values
	if registryStore != nil {
		ctx := context.Background()
		prefix := "config."
		entries, err := registryStore.List(ctx, "system", &prefix)
		if err == nil {
			for _, entry := range entries {
				if entry.Value != "" {
					configKey := strings.TrimPrefix(entry.Key, prefix)
					flagName := strings.ReplaceAll(configKey, "_", "-")

					// Check if this flag exists and has a registry value
					if flag := c.FlagSet.Lookup(flagName); flag != nil {
						c.ValueSources[flagName] = "registry"
					}
				}
			}
		}
	}

	// Track environment variables
	c.FlagSet.VisitAll(func(f *flag.Flag) {
		envName := strings.ToUpper(strings.ReplaceAll(f.Name, "-", "_"))
		if envValue, exists := os.LookupEnv(envName); exists && envValue != "" {
			c.ValueSources[f.Name] = "env"
		}
	})

	// Track command line arguments
	if len(args) > 0 {
		for i := 0; i < len(args); i++ {
			arg := args[i]
			if strings.HasPrefix(arg, "--") {
				flagName := strings.TrimPrefix(arg, "--")
				// Handle flags with values (--flag=value or --flag value)
				if strings.Contains(flagName, "=") {
					flagName = strings.Split(flagName, "=")[0]
				}
				if c.FlagSet.Lookup(flagName) != nil {
					c.ValueSources[flagName] = "args"
				}
			}
		}
	}

	return nil
}

// GetByRegistryKey returns the effective config value and whether the config key is overridden by external config
func (c *Config) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
	// Only check config override for keys with "config." prefix
	if !strings.HasPrefix(registryKey, "config.") {
		return "", false
	}

	// Convert registry key to flag name
	flagName := GetFlagNameForRegistryKey(registryKey)

	// Use the exposed FlagSet to check if the flag exists and get its current value
	if c.FlagSet == nil {
		return "", false
	}

	// Look up the flag to verify it exists
	flagValue := c.FlagSet.Lookup(flagName)
	if flagValue == nil {
		return "", false
	}

	// Check if this flag is being set by external configuration sources
	// Only return exists=true if the value source is from external config (not default or registry)
	valueSource, hasSource := c.ValueSources[flagName]
	if !hasSource {
		return "", false
	}

	// Consider it overridden only if set by env vars, config file, or command line args
	// Not if it's just the default value or set by registry
	isOverriddenByExternalConfig := valueSource == "env" || valueSource == "config_file" || valueSource == "args"
	if !isOverriddenByExternalConfig {
		return "", false
	}

	// Get the current effective value from the flag
	effectiveValue = flagValue.Value.String()

	return effectiveValue, true
}

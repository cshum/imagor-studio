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

	// Define the mapping of registry keys to flag names
	registryKeyToFlag := map[string]string{
		"storage_type":          "storage-type",
		"file_base_dir":         "file-base-dir",
		"s3_bucket":             "s3-bucket",
		"s3_region":             "s3-region",
		"s3_endpoint":           "s3-endpoint",
		"s3_access_key_id":      "s3-access-key-id",
		"s3_secret_access_key":  "s3-secret-access-key",
		"s3_session_token":      "s3-session-token",
		"s3_base_dir":           "s3-base-dir",
		"imagor_mode":           "imagor-mode",
		"imagor_url":            "imagor-url",
		"imagor_secret":         "imagor-secret",
		"imagor_result_storage": "imagor-result-storage",
	}

	// Fetch all system registry entries at once (more efficient than individual Gets)
	entries, err := p.registryStore.List(ctx, "system", nil)
	if err != nil {
		// Log error but continue - registry values are optional
		return nil
	}

	// Apply registry values to flags
	for _, entry := range entries {
		if flagName, exists := registryKeyToFlag[entry.Key]; exists && entry.Value != "" {
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

	// Define the mapping of registry keys to flag names
	registryKeyToFlag := map[string]string{
		"storage_type":          "storage-type",
		"file_base_dir":         "file-base-dir",
		"s3_bucket":             "s3-bucket",
		"s3_region":             "s3-region",
		"s3_endpoint":           "s3-endpoint",
		"s3_access_key_id":      "s3-access-key-id",
		"s3_secret_access_key":  "s3-secret-access-key",
		"s3_session_token":      "s3-session-token",
		"s3_base_dir":           "s3-base-dir",
		"imagor_mode":           "imagor-mode",
		"imagor_url":            "imagor-url",
		"imagor_secret":         "imagor-secret",
		"imagor_result_storage": "imagor-result-storage",
	}

	// Fetch all system registry entries at once (more efficient than individual Gets)
	entries, err := registryStore.List(ctx, "system", nil)
	if err != nil {
		// Log error but continue - registry values are optional
		return nil
	}

	// Apply registry values to flags
	for _, entry := range entries {
		if flagName, exists := registryKeyToFlag[entry.Key]; exists && entry.Value != "" {
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
	// Convert flag name to registry key format
	// e.g., "storage-type" -> "storage_type"
	return strings.ReplaceAll(strings.ToLower(flagName), "-", "_")
}

// GetFlagNameForRegistryKey returns the flag name for a given registry key
func GetFlagNameForRegistryKey(registryKey string) string {
	// Convert registry key to flag name format
	// e.g., "storage_type" -> "storage-type"
	return strings.ReplaceAll(strings.ToLower(registryKey), "_", "-")
}

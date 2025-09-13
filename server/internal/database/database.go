package database

import (
	"database/sql"
	"fmt"
	"net/url"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/mysqldialect"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// Config holds database connection configuration
type Config struct {
	Type     string
	Host     string
	Port     string
	Database string
	Username string
	Password string
	SSLMode  string
	Path     string // For SQLite
}

// ParseDatabaseURL parses a DATABASE_URL and returns a DatabaseConfig
func ParseDatabaseURL(databaseURL string) (*Config, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	// Handle SQLite format: sqlite:./path/to/db.sqlite
	if strings.HasPrefix(databaseURL, "sqlite:") {
		path := strings.TrimPrefix(databaseURL, "sqlite:")
		return &Config{
			Type: "sqlite",
			Path: path,
		}, nil
	}

	// Parse standard URL format for PostgreSQL and MySQL
	u, err := url.Parse(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid DATABASE_URL format: %w", err)
	}

	// Validate that we have a proper scheme
	if u.Scheme == "" {
		return nil, fmt.Errorf("invalid DATABASE_URL: missing scheme")
	}

	config := &Config{
		Type:     u.Scheme,
		Host:     u.Hostname(),
		Port:     u.Port(),
		Database: strings.TrimPrefix(u.Path, "/"),
	}

	if u.User != nil {
		config.Username = u.User.Username()
		if password, ok := u.User.Password(); ok {
			config.Password = password
		}
	}

	// Parse query parameters
	query := u.Query()
	config.SSLMode = query.Get("sslmode")

	// Set default ports if not specified
	if config.Port == "" {
		switch config.Type {
		case "postgres", "postgresql":
			config.Port = "5432"
		case "mysql":
			config.Port = "3306"
		}
	}

	// Normalize PostgreSQL scheme
	if config.Type == "postgresql" {
		config.Type = "postgres"
	}

	return config, nil
}

// Connect creates a database connection based on the provided DATABASE_URL
func Connect(databaseURL string) (*bun.DB, error) {
	config, err := ParseDatabaseURL(databaseURL)
	if err != nil {
		return nil, err
	}

	switch config.Type {
	case "sqlite":
		return connectSQLite(config)
	case "postgres":
		return connectPostgreSQL(config)
	case "mysql":
		return connectMySQL(config)
	default:
		return nil, fmt.Errorf("unsupported database type: %s (supported: sqlite, postgres, mysql)", config.Type)
	}
}

// connectSQLite creates a SQLite connection
func connectSQLite(config *Config) (*bun.DB, error) {
	sqldb, err := sql.Open(sqliteshim.ShimName, config.Path)
	if err != nil {
		return nil, fmt.Errorf("failed to open SQLite database: %w", err)
	}

	db := bun.NewDB(sqldb, sqlitedialect.New())
	return db, nil
}

// connectPostgreSQL creates a PostgreSQL connection
func connectPostgreSQL(config *Config) (*bun.DB, error) {
	// Build PostgreSQL DSN
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database,
	)

	// Add SSL mode if specified
	if config.SSLMode != "" {
		dsn += "?sslmode=" + config.SSLMode
	}

	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))
	db := bun.NewDB(sqldb, pgdialect.New())
	return db, nil
}

// connectMySQL creates a MySQL connection
func connectMySQL(config *Config) (*bun.DB, error) {
	// Build MySQL DSN
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database,
	)

	sqldb, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open MySQL database: %w", err)
	}

	db := bun.NewDB(sqldb, mysqldialect.New())
	return db, nil
}

// GetDatabaseType returns the database type from a DATABASE_URL
func GetDatabaseType(databaseURL string) (string, error) {
	config, err := ParseDatabaseURL(databaseURL)
	if err != nil {
		return "", err
	}
	return config.Type, nil
}

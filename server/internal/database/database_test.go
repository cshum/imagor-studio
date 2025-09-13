package database

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseDatabaseURL(t *testing.T) {
	tests := []struct {
		name        string
		databaseURL string
		expected    *Config
		expectError bool
	}{
		{
			name:        "SQLite URL",
			databaseURL: "sqlite:./test.db",
			expected: &Config{
				Type: "sqlite",
				Path: "./test.db",
			},
			expectError: false,
		},
		{
			name:        "PostgreSQL URL",
			databaseURL: "postgres://user:pass@localhost:5432/dbname?sslmode=disable",
			expected: &Config{
				Type:     "postgres",
				Host:     "localhost",
				Port:     "5432",
				Database: "dbname",
				Username: "user",
				Password: "pass",
				SSLMode:  "disable",
			},
			expectError: false,
		},
		{
			name:        "PostgreSQL URL with postgresql scheme",
			databaseURL: "postgresql://user:pass@localhost:5432/dbname",
			expected: &Config{
				Type:     "postgres",
				Host:     "localhost",
				Port:     "5432",
				Database: "dbname",
				Username: "user",
				Password: "pass",
			},
			expectError: false,
		},
		{
			name:        "MySQL URL",
			databaseURL: "mysql://user:pass@localhost:3306/dbname",
			expected: &Config{
				Type:     "mysql",
				Host:     "localhost",
				Port:     "3306",
				Database: "dbname",
				Username: "user",
				Password: "pass",
			},
			expectError: false,
		},
		{
			name:        "PostgreSQL URL with default port",
			databaseURL: "postgres://user:pass@localhost/dbname",
			expected: &Config{
				Type:     "postgres",
				Host:     "localhost",
				Port:     "5432",
				Database: "dbname",
				Username: "user",
				Password: "pass",
			},
			expectError: false,
		},
		{
			name:        "MySQL URL with default port",
			databaseURL: "mysql://user:pass@localhost/dbname",
			expected: &Config{
				Type:     "mysql",
				Host:     "localhost",
				Port:     "3306",
				Database: "dbname",
				Username: "user",
				Password: "pass",
			},
			expectError: false,
		},
		{
			name:        "Empty DATABASE_URL",
			databaseURL: "",
			expected:    nil,
			expectError: true,
		},
		{
			name:        "Invalid URL",
			databaseURL: "invalid-url",
			expected:    nil,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config, err := ParseDatabaseURL(tt.databaseURL)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, config)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expected, config)
			}
		})
	}
}

func TestGetDatabaseType(t *testing.T) {
	tests := []struct {
		name        string
		databaseURL string
		expected    string
		expectError bool
	}{
		{
			name:        "SQLite",
			databaseURL: "sqlite:./test.db",
			expected:    "sqlite",
			expectError: false,
		},
		{
			name:        "PostgreSQL",
			databaseURL: "postgres://user:pass@localhost:5432/dbname",
			expected:    "postgres",
			expectError: false,
		},
		{
			name:        "MySQL",
			databaseURL: "mysql://user:pass@localhost:3306/dbname",
			expected:    "mysql",
			expectError: false,
		},
		{
			name:        "Invalid URL",
			databaseURL: "",
			expected:    "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbType, err := GetDatabaseType(tt.databaseURL)

			if tt.expectError {
				assert.Error(t, err)
				assert.Empty(t, dbType)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expected, dbType)
			}
		})
	}
}

func TestConnect_SQLite(t *testing.T) {
	// Test SQLite connection (this should work without external dependencies)
	db, err := Connect("sqlite::memory:")
	require.NoError(t, err)
	require.NotNil(t, db)

	// Test that we can ping the database
	err = db.Ping()
	assert.NoError(t, err)

	// Close the connection
	err = db.Close()
	assert.NoError(t, err)
}

func TestConnect_UnsupportedDatabase(t *testing.T) {
	_, err := Connect("unsupported://user:pass@localhost:1234/dbname")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported database type")
}

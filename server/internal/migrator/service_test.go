package migrator

import (
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/database"
	"go.uber.org/zap/zaptest"
)

func TestNewService(t *testing.T) {
	logger := zaptest.NewLogger(t)

	tests := []struct {
		name        string
		databaseURL string
		wantErr     bool
	}{
		{
			name:        "valid sqlite url",
			databaseURL: "sqlite::memory:",
			wantErr:     false,
		},
		{
			name:        "invalid database url",
			databaseURL: "invalid://url",
			wantErr:     true,
		},
		{
			name:        "empty database url",
			databaseURL: "",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, err := database.Connect(tt.databaseURL)
			if (err != nil) != tt.wantErr {
				t.Errorf("database.Connect() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if db != nil {
				defer db.Close()
				service := NewService(db, logger)
				if service == nil {
					t.Errorf("NewService() returned nil")
				}
			}
		})
	}
}

func TestService_ValidateConnection(t *testing.T) {
	logger := zaptest.NewLogger(t)
	db, err := database.Connect("sqlite::memory:")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	service := NewService(db, logger)
	err = service.ValidateConnection()
	if err != nil {
		t.Errorf("ValidateConnection() error = %v", err)
	}
}

func TestService_GetMigrationCount(t *testing.T) {
	logger := zaptest.NewLogger(t)
	db, err := database.Connect("sqlite::memory:")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	service := NewService(db, logger)
	count := service.GetMigrationCount()
	if count <= 0 {
		t.Errorf("GetMigrationCount() = %v, want > 0", count)
	}
}

func TestService_Execute(t *testing.T) {
	logger := zaptest.NewLogger(t)
	db, err := database.Connect("sqlite::memory:")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	service := NewService(db, logger)

	tests := []struct {
		name    string
		config  *config.Config
		wantErr bool
	}{
		{
			name: "valid up command",
			config: &config.Config{
				DatabaseURL:    "sqlite::memory:",
				MigrateCommand: "up",
			},
			wantErr: false,
		},
		{
			name: "valid status command",
			config: &config.Config{
				DatabaseURL:    "sqlite::memory:",
				MigrateCommand: "status",
			},
			wantErr: false,
		},
		{
			name: "invalid command",
			config: &config.Config{
				DatabaseURL:    "sqlite::memory:",
				MigrateCommand: "invalid",
			},
			wantErr: true,
		},
		{
			name: "empty command",
			config: &config.Config{
				DatabaseURL:    "sqlite::memory:",
				MigrateCommand: "",
			},
			wantErr: true,
		},
		{
			name: "uppercase command",
			config: &config.Config{
				DatabaseURL:    "sqlite::memory:",
				MigrateCommand: "UP",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.Execute(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("Service.Execute() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

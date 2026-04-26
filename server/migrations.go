package tools

import (
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/database"
	"github.com/cshum/imagor-studio/server/internal/migrator"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type MigrationConfig struct {
	DatabaseURL             string
	ForceAutoMigrate        bool
	MigrateCommand          string
	PostgresMaxOpenConns    int
	PostgresMaxIdleConns    int
	PostgresConnMaxLifetime time.Duration
	PostgresConnMaxIdleTime time.Duration
}

func LoadMigrationConfig(args []string) (MigrationConfig, error) {
	cfg, err := config.Load(args, nil)
	if err != nil {
		return MigrationConfig{}, err
	}
	return MigrationConfig{
		DatabaseURL:             cfg.DatabaseURL,
		ForceAutoMigrate:        cfg.ForceAutoMigrate,
		MigrateCommand:          cfg.MigrateCommand,
		PostgresMaxOpenConns:    cfg.DBMaxOpenConns,
		PostgresMaxIdleConns:    cfg.DBMaxIdleConns,
		PostgresConnMaxLifetime: cfg.DBConnMaxLifetime,
		PostgresConnMaxIdleTime: cfg.DBConnMaxIdleTime,
	}, nil
}

func ConnectMigrationDatabase(cfg MigrationConfig) (*bun.DB, error) {
	return database.ConnectWithOptions(cfg.DatabaseURL, database.ConnectionOptions{
		PostgresMaxOpenConns:    cfg.PostgresMaxOpenConns,
		PostgresMaxIdleConns:    cfg.PostgresMaxIdleConns,
		PostgresConnMaxLifetime: cfg.PostgresConnMaxLifetime,
		PostgresConnMaxIdleTime: cfg.PostgresConnMaxIdleTime,
	})
}

func RunMigrations(db *bun.DB, databaseURL, command string, logger *zap.Logger) error {
	service := migrator.NewService(db, logger)
	return service.ExecuteCommand(databaseURL, command)
}

func RunAutoMigration(db *bun.DB, databaseURL string, forceAutoMigrate bool, logger *zap.Logger) (bool, error) {
	service := migrator.NewService(db, logger)
	return service.ExecuteAutoMigrationFor(databaseURL, forceAutoMigrate)
}

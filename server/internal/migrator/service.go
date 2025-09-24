package migrator

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/database"
	"github.com/cshum/imagor-studio/server/internal/migrations"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

// Service handles database migration operations
type Service struct {
	db     *bun.DB
	logger *zap.Logger
}

// NewService creates a new migration service
func NewService(db *bun.DB, logger *zap.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
	}
}

// Close closes the database connection
func (s *Service) Close() error {
	return s.db.Close()
}

// ExecuteAutoMigration handles auto-migration decision based on database type and configuration
func (s *Service) ExecuteAutoMigration(cfg *config.Config) error {
	// Determine database type
	dbType, err := database.GetDatabaseType(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("failed to determine database type: %w", err)
	}

	// Check if we should run auto-migration
	shouldAutoMigrate := dbType == "sqlite" || cfg.ForceAutoMigrate

	if shouldAutoMigrate {
		s.logger.Info("Running auto-migration",
			zap.String("databaseType", dbType),
			zap.Bool("forceAutoMigrate", cfg.ForceAutoMigrate))

		// Set command to "up" and execute
		cfg.MigrateCommand = "up"
		return s.Execute(cfg)
	} else {
		s.logger.Info("Auto-migration disabled for database type",
			zap.String("databaseType", dbType))
		s.logger.Info("To run migrations manually, use: ./imagor-studio-migrate --migrate-command=up --database-url=\"" + cfg.DatabaseURL + "\"")
		s.logger.Info("Or set FORCE_AUTO_MIGRATE=true environment variable to enable auto-migration")
		return nil
	}
}

// Execute runs the specified migration command
func (s *Service) Execute(cfg *config.Config) error {
	// Validate command first
	switch cfg.MigrateCommand {
	case "up", "down", "status", "reset":
		// Valid command, continue
	default:
		return fmt.Errorf("invalid migration command: %s (valid: up, down, status, reset)", cfg.MigrateCommand)
	}

	// Check database type and warn if using SQLite
	dbType, err := database.GetDatabaseType(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("failed to determine database type: %w", err)
	}

	if dbType == "sqlite" {
		s.logger.Warn("SQLite detected - auto-migration is usually sufficient for SQLite databases")
	}

	// Create migrator
	migrator := migrate.NewMigrator(s.db, migrations.Migrations)

	// Initialize migrator
	err = migrator.Init(context.Background())
	if err != nil {
		return fmt.Errorf("failed to initialize migrator: %w", err)
	}

	// Execute command
	switch cfg.MigrateCommand {
	case "up":
		return s.migrateUp(migrator)
	case "down":
		return s.migrateDown(migrator)
	case "status":
		return s.migrateStatus(migrator)
	case "reset":
		return s.migrateReset(migrator)
	default:
		// This should never happen due to validation above, but keeping for safety
		return fmt.Errorf("unknown command: %s", cfg.MigrateCommand)
	}
}

// migrateUp runs pending migrations
func (s *Service) migrateUp(migrator *migrate.Migrator) error {
	s.logger.Info("Running migrations...")

	group, err := migrator.Migrate(context.Background())
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	if group.IsZero() {
		s.logger.Info("No migrations to run - database is up to date")
	} else {
		s.logger.Info("Migrations completed successfully", zap.String("group", group.String()))
	}

	return nil
}

// migrateDown rolls back the last migration
func (s *Service) migrateDown(migrator *migrate.Migrator) error {
	s.logger.Info("Rolling back last migration...")

	group, err := migrator.Rollback(context.Background())
	if err != nil {
		return fmt.Errorf("failed to rollback migration: %w", err)
	}

	if group.IsZero() {
		s.logger.Info("No migrations to rollback")
	} else {
		s.logger.Info("Migration rolled back successfully", zap.String("group", group.String()))
	}

	return nil
}

// migrateStatus shows migration status
func (s *Service) migrateStatus(migrator *migrate.Migrator) error {
	s.logger.Info("Checking migration status...")

	ms, err := migrator.MigrationsWithStatus(context.Background())
	if err != nil {
		return fmt.Errorf("failed to get migration status: %w", err)
	}

	fmt.Println("Migration Status:")
	fmt.Println("================")

	if len(ms) == 0 {
		fmt.Println("No migrations found")
		return nil
	}

	for _, m := range ms {
		status := "PENDING"
		if m.GroupID > 0 {
			status = "APPLIED"
		}
		fmt.Printf("%-50s %s\n", m.Name, status)
	}

	return nil
}

// migrateReset resets all migrations (dangerous operation)
func (s *Service) migrateReset(migrator *migrate.Migrator) error {
	s.logger.Warn("DANGER: Resetting all migrations - this will drop all tables!")

	// Confirmation prompt
	fmt.Print("Are you sure you want to reset all migrations? This will DROP ALL TABLES! (yes/no): ")
	var confirmation string
	fmt.Scanln(&confirmation)

	if confirmation != "yes" {
		s.logger.Info("Migration reset cancelled")
		return nil
	}

	s.logger.Info("Resetting migrations...")

	// Rollback all migrations
	for {
		group, err := migrator.Rollback(context.Background())
		if err != nil {
			return fmt.Errorf("failed to rollback migrations: %w", err)
		}
		if group.IsZero() {
			break
		}
		s.logger.Info("Rolled back migration", zap.String("group", group.String()))
	}

	s.logger.Info("All migrations have been reset")
	return nil
}

// ValidateConnection tests the database connection
func (s *Service) ValidateConnection() error {
	return s.db.Ping()
}

// GetMigrationCount returns the number of available migrations
func (s *Service) GetMigrationCount() int {
	return len(migrations.Migrations.Sorted())
}

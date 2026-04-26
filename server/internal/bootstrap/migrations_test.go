package bootstrap

import (
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

func TestRunMigrationsIfNeeded_UsesCustomRunner(t *testing.T) {
	db, err := initializeDatabase(&config.Config{DatabaseURL: "sqlite::memory:"})
	require.NoError(t, err)
	defer db.Close()

	called := false
	err = runMigrationsIfNeeded(db, &config.Config{DatabaseURL: "sqlite::memory:", ForceAutoMigrate: true}, zap.NewNop(), func(db *bun.DB, cfg management.AutoMigrationConfig, logger *zap.Logger) error {
		called = true
		require.Equal(t, "sqlite::memory:", cfg.DatabaseURL)
		require.True(t, cfg.ForceAutoMigrate)
		return nil
	})
	require.NoError(t, err)
	require.True(t, called)
}

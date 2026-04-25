package userstore

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
)

func setupPostgresTestDB(t *testing.T) (*bun.DB, func()) {
	t.Helper()
	if os.Getenv("IMAGOR_RUN_POSTGRES_TESTS") != "1" {
		t.Skip("set IMAGOR_RUN_POSTGRES_TESTS=1 to run Postgres integration tests")
	}
	if _, err := os.Stat("/var/run/docker.sock"); err != nil {
		t.Skip("docker is not available")
	}

	ctx := context.Background()
	container, err := postgres.Run(ctx, "postgres:16-alpine",
		postgres.WithDatabase("imagor_studio_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
	)
	require.NoError(t, err)

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))
	require.Eventually(t, func() bool {
		pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		return sqldb.PingContext(pingCtx) == nil
	}, 30*time.Second, 250*time.Millisecond)

	db := bun.NewDB(sqldb, pgdialect.New())
	_, err = db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			display_name TEXT NOT NULL,
			username TEXT NOT NULL UNIQUE,
			hashed_password TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			email TEXT,
			pending_email TEXT,
			email_verified BOOLEAN NOT NULL DEFAULT FALSE,
			avatar_url TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	require.NoError(t, err)
	_, err = db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS oauth_identities (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			provider TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			email TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(provider, provider_id)
		)
	`)
	require.NoError(t, err)
	_, err = db.ExecContext(ctx, `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username)
	`)
	require.NoError(t, err)

	cleanup := func() {
		require.NoError(t, db.Close())
		require.NoError(t, sqldb.Close())
		require.NoError(t, container.Terminate(context.Background()))
	}

	return db, cleanup
}

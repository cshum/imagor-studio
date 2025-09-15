package migrations

import (
	"embed"

	"github.com/uptrace/bun/migrate"
)

//go:embed *.go
var migrationsFS embed.FS

var Migrations = migrate.NewMigrations()

func init() {
	if err := Migrations.Discover(migrationsFS); err != nil {
		panic(err)
	}
}

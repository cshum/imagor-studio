package graphql

import (
	"github.com/cshum/imagor-studio/server/internal/storage"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	Storage storage.Storage
}

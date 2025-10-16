package noop

import "errors"

// Common error messages for embedded mode operations
var (
	ErrEmbeddedMode = errors.New("operation not available in embedded mode")
)

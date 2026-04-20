package noop

import "errors"

// Common error messages for embedded mode operations
var (
	ErrEmbeddedMode  = errors.New("operation not available in embedded mode")
	ErrCloudDisabled = errors.New("operation not available in self-hosted mode")
)

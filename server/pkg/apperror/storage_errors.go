package apperror

// Storage error codes
const (
	// ErrCodeFileAlreadyExists indicates that a file or folder already exists at the destination
	ErrCodeFileAlreadyExists = "FILE_ALREADY_EXISTS"

	// ErrCodeFileNotFound indicates that a file or folder was not found
	ErrCodeFileNotFound = "FILE_NOT_FOUND"

	// ErrCodeStorageError indicates a general storage operation error
	ErrCodeStorageError = "STORAGE_ERROR"
)

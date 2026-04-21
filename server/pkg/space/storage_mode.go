package space

import "strings"

const (
	StorageModePlatform = "platform"
	StorageModeBYOB     = "byob"
)

func NormalizeStorageMode(mode string) string {
	switch strings.TrimSpace(strings.ToLower(mode)) {
	case "", StorageModePlatform:
		return StorageModePlatform
	case StorageModeBYOB:
		return StorageModeBYOB
	default:
		return strings.TrimSpace(strings.ToLower(mode))
	}
}

func IsValidStorageMode(mode string) bool {
	switch NormalizeStorageMode(mode) {
	case StorageModePlatform, StorageModeBYOB:
		return true
	default:
		return false
	}
}

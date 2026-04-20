package uuid

import (
	"github.com/google/uuid"
)

// GenerateUUID generates a new UUID v4 string
func GenerateUUID() string {
	return uuid.New().String()
}

// IsValidUUID checks if a string is a valid UUID
func IsValidUUID(u string) bool {
	_, err := uuid.Parse(u)
	return err == nil
}

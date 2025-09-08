package registrystore

import (
	"fmt"
	"strings"
)

const (
	// SystemNamespace represents system-wide settings
	SystemNamespace = "system"
	// UserNamespace represents user-specific settings
	UserNamespace = "user"
	// SystemOwnerID the owner ID for system-wide settings
	SystemOwnerID = "system:global"
)

// UserOwnerID creates a namespaced owner ID for a user
func UserOwnerID(userID string) string {
	return fmt.Sprintf("user:%s", userID)
}

// ParseOwnerID parses a namespaced owner ID into namespace and identifier
func ParseOwnerID(ownerID string) (namespace, id string, err error) {
	parts := strings.SplitN(ownerID, ":", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid owner ID format: expected 'namespace:id', got '%s'", ownerID)
	}

	namespace = parts[0]
	id = parts[1]

	// Validate namespace
	switch namespace {
	case SystemNamespace, UserNamespace:
		// Valid namespaces
	default:
		return "", "", fmt.Errorf("invalid namespace '%s': must be one of [%s, %s]", namespace, SystemNamespace, UserNamespace)
	}

	// Validate ID is not empty
	if id == "" {
		return "", "", fmt.Errorf("invalid owner ID: identifier cannot be empty")
	}

	return namespace, id, nil
}

// ValidateOwnerID validates that an owner ID follows the correct namespace format
func ValidateOwnerID(ownerID string) error {
	_, _, err := ParseOwnerID(ownerID)
	return err
}

// IsSystemOwnerID checks if the owner ID represents system settings
func IsSystemOwnerID(ownerID string) bool {
	return ownerID == SystemOwnerID
}

// IsUserOwnerID checks if the owner ID represents user settings
func IsUserOwnerID(ownerID string) bool {
	namespace, _, err := ParseOwnerID(ownerID)
	return err == nil && namespace == UserNamespace
}

// GetUserIDFromOwnerID extracts the user ID from a user owner ID
func GetUserIDFromOwnerID(ownerID string) (string, error) {
	namespace, id, err := ParseOwnerID(ownerID)
	if err != nil {
		return "", err
	}

	if namespace != UserNamespace {
		return "", fmt.Errorf("owner ID '%s' is not a user owner ID", ownerID)
	}

	return id, nil
}

package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const (
	// DefaultCost is the default cost for bcrypt hashing
	DefaultCost = 12
	// MaxPasswordLength is the maximum password length for bcrypt (72 bytes)
	MaxPasswordLength = 72
)

// HashPassword hashes a plain text password using bcrypt
func HashPassword(password string) (string, error) {
	// Check password length - bcrypt has a 72-byte limit
	if len(password) > MaxPasswordLength {
		return "", fmt.Errorf("password length exceeds %d bytes", MaxPasswordLength)
	}

	bytes, err := bcrypt.GenerateFromPassword([]byte(password), DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(bytes), nil
}

// CheckPassword compares a hashed password with a plain text password
func CheckPassword(hashedPassword, password string) error {
	// Check password length - bcrypt has a 72-byte limit
	if len(password) > MaxPasswordLength {
		return fmt.Errorf("password length exceeds %d bytes", MaxPasswordLength)
	}

	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

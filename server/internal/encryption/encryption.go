package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"path/filepath"

	"golang.org/x/crypto/pbkdf2"
)

// Service provides encryption and decryption functionality
type Service struct {
	masterKey []byte
	jwtKey    []byte
}

// NewService creates a new encryption service with master key derived from database path
func NewService(dbPath string, jwtSecret string) *Service {
	masterKey := deriveMasterKey(dbPath)
	jwtKey := deriveJWTKey(jwtSecret)

	return &Service{
		masterKey: masterKey,
		jwtKey:    jwtKey,
	}
}

// NewServiceWithMasterKeyOnly creates encryption service with only master key (for JWT secret bootstrap)
func NewServiceWithMasterKeyOnly(dbPath string) *Service {
	masterKey := deriveMasterKey(dbPath)

	return &Service{
		masterKey: masterKey,
		jwtKey:    nil,
	}
}

// SetJWTKey sets the JWT key after it's been loaded/generated
func (s *Service) SetJWTKey(jwtSecret string) {
	s.jwtKey = deriveJWTKey(jwtSecret)
}

// deriveMasterKey creates a deterministic master key from database path
func deriveMasterKey(dbPath string) []byte {
	// Use absolute path for consistency
	absPath, err := filepath.Abs(dbPath)
	if err != nil {
		absPath = dbPath // fallback to original path
	}

	salt := "imagor-studio-registry-encryption-v1"
	return pbkdf2.Key([]byte(absPath), []byte(salt), 4096, 32, sha256.New)
}

// deriveJWTKey creates encryption key from JWT secret
func deriveJWTKey(jwtSecret string) []byte {
	salt := "imagor-studio-jwt-encryption-v1"
	return pbkdf2.Key([]byte(jwtSecret), []byte(salt), 4096, 32, sha256.New)
}

// EncryptWithMaster encrypts data using master key (for JWT secret)
func (s *Service) EncryptWithMaster(plaintext string) (string, error) {
	return s.encrypt(plaintext, s.masterKey)
}

// DecryptWithMaster decrypts data using master key (for JWT secret)
func (s *Service) DecryptWithMaster(ciphertext string) (string, error) {
	return s.decrypt(ciphertext, s.masterKey)
}

// EncryptWithJWT encrypts data using JWT-derived key (for other secrets)
func (s *Service) EncryptWithJWT(plaintext string) (string, error) {
	if s.jwtKey == nil {
		return "", fmt.Errorf("JWT key not set")
	}
	return s.encrypt(plaintext, s.jwtKey)
}

// DecryptWithJWT decrypts data using JWT-derived key (for other secrets)
func (s *Service) DecryptWithJWT(ciphertext string) (string, error) {
	if s.jwtKey == nil {
		return "", fmt.Errorf("JWT key not set")
	}
	return s.decrypt(ciphertext, s.jwtKey)
}

// encrypt encrypts plaintext using AES-256-GCM with the provided key
func (s *Service) encrypt(plaintext string, key []byte) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decrypt decrypts base64-encoded ciphertext using AES-256-GCM with the provided key
func (s *Service) decrypt(encodedCiphertext string, key []byte) (string, error) {
	if encodedCiphertext == "" {
		return "", nil
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encodedCiphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// IsJWTSecret checks if a key should be encrypted with master key (JWT secret only)
func IsJWTSecret(key string) bool {
	return key == "jwt_secret"
}

// IsEncryptedKey checks if a key should be encrypted
func IsEncryptedKey(key string) bool {
	encryptedKeys := map[string]bool{
		"jwt_secret":           true,
		"imagor_secret":        true,
		"s3_secret_access_key": true,
		"s3_access_key_id":     true,
		"s3_session_token":     true,
	}
	return encryptedKeys[key]
}

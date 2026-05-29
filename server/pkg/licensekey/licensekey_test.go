package licensekey

import (
	"crypto/ed25519"
	"testing"

	internallicense "github.com/cshum/imagor-studio/server/internal/license"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAndVerifySignedLicense(t *testing.T) {
	t.Parallel()

	seed := make([]byte, ed25519.SeedSize)
	for index := range seed {
		seed[index] = byte(index + 1)
	}
	privateKey := ed25519.NewKeyFromSeed(seed)
	publicKey := privateKey.Public().(ed25519.PublicKey)

	licenseKey, err := GenerateSignedLicense(privateKey, "supporter", "buyer@example.com")
	require.NoError(t, err)
	assert.Contains(t, licenseKey, "IMGR-")

	payload, err := VerifySignedLicense(publicKey, licenseKey)
	require.NoError(t, err)
	require.NotNil(t, payload)
	assert.Equal(t, "supporter", payload.Type)
	assert.Equal(t, "buyer@example.com", payload.Email)
	assert.NotZero(t, payload.IssuedAt)
}

func TestGenerateSignedLicense_RejectsInvalidPrivateKey(t *testing.T) {
	t.Parallel()

	_, err := GenerateSignedLicense(ed25519.PrivateKey("short"), "supporter", "buyer@example.com")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid private key size")
}

func TestGenerateSignedLicense_IsCompatibleWithInternalVerifier(t *testing.T) {
	t.Parallel()

	seed := make([]byte, ed25519.SeedSize)
	for index := range seed {
		seed[index] = byte(index + 1)
	}
	privateKey := ed25519.NewKeyFromSeed(seed)
	publicKey := privateKey.Public().(ed25519.PublicKey)

	licenseKey, err := GenerateSignedLicense(privateKey, "supporter", "buyer@example.com")
	require.NoError(t, err)

	payload, err := internallicense.VerifySignedLicense(publicKey, licenseKey)
	require.NoError(t, err)
	require.NotNil(t, payload)
	assert.Equal(t, "supporter", payload.Type)
	assert.Equal(t, "buyer@example.com", payload.Email)
}

func TestVerifySignedLicense_AcceptsInternalGeneratorOutput(t *testing.T) {
	t.Parallel()

	seed := make([]byte, ed25519.SeedSize)
	for index := range seed {
		seed[index] = byte(index + 1)
	}
	privateKey := ed25519.NewKeyFromSeed(seed)
	publicKey := privateKey.Public().(ed25519.PublicKey)

	licenseKey, err := internallicense.GenerateSignedLicense(privateKey, "supporter", "buyer@example.com")
	require.NoError(t, err)

	payload, err := VerifySignedLicense(publicKey, licenseKey)
	require.NoError(t, err)
	require.NotNil(t, payload)
	assert.Equal(t, "supporter", payload.Type)
	assert.Equal(t, "buyer@example.com", payload.Email)
}

package license

import "crypto/ed25519"

// Public key for license verification (safe to commit to repository)
// This will be populated with your actual public key after key generation
var LicensePublicKey = ed25519.PublicKey{}

// HasValidPublicKey returns true if a real public key has been configured
func HasValidPublicKey() bool {
	return len(LicensePublicKey) == 32
}

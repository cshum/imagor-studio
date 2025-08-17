package uuid

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGenerateUUID(t *testing.T) {
	// Generate multiple UUIDs
	uuids := make([]string, 100)
	for i := 0; i < 100; i++ {
		uuids[i] = GenerateUUID()
	}

	// Verify all UUIDs are unique
	seen := make(map[string]bool)
	for _, uuid := range uuids {
		assert.NotEmpty(t, uuid)
		assert.False(t, seen[uuid], "UUID should be unique: %s", uuid)
		seen[uuid] = true

		// Verify UUID format (should be 36 characters with dashes)
		assert.Len(t, uuid, 36)
		assert.True(t, IsValidUUID(uuid))
	}
}

func TestIsValidUUID(t *testing.T) {
	tests := []struct {
		name     string
		uuid     string
		expected bool
	}{
		{
			name:     "Valid UUID v4",
			uuid:     GenerateUUID(),
			expected: true,
		},
		{
			name:     "Valid UUID format with dashes",
			uuid:     "550e8400-e29b-41d4-a716-446655440000",
			expected: true,
		},
		{
			name:     "Valid UUID format without dashes", // google/uuid accepts this
			uuid:     "550e8400e29b41d4a716446655440000",
			expected: true,
		},
		{
			name:     "Invalid UUID - too short",
			uuid:     "550e8400-e29b-41d4-a716",
			expected: false,
		},
		{
			name:     "Invalid UUID - wrong format",
			uuid:     "not-a-uuid-at-all",
			expected: false,
		},
		{
			name:     "Empty string",
			uuid:     "",
			expected: false,
		},
		{
			name:     "Invalid characters",
			uuid:     "550e8400-e29b-41d4-a716-44665544000g",
			expected: false,
		},
		{
			name:     "Too short without dashes",
			uuid:     "550e8400e29b41d4a716",
			expected: false,
		},
		{
			name:     "Too long",
			uuid:     "550e8400-e29b-41d4-a716-446655440000-extra",
			expected: false,
		},
		{
			name:     "Wrong dash placement",
			uuid:     "550e8400-e29b4-1d4a-716-446655440000",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidUUID(tt.uuid)
			assert.Equal(t, tt.expected, result, "UUID: %s", tt.uuid)
		})
	}
}

func BenchmarkGenerateUUID(b *testing.B) {
	for i := 0; i < b.N; i++ {
		GenerateUUID()
	}
}

func BenchmarkIsValidUUID(b *testing.B) {
	uuid := GenerateUUID()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		IsValidUUID(uuid)
	}
}

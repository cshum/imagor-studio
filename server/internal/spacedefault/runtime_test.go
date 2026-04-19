package spacedefault

import (
	"strings"
	"testing"
)

func TestValidateSpaceKey(t *testing.T) {
	tests := []struct {
		name    string
		key     string
		wantErr bool
	}{
		{"single alphanumeric", "a", false},
		{"simple word", "acme", false},
		{"digits only", "123", false},
		{"hyphen in middle", "my-space", false},
		{"alphanumeric mixed", "a1b2", false},
		{"two chars", "ab", false},
		{"digit-hyphen-digit", "1-2", false},
		{"max length 63", strings.Repeat("a", 63), false},
		{"mixed with leading digit", "1abc", false},
		{"empty", "", true},
		{"too long 64", strings.Repeat("a", 64), true},
		{"uppercase letter", "Acme", true},
		{"leading hyphen", "-acme", true},
		{"trailing hyphen", "acme-", true},
		{"both leading and trailing hyphen", "-acme-", true},
		{"underscore", "my_space", true},
		{"dot", "my.space", true},
		{"space character", "my space", true},
		{"slash", "my/space", true},
		{"hyphen only", "-", true},
		{"hyphen first of two chars", "-a", true},
		{"hyphen last of two chars", "a-", true},
		{"uppercase only", "ACME", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSpaceKey(tt.key)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateSpaceKey(%q) error = %v, wantErr %v", tt.key, err, tt.wantErr)
			}
		})
	}
}

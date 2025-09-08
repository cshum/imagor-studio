package registrystore

import (
	"testing"
)

func TestUserOwnerID(t *testing.T) {
	userID := "123e4567-e89b-12d3-a456-426614174000"
	expected := "user:123e4567-e89b-12d3-a456-426614174000"
	actual := UserOwnerID(userID)
	if actual != expected {
		t.Errorf("UserOwnerID(%q) = %q, want %q", userID, actual, expected)
	}
}

func TestParseOwnerID(t *testing.T) {
	tests := []struct {
		name    string
		ownerID string
		wantNS  string
		wantID  string
		wantErr bool
	}{
		{
			name:    "system owner ID",
			ownerID: "system:global",
			wantNS:  "system",
			wantID:  "global",
			wantErr: false,
		},
		{
			name:    "user owner ID",
			ownerID: "user:123e4567-e89b-12d3-a456-426614174000",
			wantNS:  "user",
			wantID:  "123e4567-e89b-12d3-a456-426614174000",
			wantErr: false,
		},
		{
			name:    "invalid format - no colon",
			ownerID: "invalid",
			wantErr: true,
		},
		{
			name:    "invalid format - empty ID",
			ownerID: "user:",
			wantErr: true,
		},
		{
			name:    "invalid namespace",
			ownerID: "invalid:id",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotNS, gotID, err := ParseOwnerID(tt.ownerID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseOwnerID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if gotNS != tt.wantNS {
					t.Errorf("ParseOwnerID() namespace = %v, want %v", gotNS, tt.wantNS)
				}
				if gotID != tt.wantID {
					t.Errorf("ParseOwnerID() id = %v, want %v", gotID, tt.wantID)
				}
			}
		})
	}
}

func TestValidateOwnerID(t *testing.T) {
	tests := []struct {
		name    string
		ownerID string
		wantErr bool
	}{
		{
			name:    "valid system owner ID",
			ownerID: "system:global",
			wantErr: false,
		},
		{
			name:    "valid user owner ID",
			ownerID: "user:123e4567-e89b-12d3-a456-426614174000",
			wantErr: false,
		},
		{
			name:    "invalid format",
			ownerID: "invalid",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateOwnerID(tt.ownerID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateOwnerID() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestIsSystemOwnerID(t *testing.T) {
	tests := []struct {
		name    string
		ownerID string
		want    bool
	}{
		{
			name:    "system owner ID",
			ownerID: "system:global",
			want:    true,
		},
		{
			name:    "user owner ID",
			ownerID: "user:123e4567-e89b-12d3-a456-426614174000",
			want:    false,
		},
		{
			name:    "invalid owner ID",
			ownerID: "invalid",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsSystemOwnerID(tt.ownerID)
			if got != tt.want {
				t.Errorf("IsSystemOwnerID = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsUserOwnerID(t *testing.T) {
	tests := []struct {
		name    string
		ownerID string
		want    bool
	}{
		{
			name:    "user owner ID",
			ownerID: "user:123e4567-e89b-12d3-a456-426614174000",
			want:    true,
		},
		{
			name:    "system owner ID",
			ownerID: "system:global",
			want:    false,
		},
		{
			name:    "invalid owner ID",
			ownerID: "invalid",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsUserOwnerID(tt.ownerID)
			if got != tt.want {
				t.Errorf("IsUserOwnerID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetUserIDFromOwnerID(t *testing.T) {
	tests := []struct {
		name    string
		ownerID string
		want    string
		wantErr bool
	}{
		{
			name:    "valid user owner ID",
			ownerID: "user:123e4567-e89b-12d3-a456-426614174000",
			want:    "123e4567-e89b-12d3-a456-426614174000",
			wantErr: false,
		},
		{
			name:    "system owner ID",
			ownerID: "system:global",
			wantErr: true,
		},
		{
			name:    "invalid owner ID",
			ownerID: "invalid",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GetUserIDFromOwnerID(tt.ownerID)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetUserIDFromOwnerID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("GetUserIDFromOwnerID() = %v, want %v", got, tt.want)
			}
		})
	}
}

package storage

import (
	"testing"
)

func TestMatchesExtensions(t *testing.T) {
	tests := []struct {
		name       string
		filename   string
		extensions []string
		expected   bool
	}{
		{
			name:       "matches jpg extension",
			filename:   "image.jpg",
			extensions: []string{".jpg", ".png"},
			expected:   true,
		},
		{
			name:       "matches jpg extension case insensitive",
			filename:   "image.JPG",
			extensions: []string{".jpg", ".png"},
			expected:   true,
		},
		{
			name:       "does not match gif extension",
			filename:   "image.gif",
			extensions: []string{".jpg", ".png"},
			expected:   false,
		},
		{
			name:       "no filter means match all",
			filename:   "image.jpg",
			extensions: []string{},
			expected:   true,
		},
		{
			name:       "file without extension",
			filename:   "image",
			extensions: []string{".jpg"},
			expected:   false,
		},
		{
			name:       "extension with spaces",
			filename:   "image.png",
			extensions: []string{" .jpg ", " .png "},
			expected:   true,
		},
		{
			name:       "matches single extension",
			filename:   "document.pdf",
			extensions: []string{".pdf"},
			expected:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := MatchesExtensions(tt.filename, tt.extensions)
			if result != tt.expected {
				t.Errorf("MatchesExtensions(%q, %v) = %v, want %v", tt.filename, tt.extensions, result, tt.expected)
			}
		})
	}
}

func TestIsHiddenFile(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		expected bool
	}{
		{
			name:     "hidden file with dot prefix",
			filename: ".hidden",
			expected: true,
		},
		{
			name:     "visible file",
			filename: "visible.txt",
			expected: false,
		},
		{
			name:     "DS_Store file",
			filename: ".DS_Store",
			expected: true,
		},
		{
			name:     "hidden directory",
			filename: ".git",
			expected: true,
		},
		{
			name:     "file with dot in middle",
			filename: "file.name.txt",
			expected: false,
		},
		{
			name:     "empty string",
			filename: "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsHiddenFile(tt.filename)
			if result != tt.expected {
				t.Errorf("IsHiddenFile(%q) = %v, want %v", tt.filename, result, tt.expected)
			}
		})
	}
}

func TestShouldIncludeFile(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		isDir    bool
		options  ListOptions
		expected bool
	}{
		{
			name:     "visible file with matching extension",
			filename: "image.jpg",
			isDir:    false,
			options:  ListOptions{Extensions: []string{".jpg"}, ShowHidden: false},
			expected: true,
		},
		{
			name:     "hidden file with showHidden false",
			filename: ".hidden.jpg",
			isDir:    false,
			options:  ListOptions{Extensions: []string{".jpg"}, ShowHidden: false},
			expected: false,
		},
		{
			name:     "hidden file with showHidden true",
			filename: ".hidden.jpg",
			isDir:    false,
			options:  ListOptions{Extensions: []string{".jpg"}, ShowHidden: true},
			expected: true,
		},
		{
			name:     "directory with onlyFiles true",
			filename: "folder",
			isDir:    true,
			options:  ListOptions{OnlyFiles: true, ShowHidden: false},
			expected: false,
		},
		{
			name:     "file with onlyFolders true",
			filename: "file.txt",
			isDir:    false,
			options:  ListOptions{OnlyFolders: true, ShowHidden: false},
			expected: false,
		},
		{
			name:     "directory with onlyFolders true",
			filename: "folder",
			isDir:    true,
			options:  ListOptions{OnlyFolders: true, ShowHidden: false},
			expected: true,
		},
		{
			name:     "file with non-matching extension",
			filename: "image.gif",
			isDir:    false,
			options:  ListOptions{Extensions: []string{".jpg", ".png"}, ShowHidden: false},
			expected: false,
		},
		{
			name:     "directory ignores extension filter",
			filename: "folder.jpg",
			isDir:    true,
			options:  ListOptions{Extensions: []string{".png"}, ShowHidden: false},
			expected: true,
		},
		{
			name:     "no filters applied",
			filename: "file.txt",
			isDir:    false,
			options:  ListOptions{ShowHidden: false},
			expected: true,
		},
		{
			name:     "hidden directory with showHidden false",
			filename: ".git",
			isDir:    true,
			options:  ListOptions{ShowHidden: false},
			expected: false,
		},
		{
			name:     "hidden directory with showHidden true",
			filename: ".git",
			isDir:    true,
			options:  ListOptions{ShowHidden: true},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldIncludeFile(tt.filename, tt.isDir, tt.options)
			if result != tt.expected {
				t.Errorf("ShouldIncludeFile(%q, %v, %+v) = %v, want %v", tt.filename, tt.isDir, tt.options, result, tt.expected)
			}
		})
	}
}

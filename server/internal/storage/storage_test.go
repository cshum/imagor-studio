package storage

import (
	"testing"
	"time"
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
		{
			name:       "matches compound extension .imagor.json",
			filename:   "template.imagor.json",
			extensions: []string{".imagor.json"},
			expected:   true,
		},
		{
			name:       "matches compound extension .tar.gz",
			filename:   "archive.tar.gz",
			extensions: []string{".tar.gz"},
			expected:   true,
		},
		{
			name:       "matches compound extension case insensitive",
			filename:   "template.IMAGOR.JSON",
			extensions: []string{".imagor.json"},
			expected:   true,
		},
		{
			name:       "does not match partial compound extension",
			filename:   "file.json",
			extensions: []string{".imagor.json"},
			expected:   false,
		},
		{
			name:       "matches compound extension in mixed list",
			filename:   "template.imagor.json",
			extensions: []string{".jpg", ".png", ".imagor.json"},
			expected:   true,
		},
		{
			name:       "matches simple extension when compound also present",
			filename:   "image.jpg",
			extensions: []string{".imagor.json", ".jpg"},
			expected:   true,
		},
		{
			name:       "compound extension with spaces",
			filename:   "template.imagor.json",
			extensions: []string{" .imagor.json "},
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

func TestSortFileInfos(t *testing.T) {
	// Create test data
	items := []FileInfo{
		{Name: "zebra.txt", Size: 100, ModifiedTime: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)},
		{Name: "alpha.txt", Size: 300, ModifiedTime: time.Date(2023, 3, 1, 0, 0, 0, 0, time.UTC)},
		{Name: "beta.txt", Size: 200, ModifiedTime: time.Date(2023, 2, 1, 0, 0, 0, 0, time.UTC)},
	}

	tests := []struct {
		name      string
		sortBy    SortOption
		sortOrder SortOrder
		expected  []string // expected order of names
	}{
		{
			name:      "sort by name ascending",
			sortBy:    SortByName,
			sortOrder: SortOrderAsc,
			expected:  []string{"alpha.txt", "beta.txt", "zebra.txt"},
		},
		{
			name:      "sort by name descending",
			sortBy:    SortByName,
			sortOrder: SortOrderDesc,
			expected:  []string{"zebra.txt", "beta.txt", "alpha.txt"},
		},
		{
			name:      "sort by size ascending",
			sortBy:    SortBySize,
			sortOrder: SortOrderAsc,
			expected:  []string{"zebra.txt", "beta.txt", "alpha.txt"},
		},
		{
			name:      "sort by size descending",
			sortBy:    SortBySize,
			sortOrder: SortOrderDesc,
			expected:  []string{"alpha.txt", "beta.txt", "zebra.txt"},
		},
		{
			name:      "sort by modified time ascending",
			sortBy:    SortByModifiedTime,
			sortOrder: SortOrderAsc,
			expected:  []string{"zebra.txt", "beta.txt", "alpha.txt"},
		},
		{
			name:      "sort by modified time descending",
			sortBy:    SortByModifiedTime,
			sortOrder: SortOrderDesc,
			expected:  []string{"alpha.txt", "beta.txt", "zebra.txt"},
		},
		{
			name:      "no sorting specified",
			sortBy:    "",
			sortOrder: "",
			expected:  []string{"zebra.txt", "alpha.txt", "beta.txt"}, // original order
		},
		{
			name:      "default to name sorting",
			sortBy:    "INVALID",
			sortOrder: SortOrderAsc,
			expected:  []string{"alpha.txt", "beta.txt", "zebra.txt"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Make a copy of items to avoid modifying the original
			testItems := make([]FileInfo, len(items))
			copy(testItems, items)

			SortFileInfos(testItems, tt.sortBy, tt.sortOrder)

			// Check the order
			for i, expectedName := range tt.expected {
				if testItems[i].Name != expectedName {
					t.Errorf("Expected item %d to be %s, got %s", i, expectedName, testItems[i].Name)
				}
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

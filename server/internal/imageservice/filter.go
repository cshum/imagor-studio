package imageservice

import (
	"path/filepath"
	"strings"
)

// DefaultImageExtensions contains common image file extensions
var DefaultImageExtensions = []string{
	".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif", ".svg",
}

// IsImageFile checks if a file is an image based on its extension
func IsImageFile(filename string) bool {
	return IsImageFileWithExtensions(filename, DefaultImageExtensions)
}

// IsImageFileWithExtensions checks if a file is an image based on provided extensions
func IsImageFileWithExtensions(filename string, extensions []string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	for _, validExt := range extensions {
		if ext == strings.ToLower(validExt) {
			return true
		}
	}
	return false
}

// FilterImageFiles filters a list of filenames to only include image files
func FilterImageFiles(filenames []string) []string {
	return FilterImageFilesWithExtensions(filenames, DefaultImageExtensions)
}

// FilterImageFilesWithExtensions filters filenames using provided extensions
func FilterImageFilesWithExtensions(filenames []string, extensions []string) []string {
	var imageFiles []string
	for _, filename := range filenames {
		if IsImageFileWithExtensions(filename, extensions) {
			imageFiles = append(imageFiles, filename)
		}
	}
	return imageFiles
}

// GetImageExtensionsFromConfig parses image extensions from a comma-separated string
func GetImageExtensionsFromConfig(configValue string) []string {
	if configValue == "" {
		return DefaultImageExtensions
	}

	extensions := strings.Split(configValue, ",")
	var result []string
	for _, ext := range extensions {
		ext = strings.TrimSpace(ext)
		if ext != "" {
			// Ensure extension starts with a dot
			if !strings.HasPrefix(ext, ".") {
				ext = "." + ext
			}
			result = append(result, strings.ToLower(ext))
		}
	}

	if len(result) == 0 {
		return DefaultImageExtensions
	}

	return result
}

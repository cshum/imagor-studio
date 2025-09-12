import { getBaseUrl } from '@/lib/api-utils'

// Default supported image extensions
export const DEFAULT_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
  '.tif',
  '.svg',
]

// Check if a file is an image based on its extension
export function isImageFile(
  filename: string,
  extensions: string[] = DEFAULT_IMAGE_EXTENSIONS,
): boolean {
  const ext = getFileExtension(filename)
  return extensions.some((validExt) => ext === validExt.toLowerCase())
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) return ''
  return filename.substring(lastDotIndex).toLowerCase()
}

// Filter array of file items to only include images
export function filterImageFiles<T extends { name: string }>(
  files: T[],
  extensions: string[] = DEFAULT_IMAGE_EXTENSIONS,
): T[] {
  return files.filter((file) => isImageFile(file.name, extensions))
}

// Convert relative imagor URLs to full URLs for cross-origin access
export function getFullImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl

  // If it's a relative path (starts with /), prepend server URL
  if (imageUrl.startsWith('/')) {
    return `${getBaseUrl()}${imageUrl}`
  }

  // Otherwise, return as-is (shouldn't happen, but safe fallback)
  return imageUrl
}

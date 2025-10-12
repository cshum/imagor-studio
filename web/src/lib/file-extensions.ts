/**
 * File extension validation utilities
 * Uses server-provided extension lists instead of MIME types for more reliable validation
 */

/**
 * Check if a file extension matches any in a comma-separated list of extensions
 * @param filename - The filename to check
 * @param extensions - Comma-separated list of extensions (e.g., '.mp4,.webm,.avi')
 * @returns true if the file extension is in the extensions list
 */
export function hasExtension(filename: string, extensions: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return extensions.toLowerCase().includes(ext)
}

/**
 * Get the file extension from a filename
 * @param filename - The filename to extract extension from
 * @returns The file extension including the dot (e.g., '.jpg')
 */
export function getFileExtension(filename: string): string {
  return '.' + filename.split('.').pop()?.toLowerCase()
}

/**
 * Validate if a file is supported based on extension lists
 * @param filename - The filename to validate
 * @param imageExtensions - Comma-separated list of image extensions
 * @param videoExtensions - Comma-separated list of video extensions
 * @returns true if the file extension is supported
 */
export function isValidFileExtension(
  filename: string,
  imageExtensions: string,
  videoExtensions: string,
): boolean {
  return hasExtension(filename, imageExtensions) || hasExtension(filename, videoExtensions)
}

/**
 * Get a formatted list of supported extensions for error messages
 * @param imageExtensions - Comma-separated list of image extensions
 * @param videoExtensions - Comma-separated list of video extensions
 * @returns Formatted string of supported extensions
 */
export function getSupportedExtensionsText(
  imageExtensions: string,
  videoExtensions: string,
): string {
  const allExtensions = `${imageExtensions},${videoExtensions}`
  return allExtensions.split(',').join(', ')
}

/**
 * Convert extension lists to accept attribute format for file inputs
 * @param imageExtensions - Comma-separated list of image extensions
 * @param videoExtensions - Comma-separated list of video extensions
 * @returns Accept attribute string for file inputs
 */
export function getFileInputAccept(imageExtensions: string, videoExtensions: string): string {
  const allExtensions = `${imageExtensions},${videoExtensions}`
  return allExtensions.split(',').join(',')
}

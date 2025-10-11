/**
 * Utility functions for file operations
 */

/**
 * Generates a unique filename by appending numbers to avoid conflicts
 * @param originalName - The original filename
 * @param existingFiles - Array of existing filenames to check against
 * @param usedNames - Array of names already used in current operation
 * @returns A unique filename that doesn't conflict with existing or used names
 *
 * @example
 * generateUniqueFilename('photo.jpg', ['photo.jpg'], []) // Returns 'photo(1).jpg'
 * generateUniqueFilename('photo.jpg', ['photo.jpg'], ['photo(1).jpg']) // Returns 'photo(2).jpg'
 * generateUniqueFilename('document', ['document'], []) // Returns 'document(1)'
 */
export function generateUniqueFilename(
  originalName: string,
  existingFiles: string[],
  usedNames: string[] = [],
): string {
  const allExistingFiles = [...existingFiles, ...usedNames]

  if (!allExistingFiles.includes(originalName)) {
    return originalName
  }

  // Parse filename to extract name and extension
  const lastDotIndex = originalName.lastIndexOf('.')
  const name = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : ''

  // Generate numbered alternatives: image.jpg -> image(1).jpg -> image(2).jpg
  let counter = 1
  let uniqueName = `${name}(${counter})${extension}`

  while (allExistingFiles.includes(uniqueName)) {
    counter++
    uniqueName = `${name}(${counter})${extension}`
  }

  return uniqueName
}

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 *
 * @example
 * formatFileSize(1024) // Returns '1.0 KB'
 * formatFileSize(1048576) // Returns '1.0 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Extracts file extension from filename
 * @param filename - The filename to extract extension from
 * @returns File extension including the dot, or empty string if no extension
 *
 * @example
 * getFileExtension('photo.jpg') // Returns '.jpg'
 * getFileExtension('document') // Returns ''
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  return lastDotIndex > 0 ? filename.substring(lastDotIndex) : ''
}

/**
 * Extracts filename without extension
 * @param filename - The filename to extract name from
 * @returns Filename without extension
 *
 * @example
 * getFileNameWithoutExtension('photo.jpg') // Returns 'photo'
 * getFileNameWithoutExtension('document') // Returns 'document'
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
}

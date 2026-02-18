/**
 * Get the base URL for API requests
 * Uses environment variable if set, otherwise falls back to current origin
 */
export const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // Fallback to current origin (works for both dev and production)
  return typeof window !== 'undefined' ? window.location.origin : ''
}

/**
 * Convert relative imagor URLs to full URLs for cross-origin access
 */
export function getFullImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl

  // If it's a relative path (starts with /), prepend server URL
  if (imageUrl.startsWith('/')) {
    return `${getBaseUrl()}${imageUrl}`
  }

  // Otherwise, return as-is (shouldn't happen, but safe fallback)
  return imageUrl
}

/**
 * Add cache-busting query parameter to URL using file modification time
 * This prevents browser from serving stale cached versions of files
 *
 * @param url - The URL to add cache-busting to
 * @param modifiedTime - ISO timestamp from file metadata (optional)
 * @returns URL with ?t= or &t= parameter appended (using Unix milliseconds)
 */
export function addCacheBuster(url: string, modifiedTime?: string): string {
  if (!modifiedTime || !url) return url

  // Convert ISO timestamp to Unix milliseconds for cleaner URLs
  const timestamp = new Date(modifiedTime).getTime()

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${timestamp}`
}

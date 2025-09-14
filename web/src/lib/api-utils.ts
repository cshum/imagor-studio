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

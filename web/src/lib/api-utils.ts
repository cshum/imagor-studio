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

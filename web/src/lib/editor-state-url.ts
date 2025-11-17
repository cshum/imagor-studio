import type { ImageEditorState } from '@/lib/image-editor'

/**
 * Serialize ImageEditorState to URL-safe base64 string
 * Strips UI-only state (visualCropEnabled) before serializing
 */
export function serializeStateToUrl(state: ImageEditorState): string {
  try {
    // Strip UI-only state (visualCropEnabled) before serializing
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled, ...transformState } = state

    // JSON → base64 → URL-safe
    const json = JSON.stringify(transformState)
    const base64 = btoa(json)
    // Make URL-safe: replace +/= with -_
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  } catch {
    return ''
  }
}

/**
 * Deserialize URL-safe base64 string to ImageEditorState
 * Returns partial state (only values that were in the encoded state)
 */
export function deserializeStateFromUrl(encoded: string): Partial<ImageEditorState> | null {
  if (!encoded || encoded.trim() === '') {
    return null
  }

  try {
    // URL-safe → base64 → JSON
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const padded = base64 + '==='.slice((base64.length + 3) % 4)
    const json = atob(padded)
    const state = JSON.parse(json) as Partial<ImageEditorState>

    // Validate that it's an object
    if (typeof state !== 'object' || state === null) {
      return null
    }

    return state
  } catch {
    return null
  }
}

/**
 * Get current state from window.location query params
 * Supports both ?state= (new) and # (legacy) for backward compatibility
 */
export function getStateFromLocation(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  // Try query param first (new method)
  const searchParams = new URLSearchParams(window.location.search)
  const stateParam = searchParams.get('state')
  if (stateParam) {
    return stateParam
  }

  // Fall back to hash for backward compatibility
  const hash = window.location.hash.slice(1)
  if (hash) {
    return hash
  }

  return ''
}

/**
 * Update window.location with state query parameter
 * Uses replaceState to avoid polluting browser history
 */
export function updateLocationState(encoded: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)

  if (encoded) {
    url.searchParams.set('state', encoded)
  } else {
    url.searchParams.delete('state')
  }

  // Clear hash for clean URLs (remove legacy hash if present)
  url.hash = ''

  // Only update if URL actually changed
  if (url.toString() !== window.location.href) {
    // Use replaceState to avoid adding to history
    window.history.replaceState(null, '', url.toString())
  }
}

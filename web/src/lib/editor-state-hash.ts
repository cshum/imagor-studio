import type { ImageEditorState } from './image-editor'

/**
 * Serialize ImageEditorState to URL-safe base64 hash
 * Serializes the entire state for simplicity and future-proofing
 */
export function serializeStateToHash(state: ImageEditorState): string {
  try {
    // JSON → base64 → URL-safe
    const json = JSON.stringify(state)
    const base64 = btoa(json)
    // Make URL-safe: replace +/= with -_
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  } catch (error) {
    console.error('Failed to serialize state to hash:', error)
    return ''
  }
}

/**
 * Deserialize URL-safe base64 hash to ImageEditorState
 * Returns partial state (only values that were in hash)
 */
export function deserializeStateFromHash(hash: string): Partial<ImageEditorState> | null {
  if (!hash || hash.trim() === '') {
    return null
  }

  try {
    // URL-safe → base64 → JSON
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const padded = base64 + '==='.slice((base64.length + 3) % 4)
    const json = atob(padded)
    const state = JSON.parse(json) as Partial<ImageEditorState>

    // Validate that it's an object
    if (typeof state !== 'object' || state === null) {
      return null
    }

    return state
  } catch (error) {
    console.error('Failed to deserialize state from hash:', error)
    return null
  }
}

/**
 * Get current hash from window.location
 */
export function getHashFromLocation(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  // Remove leading # if present
  return window.location.hash.slice(1)
}

/**
 * Update window.location hash without triggering navigation
 * Uses replaceState to avoid polluting browser history
 */
export function updateLocationHash(hash: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const newHash = hash ? `#${hash}` : ''
  const currentHash = window.location.hash

  // Only update if hash actually changed
  if (currentHash !== newHash) {
    // Use replaceState to avoid adding to history
    const url = new URL(window.location.href)
    url.hash = newHash
    window.history.replaceState(null, '', url.toString())
  }
}

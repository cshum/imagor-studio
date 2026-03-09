import type { ImageEditorState, ImageLayer, Layer } from '@/lib/image-editor'

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

    // Backwards compatibility: layers serialised before TextLayer was introduced
    // have no `type` field — default them to 'image' so the discriminated union works.
    if (Array.isArray(state.layers)) {
      state.layers = (state.layers as unknown[]).map((layer): Layer => {
        if (layer && typeof layer === 'object' && !('type' in layer)) {
          return { ...(layer as object), type: 'image' as const } as ImageLayer
        }
        return layer as Layer
      })
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
    // Remove one-time canvas seed params — once ?state= is set it is the
    // single source of truth for the editor state. Keeping color/w/h around
    // would cause the loader to re-seed from stale values on the next refresh
    // (before restoreState() can override them), leading to a brief flash of
    // the original color/size. Stripping them here keeps the URL clean and
    // ensures the loader falls back to its own defaults on a fresh open.
    url.searchParams.delete('color')
    url.searchParams.delete('w')
    url.searchParams.delete('h')
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

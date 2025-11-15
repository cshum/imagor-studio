import type { ImageEditorState } from './image-editor'

/**
 * Default values for ImageEditorState
 * Used to filter out defaults when serializing to keep hash short
 */
const DEFAULT_VALUES: Partial<ImageEditorState> = {
  fitIn: true,
  stretch: false,
  smart: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sharpen: 0,
  grayscale: false,
  hFlip: false,
  vFlip: false,
  rotation: 0,
}

/**
 * Check if a value is the default value for a given key
 */
function isDefaultValue(key: string, value: unknown): boolean {
  // Width and height are always included (not defaults)
  if (key === 'width' || key === 'height') {
    return false
  }

  // Check against default values
  if (key in DEFAULT_VALUES) {
    return DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES] === value
  }

  // Undefined values are considered defaults
  return value === undefined
}

/**
 * Serialize ImageEditorState to URL-safe base64 hash
 * Only includes non-default values to keep hash short
 */
export function serializeStateToHash(state: ImageEditorState): string {
  // Filter out default/undefined values
  const filtered: Partial<ImageEditorState> = {}

  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined && !isDefaultValue(key, value)) {
      filtered[key as keyof ImageEditorState] = value as never
    }
  }

  // If no non-default values, return empty string
  if (Object.keys(filtered).length === 0) {
    return ''
  }

  try {
    // JSON → base64 → URL-safe
    const json = JSON.stringify(filtered)
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

/**
 * Clipboard utilities for cross-browser compatibility
 */

/**
 * Check if the Clipboard API is available and functional
 */
export function isClipboardAPIAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'navigator' in window &&
    'clipboard' in window.navigator &&
    'writeText' in window.navigator.clipboard
  )
}

/**
 * Fallback clipboard copy using the legacy execCommand method
 * This is more reliable on older browsers and iOS Safari
 */
export async function fallbackCopyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)

    try {
      // Focus and select the text
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, 99999) // For mobile devices

      // Execute the copy command
      const successful = document.execCommand('copy')

      if (successful) {
        resolve()
      } else {
        reject(new Error('execCommand copy failed'))
      }
    } catch (err) {
      reject(err)
    } finally {
      // Clean up
      document.body.removeChild(textArea)
    }
  })
}

/**
 * Copy text to clipboard using modern Clipboard API with fallback
 * Returns a promise that resolves to true on success, false on failure
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (isClipboardAPIAvailable()) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback to execCommand
      return fallbackCopyToClipboard(text)
        .then(() => true)
        .catch(() => false)
    }
  } catch {
    // Try execCommand fallback
    try {
      await fallbackCopyToClipboard(text)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Silent clipboard copy that doesn't throw errors
 * Used for background clipboard attempts in dialogs
 */
export function silentCopyToClipboard(text: string): void {
  try {
    if (isClipboardAPIAvailable()) {
      navigator.clipboard.writeText(text).catch(() => {
        // Silent fail - try execCommand fallback
        try {
          const textArea = document.createElement('textarea')
          textArea.value = text
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
        } catch {
          // Silent fail
        }
      })
    } else {
      // Try execCommand directly
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  } catch {
    // Silent fail - do nothing
  }
}

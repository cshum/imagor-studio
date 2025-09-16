/**
 * Browser detection and compatibility utilities
 */

/**
 * Detect if the current browser is iOS Safari
 */
export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)

  return isIOS && isSafari
}

/**
 * Detect if the current browser is any iOS browser
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false

  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

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
 * This is more reliable on older iOS Safari versions
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
 * Copy text to clipboard with iOS Safari fallback
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Try modern Clipboard API first
  if (isClipboardAPIAvailable()) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {}
  }

  // Fallback to execCommand for iOS Safari and other browsers
  await fallbackCopyToClipboard(text)
}

/**
 * Download a file using various methods with iOS Safari compatibility
 */
export function downloadFile(url: string, filename?: string): void {
  if (isIOS()) {
    // On iOS, we can't force downloads, so open in new tab
    // The server should send appropriate headers for download
    window.open(url, '_blank')
  } else {
    // For other browsers, use the download attribute
    const link = document.createElement('a')
    link.href = url
    if (filename) {
      link.download = filename
    }
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

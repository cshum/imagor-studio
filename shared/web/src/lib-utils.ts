import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function isMacOS(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

export function getKeyboardShortcut(
  key: string,
  modifiers: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
  },
): string {
  const isMac = isMacOS()
  const parts: string[] = []

  if (modifiers.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (modifiers.shift) {
    parts.push(isMac ? '⇧' : 'Shift')
  }
  if (modifiers.alt) {
    parts.push(isMac ? '⌥' : 'Alt')
  }

  parts.push(key.toUpperCase())

  return isMac ? parts.join('') : parts.join('+')
}

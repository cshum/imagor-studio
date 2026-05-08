import { useEffect } from 'react'

export function useBodyDataAttribute(name: string, enabled: boolean, value = 'true') {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    if (enabled) {
      document.body.dataset[name] = value
    } else {
      delete document.body.dataset[name]
    }

    return () => {
      delete document.body.dataset[name]
    }
  }, [enabled, name, value])
}

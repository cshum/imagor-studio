import { useEffect, useState } from 'react'

import {
  clearSpacePropagationNotice,
  readSpacePropagationNotice,
  SPACE_PROPAGATION_EVENT,
  SPACE_PROPAGATION_WINDOW_MS,
  type SpacePropagationNotice,
  type SpacePropagationNoticeEventDetail,
} from '@/lib/space-propagation'

export function useSpacePropagationNotice(spaceKey?: string, refreshKey?: string) {
  const [propagationNotice, setPropagationNotice] = useState<SpacePropagationNotice | null>(null)

  useEffect(() => {
    if (!spaceKey) {
      setPropagationNotice(null)
      return
    }

    const handleNotice = (event: Event) => {
      const nextNotice = (event as CustomEvent<SpacePropagationNoticeEventDetail>).detail?.notice
      if (!nextNotice || nextNotice.spaceKey !== spaceKey) {
        if (!nextNotice) {
          setPropagationNotice(null)
        }
        return
      }
      setPropagationNotice(nextNotice)
    }

    window.addEventListener(SPACE_PROPAGATION_EVENT, handleNotice)
    return () => {
      window.removeEventListener(SPACE_PROPAGATION_EVENT, handleNotice)
    }
  }, [spaceKey])

  useEffect(() => {
    if (!spaceKey) {
      setPropagationNotice(null)
      return
    }

    const nextNotice = readSpacePropagationNotice(spaceKey)
    setPropagationNotice(nextNotice)

    if (!nextNotice) {
      return
    }

    const remainingMs = SPACE_PROPAGATION_WINDOW_MS - (Date.now() - nextNotice.savedAt)
    if (remainingMs <= 0) {
      clearSpacePropagationNotice()
      setPropagationNotice(null)
      return
    }

    const timer = window.setTimeout(() => {
      clearSpacePropagationNotice()
      setPropagationNotice(null)
    }, remainingMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [refreshKey, spaceKey])

  return propagationNotice
}

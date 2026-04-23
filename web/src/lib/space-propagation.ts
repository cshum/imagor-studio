export const SPACE_PROPAGATION_WINDOW_MS = 30_000
export const SPACE_PROPAGATION_EVENT = 'imagor-studio:space-propagation-notice'

const SPACE_PROPAGATION_STORAGE_KEY = 'imagor-studio.space-propagation-notice'

export type SpacePropagationAction = 'created' | 'updated' | 'deleted'

export interface SpacePropagationNotice {
  action: SpacePropagationAction
  savedAt: number
  spaceKey: string
}

export interface SpacePropagationNoticeEventDetail {
  notice: SpacePropagationNotice | null
}

export function rememberSpacePropagationNotice(notice: SpacePropagationNotice) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(SPACE_PROPAGATION_STORAGE_KEY, JSON.stringify(notice))
  window.dispatchEvent(
    new CustomEvent<SpacePropagationNoticeEventDetail>(SPACE_PROPAGATION_EVENT, {
      detail: { notice },
    }),
  )
}

export function readSpacePropagationNotice(spaceKey: string): SpacePropagationNotice | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawNotice = window.sessionStorage.getItem(SPACE_PROPAGATION_STORAGE_KEY)
  if (!rawNotice) {
    return null
  }

  try {
    const parsed = JSON.parse(rawNotice) as Partial<SpacePropagationNotice>
    if (
      typeof parsed.spaceKey !== 'string' ||
      typeof parsed.action !== 'string' ||
      typeof parsed.savedAt !== 'number'
    ) {
      clearSpacePropagationNotice()
      return null
    }

    if (parsed.spaceKey !== spaceKey) {
      return null
    }

    if (Date.now() - parsed.savedAt >= SPACE_PROPAGATION_WINDOW_MS) {
      clearSpacePropagationNotice()
      return null
    }

    return {
      action: parsed.action,
      savedAt: parsed.savedAt,
      spaceKey: parsed.spaceKey,
    }
  } catch {
    clearSpacePropagationNotice()
    return null
  }
}

export function clearSpacePropagationNotice() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(SPACE_PROPAGATION_STORAGE_KEY)
  window.dispatchEvent(
    new CustomEvent<SpacePropagationNoticeEventDetail>(SPACE_PROPAGATION_EVENT, {
      detail: { notice: null },
    }),
  )
}

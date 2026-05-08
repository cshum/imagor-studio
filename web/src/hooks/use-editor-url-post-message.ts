import { useEffect, useRef } from 'react'

import type { ImageEditor } from '@/lib/image-editor'

interface EditorUrlChangeMessage {
  type: 'imagor-studio:url-change'
  url: string
}

interface UseEditorUrlPostMessageOptions {
  imageEditor: ImageEditor
  previewUrl?: string
  enabled: boolean
}

export function useEditorUrlPostMessage({
  imageEditor,
  previewUrl,
  enabled,
}: UseEditorUrlPostMessageOptions) {
  const lastPostedCopyUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !previewUrl || typeof window === 'undefined' || window.parent === window) {
      return
    }

    let cancelled = false

    void (async () => {
      const url = await imageEditor.getCopyUrl()
      if (!url || cancelled || url === lastPostedCopyUrlRef.current) {
        return
      }

      let targetOrigin = '*'
      if (document.referrer) {
        try {
          targetOrigin = new URL(document.referrer).origin
        } catch {
          targetOrigin = '*'
        }
      }

      const message: EditorUrlChangeMessage = {
        type: 'imagor-studio:url-change',
        url,
      }

      lastPostedCopyUrlRef.current = url
      window.parent.postMessage(message, targetOrigin)
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, imageEditor, previewUrl])
}

import { EditorSectionStorage } from '@/lib/editor-sections'
import { colorToImagePath, ImageEditor } from '@/lib/image-editor'
import { getAuth } from '@/stores/auth-store'

import type { ImageEditorLoaderData } from './image-editor-loader'

/**
 * Parse canvas search params from the URL query string.
 * These are one-time seed values used only at initial load.
 */
function parseCanvasSearch(search: string): {
  color: string
  width: number
  height: number
} {
  const params = new URLSearchParams(search)
  const color = params.get('color') || 'none'
  const w = parseInt(params.get('w') || '', 10)
  const h = parseInt(params.get('h') || '', 10)
  return {
    color,
    width: w > 0 ? Math.round(w) : 800,
    height: h > 0 ? Math.round(h) : 600,
  }
}

/**
 * Canvas editor loader — creates an ImageEditor from a color image path.
 * No file system access needed; the color image is virtual (imagor generates it).
 *
 * Search params (color, w, h) are one-time seed values read at initial load.
 * Once the editor is open, all editing happens through ImageEditor state.
 */
export const canvasEditorLoader = async ({
  search,
}: {
  search: string
}): Promise<ImageEditorLoaderData> => {
  const { color, width, height } = parseCanvasSearch(search)

  // Load user preferences for editor open sections
  const authState = getAuth()
  const storage = new EditorSectionStorage(authState)
  const editorOpenSections = await storage.get()

  const imagePath = colorToImagePath(color)

  // Color images use 1×1 original dimensions (imagor generates them at any size).
  // The user-specified canvas size is set as explicit width/height on the editor state.
  const imageEditor = new ImageEditor({
    imagePath,
    originalDimensions: { width: 1, height: 1 },
  })

  // Set the canvas dimensions so the editor starts at the user-specified size
  imageEditor.restoreState({ width, height })
  imageEditor.markInitialState()

  return {
    initialEditorOpenSections: editorOpenSections,
    breadcrumb: { label: 'Imagor Studio' },
    imageEditor,
    isTemplate: false,
  }
}

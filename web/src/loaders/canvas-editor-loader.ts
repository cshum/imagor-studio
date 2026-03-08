import { EditorSectionStorage, type EditorSections } from '@/lib/editor-sections'
import { colorToImagePath, ImageEditor } from '@/lib/image-editor'
import { getAuth } from '@/stores/auth-store'

import type { ImageEditorLoaderData } from './image-editor-loader'

export interface CanvasEditorSearch {
  color?: string
  w?: number
  h?: number
}

/**
 * Validate search params for the canvas editor route.
 * Provides defaults: white 800×600 canvas.
 */
export function canvasEditorValidateSearch(
  search: Record<string, unknown>,
): CanvasEditorSearch {
  return {
    color: typeof search.color === 'string' ? search.color : 'ffffff',
    w: typeof search.w === 'number' && search.w > 0 ? Math.round(search.w) : 800,
    h: typeof search.h === 'number' && search.h > 0 ? Math.round(search.h) : 600,
  }
}

/**
 * Canvas editor loader — creates an ImageEditor from a color image path.
 * No file system access needed; the color image is virtual (imagor generates it).
 */
export const canvasEditorLoader = async ({
  deps,
}: {
  deps: CanvasEditorSearch
}): Promise<ImageEditorLoaderData> => {
  const color = deps.color || 'ffffff'
  const width = deps.w || 800
  const height = deps.h || 600

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

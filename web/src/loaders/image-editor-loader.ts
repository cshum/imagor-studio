import { statFile } from '@/api/storage-api'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import {
  EditorOpenSectionsStorage,
  type EditorOpenSections,
} from '@/lib/editor-open-sections-storage'
import { fetchImageDimensions } from '@/lib/image-dimensions'
import { ImageEditor } from '@/lib/image-editor'
import { joinImagePath } from '@/lib/path-utils'
import { getAuth } from '@/stores/auth-store'
import { clearPosition } from '@/stores/image-position-store.ts'

export interface ImageEditorLoaderData {
  imagePath: string
  initialEditorOpenSections: EditorOpenSections
  breadcrumb: BreadcrumbItem
  imageEditor: ImageEditor
}

/**
 * Image editor loader - fetches image dimensions and creates ImageEditor instance
 * Dimensions are fetched from metadata API when available, otherwise by loading the image
 */
export const imageEditorLoader = async ({
  params: { galleryKey, imageKey },
}: {
  params: { galleryKey: string; imageKey: string }
}): Promise<ImageEditorLoaderData> => {
  const imagePath = joinImagePath(galleryKey, imageKey)
  const fileStat = await statFile(imagePath)

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found')
  }

  // Load user preferences for editor open sections using storage service
  const authState = getAuth()
  const storage = new EditorOpenSectionsStorage(authState)
  const editorOpenSections = await storage.get()

  // Fetch dimensions using utility (handles metadata API + fallback)
  const originalDimensions = await fetchImageDimensions(imagePath)

  // Clear image position for better transition
  clearPosition(galleryKey, imageKey)

  // Create ImageEditor instance
  const imageEditor = new ImageEditor({
    imagePath,
    originalDimensions,
  })

  return {
    imagePath,
    initialEditorOpenSections: editorOpenSections,
    breadcrumb: { label: 'Imagor Studio' },
    imageEditor,
  }
}

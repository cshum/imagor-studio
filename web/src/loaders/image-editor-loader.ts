import { statFile } from '@/api/storage-api'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { getFullImageUrl } from '@/lib/api-utils'
import {
  EditorOpenSectionsStorage,
  type EditorOpenSections,
} from '@/lib/editor-open-sections-storage'
import { fetchImageMetadata } from '@/lib/exif-utils'
import { ImageEditor } from '@/lib/image-editor'
import { joinImagePath } from '@/lib/path-utils'
import { preloadImage } from '@/lib/preload-image'
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

  // Fetch original dimensions - try metadata API first (fast), fallback to loading image
  let originalDimensions: { width: number; height: number } | null = null

  // Try metadata API first
  if (fileStat.thumbnailUrls?.meta) {
    try {
      const metadata = await fetchImageMetadata(getFullImageUrl(fileStat.thumbnailUrls.meta))
      if (metadata?.width && metadata?.height) {
        originalDimensions = {
          width: metadata.width,
          height: metadata.height,
        }
      }
    } catch {
      // Metadata API failed, will fallback to loading image below
    }
  }

  // Fallback: load image if metadata didn't work
  if (!originalDimensions) {
    const fullSizeSrc = getFullImageUrl(
      fileStat.thumbnailUrls.full || fileStat.thumbnailUrls.original || '',
    )
    const imageElement = await preloadImage(fullSizeSrc)
    originalDimensions = {
      width: imageElement.naturalWidth,
      height: imageElement.naturalHeight,
    }
  }

  // clear image position for better transition
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

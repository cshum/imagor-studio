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
  imageElement: HTMLImageElement
  fullSizeSrc: string
  originalDimensions: {
    width: number
    height: number
  }
  imagePath: string
  initialEditorOpenSections: EditorOpenSections
  breadcrumb: BreadcrumbItem
  imageEditor: ImageEditor
}

/**
 * Image editor loader - preloads image and generates initial preview
 * Eliminates the need for dimension detection and initial loading useEffects
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

  // Get full-size image URL
  const fullSizeSrc = getFullImageUrl(
    fileStat.thumbnailUrls.full || fileStat.thumbnailUrls.original || '',
  )

  // Preload the actual image element
  const imageElement = await preloadImage(fullSizeSrc)

  // Fetch original dimensions from metadata if available
  let originalDimensions = {
    width: imageElement.naturalWidth,
    height: imageElement.naturalHeight,
  }

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
      // Fall back to image element dimensions
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
    imageElement,
    fullSizeSrc,
    originalDimensions,
    imagePath,
    initialEditorOpenSections: editorOpenSections,
    breadcrumb: { label: 'Imagor Studio' },
    imageEditor,
  }
}

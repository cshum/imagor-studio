import { getUserRegistry } from '@/api/registry-api'
import { statFile } from '@/api/storage-api'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { getFullImageUrl } from '@/lib/api-utils'
import { fetchImageMetadata } from '@/lib/exif-utils'
import { preloadImage } from '@/lib/preload-image'
import { clearPosition } from '@/stores/image-position-store.ts'
import { getAuth } from '@/stores/auth-store'

export interface EditorOpenSections {
  dimensions: boolean
  output: boolean
  crop: boolean
  effects: boolean
  transform: boolean
}

export interface ImageEditorLoaderData {
  imageElement: HTMLImageElement
  fullSizeSrc: string
  originalDimensions: {
    width: number
    height: number
  }
  galleryKey: string
  imageKey: string
  editorOpenSections: EditorOpenSections
  breadcrumb: BreadcrumbItem
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
  // Get file info (like image view does)
  const imagePath = galleryKey ? `${galleryKey}/${imageKey}` : imageKey
  const fileStat = await statFile(imagePath)

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found')
  }

  // Load user preferences for editor open sections
  const defaultOpenSections: EditorOpenSections = {
    dimensions: true,
    output: false,
    crop: false,
    effects: false,
    transform: false,
  }

  let editorOpenSections = defaultOpenSections
  
  // Skip registry operations for embedded mode (completely stateless)
  const authState = getAuth()
  if (!authState.isEmbedded) {
    try {
      const registryEntries = await getUserRegistry('config.editor_open_sections')
      if (registryEntries && registryEntries.length > 0) {
        const savedSections = JSON.parse(registryEntries[0].value) as EditorOpenSections
        editorOpenSections = { ...defaultOpenSections, ...savedSections }
      }
    } catch {
      // Silently fall back to defaults if registry loading fails
    }
  }

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

  return {
    imageElement,
    fullSizeSrc,
    originalDimensions,
    galleryKey,
    imageKey,
    editorOpenSections,
    breadcrumb: { label: 'Imagor Studio' },
  }
}

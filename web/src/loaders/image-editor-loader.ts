import { generateImagorUrl } from '@/api/imagor-api'
import { getUserRegistry } from '@/api/registry-api'
import { statFile } from '@/api/storage-api'
import type { ImagorParamsInput } from '@/generated/graphql'
import { getFullImageUrl } from '@/lib/api-utils'
import { preloadImage } from '@/lib/preload-image'

export interface EditorOpenSections {
  dimensions: boolean
  output: boolean
  crop: boolean
}

export interface ImageEditorLoaderData {
  imageElement: HTMLImageElement
  fullSizeSrc: string
  initialPreviewUrl: string
  originalDimensions: {
    width: number
    height: number
  }
  galleryKey: string
  imageKey: string
  editorOpenSections: EditorOpenSections
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
  }

  let editorOpenSections = defaultOpenSections
  try {
    const registryEntries = await getUserRegistry('config.editor_open_sections')
    if (registryEntries && registryEntries.length > 0) {
      const savedSections = JSON.parse(registryEntries[0].value) as EditorOpenSections
      editorOpenSections = { ...defaultOpenSections, ...savedSections }
    }
  } catch {
    // Silently fall back to defaults if registry loading fails
  }

  // Get full-size image URL
  const fullSizeSrc = getFullImageUrl(
    fileStat.thumbnailUrls.full || fileStat.thumbnailUrls.original || '',
  )

  // Preload the actual image element
  const imageElement = await preloadImage(fullSizeSrc)

  // Generate initial preview URL that matches what the hook will generate
  // Use actual dimensions + WebP format to match the hook's initial state
  const initialPreviewUrl = await generateImagorUrl({
    galleryKey,
    imageKey,
    params: {
      width: imageElement.naturalWidth,
      height: imageElement.naturalHeight,
      filters: [{ name: 'format', args: 'webp' }],
    } as ImagorParamsInput,
  })

  return {
    imageElement,
    fullSizeSrc,
    initialPreviewUrl,
    originalDimensions: {
      width: imageElement.naturalWidth,
      height: imageElement.naturalHeight,
    },
    galleryKey,
    imageKey,
    editorOpenSections,
  }
}

import { generateImagorUrl } from '@/api/imagor-api'
import { statFile } from '@/api/storage-api'
import type { ImagorParamsInput } from '@/generated/graphql'
import { getFullImageUrl } from '@/lib/api-utils'
import { preloadImage } from '@/lib/preload-image'

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

  // Get full-size image URL
  const fullSizeSrc = getFullImageUrl(
    fileStat.thumbnailUrls.full || fileStat.thumbnailUrls.original || '',
  )

  // Preload the actual image element
  const imageElement = await preloadImage(fullSizeSrc)

  // Generate initial fit-in preview URL
  const initialPreviewUrl = await generateImagorUrl({
    galleryKey,
    imageKey,
    params: {
      fitIn: true,
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
  }
}

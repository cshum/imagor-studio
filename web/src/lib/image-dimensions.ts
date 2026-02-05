import { statFile } from '@/api/storage-api'
import { getFullImageUrl } from '@/lib/api-utils'
import { fetchImageMetadata } from '@/lib/exif-utils'
import { preloadImage } from '@/lib/preload-image'

export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Fetch image dimensions using metadata API or by loading the image
 * Prefers metadata API (fast, no image download) and falls back to loading image
 * @param imagePath - Full path to image (e.g., "folder/image.jpg" or "image.jpg")
 * @returns Promise with width and height
 * @throws Error if image not found or invalid
 */
export async function fetchImageDimensions(imagePath: string): Promise<ImageDimensions> {
  const fileStat = await statFile(imagePath)

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found or invalid')
  }

  // Try metadata API first (fast!)
  if (fileStat.thumbnailUrls?.meta) {
    try {
      const metadata = await fetchImageMetadata(getFullImageUrl(fileStat.thumbnailUrls.meta))
      if (metadata?.width && metadata?.height) {
        return {
          width: metadata.width,
          height: metadata.height,
        }
      }
    } catch {
      // Metadata API failed, will fallback to loading image below
    }
  }

  // Fallback: load image to get dimensions
  const fullSizeSrc = getFullImageUrl(
    fileStat.thumbnailUrls.full || fileStat.thumbnailUrls.original || '',
  )
  const imageElement = await preloadImage(fullSizeSrc)

  return {
    width: imageElement.naturalWidth,
    height: imageElement.naturalHeight,
  }
}

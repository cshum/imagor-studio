import { listFiles } from '@/api/storage-api.ts'
import { Gallery } from '@/components/image-gallery/folder-grid.tsx'
import { GalleryImage } from '@/components/image-gallery/image-view.tsx'
import { convertMetadataToImageInfo, fetchImageMetadata } from '@/lib/exif-utils.ts'
import { preloadImage } from '@/lib/preload-image.ts'

export interface GalleryLoaderData {
  galleryName: string
  galleryKey: string
  images: GalleryImage[]
  folders: Gallery[]
}

export interface ImageLoaderData {
  image: GalleryImage
  imageElement: HTMLImageElement
  galleryKey: string
}

/**
 * Real gallery loader using imagor for thumbnail generation
 * Loads images and folders from storage API with imagor-generated thumbnails
 */
export const galleryLoader = async (galleryKey: string): Promise<GalleryLoaderData> => {
  // Use galleryKey as the path for storage API
  const path = galleryKey === 'default' ? '' : galleryKey

  // Fetch files from storage API
  const result = await listFiles({
    path,
    sortBy: 'MODIFIED_TIME',
    sortOrder: 'DESC',
    offset: 0,
    limit: 0
  })

  // Separate files and folders
  const folders: Gallery[] = result.items
    .filter((item) => item.isDirectory)
    .map((item) => ({
      galleryKey: item.path,
      galleryName: item.name,
    }))

  // Filter and convert image files
  const images: GalleryImage[] = result.items
    .filter((item) => !item.isDirectory && item.thumbnailUrls)
    .map((item) => ({
      // Required fields from FileInfoFragment
      name: item.name,
      thumbnailUrls: item.thumbnailUrls,
      // Additional GalleryImage fields
      imageKey: item.name,
      imageSrc: item.thumbnailUrls?.grid || `/api/file/${item.path}`,
      imageName: item.name,
    }))

  // Use the actual folder name, or "Gallery" for root
  const galleryName =
    galleryKey === 'default' || galleryKey === ''
      ? 'Gallery'
      : galleryKey.split('/').pop() || galleryKey

  return {
    galleryName,
    images,
    folders,
    galleryKey,
  }
}

/**
 * Real image loader using imagor for image processing
 * Loads real image data from storage API and preloads the selected image
 */
export const imageLoader = async ({
  params,
}: {
  params: { imageKey: string; galleryKey: string }
}): Promise<ImageLoaderData> => {
  const { imageKey, galleryKey } = params

  // Use galleryKey as the path for storage API
  const path = galleryKey === 'default' ? '' : galleryKey

  // Fetch files from storage API
  const result = await listFiles({
    path,
    offset: 0,
    limit: 1000,
    sortBy: 'NAME',
    sortOrder: 'ASC',
  })

  // Find the selected image from real API data
  const imageItem = result.items.find(
    (item) => !item.isDirectory && item.name === imageKey && item.thumbnailUrls,
  )

  if (!imageItem || !imageItem.thumbnailUrls) {
    throw new Error('Image not found')
  }

  // Use the full-size thumbnail URL for the detail view
  const fullSizeSrc =
    imageItem.thumbnailUrls.full ||
    imageItem.thumbnailUrls.original ||
    `/api/file/${imageItem.path}`

  const imageElement = await preloadImage(fullSizeSrc)

  // Fetch real EXIF data from imagor meta API
  let imageInfo = convertMetadataToImageInfo(null, imageItem.name, galleryKey)
  if (imageItem.thumbnailUrls.meta) {
    try {
      const metadata = await fetchImageMetadata(imageItem.thumbnailUrls.meta)
      imageInfo = convertMetadataToImageInfo(metadata, imageItem.name, galleryKey)
    } catch {
      // Fall back to basic info without EXIF data
    }
  }

  const image: GalleryImage = {
    // Required fields from FileInfoFragment
    name: imageItem.name,
    thumbnailUrls: imageItem.thumbnailUrls,
    // Additional GalleryImage fields
    imageKey: imageItem.name,
    imageSrc: fullSizeSrc,
    imageName: imageItem.name,
    imageInfo,
  }

  return {
    image,
    imageElement,
    galleryKey,
  }
}

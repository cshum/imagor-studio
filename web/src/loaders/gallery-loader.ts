import { listFiles, statFile } from '@/api/storage-api.ts'
import { Gallery } from '@/components/image-gallery/folder-grid.tsx'
import { GalleryImage } from '@/components/image-gallery/image-view.tsx'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { convertMetadataToImageInfo, fetchImageMetadata } from '@/lib/exif-utils.ts'
import { preloadImage } from '@/lib/preload-image.ts'
import {
  FolderNode,
  folderTreeStore,
  setCurrentPath,
  updateTreeData,
} from '@/stores/folder-tree-store.ts'

export interface GalleryLoaderData {
  galleryName: string
  galleryKey: string
  images: GalleryImage[]
  folders: Gallery[]
  breadcrumbs: BreadcrumbItem[]
}

export interface ImageLoaderData {
  image: GalleryImage
  imageElement: HTMLImageElement
  galleryKey: string
}

/**
 * Gallery loader using imagor for thumbnail generation
 * Loads images and folders from storage API with imagor-generated thumbnails
 */
export const galleryLoader = async ({
  params: { galleryKey },
}: {
  params: { galleryKey: string }
}): Promise<GalleryLoaderData> => {
  // Use galleryKey as the path for storage API
  const path = galleryKey === 'default' ? '' : galleryKey

  // Fetch files from storage API
  const result = await listFiles({
    path,
    sortBy: 'MODIFIED_TIME',
    sortOrder: 'DESC',
  })

  // Separate files and folders
  const folders: Gallery[] = result.items
    .filter((item) => item.isDirectory)
    .map((item) => ({
      galleryKey: item.path,
      galleryName: item.name,
    }))

  // Convert gallery folders to folder nodes for the tree store
  const folderNodes: FolderNode[] = folders.map((folder) => ({
    name: folder.galleryName,
    path: folder.galleryKey,
    isDirectory: true,
    isLoaded: false,
    isExpanded: false,
  }))

  // Update folder tree store with fresh data while preserving toggle states
  updateTreeData(path, folderNodes)

  // Set current path in folder tree store
  setCurrentPath(galleryKey)

  // Filter and convert image files
  const images: GalleryImage[] = result.items
    .filter((item) => !item.isDirectory && item.thumbnailUrls)
    .map((item) => ({
      // Required fields from FileInfoFragment
      name: item.name,
      thumbnailUrls: item.thumbnailUrls,
      // Additional GalleryImage fields
      imageKey: item.name,
      imageSrc: item.thumbnailUrls?.grid || '',
      imageName: item.name,
    }))

  // Get home title from the folder tree store
  const folderTreeState = await folderTreeStore.waitFor((state) => state.isHomeTitleLoaded)
  const homeTitle = folderTreeState.homeTitle

  // Use the actual folder name, or custom home title for root
  const galleryName =
    galleryKey === 'default' || galleryKey === ''
      ? homeTitle
      : galleryKey.split('/').pop() || galleryKey

  // Generate breadcrumbs based on galleryKey
  const breadcrumbs: BreadcrumbItem[] = []

  // For root gallery (empty galleryKey), just show custom home title without href
  if (galleryKey && galleryKey !== 'default') {
    // Add breadcrumbs for nested paths
    const segments = galleryKey.split('/')

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const capitalizedSegmentName = segment.charAt(0).toUpperCase() + segment.slice(1)
      const segmentPath = segments.slice(0, i + 1).join('/')
      const segmentHref = `/gallery/${encodeURIComponent(segmentPath)}`

      // Last segment should not have href (it's the current page)
      const isLastSegment = i === segments.length - 1

      breadcrumbs.push({
        label: capitalizedSegmentName,
        ...(isLastSegment ? {} : { href: segmentHref }),
      })
    }
  }

  return {
    galleryName,
    images,
    folders,
    galleryKey,
    breadcrumbs,
  }
}

/**
 * Image loader using imagor for image processing
 * Loads real image data from storage API and preloads the selected image
 */
export const imageLoader = async ({
  params: { imageKey, galleryKey },
}: {
  params: { imageKey: string; galleryKey: string }
}): Promise<ImageLoaderData> => {
  // Use galleryKey as the path for storage API, then append the image name
  const basePath = galleryKey === 'default' ? '' : galleryKey
  const imagePath = basePath ? `${basePath}/${imageKey}` : imageKey

  // Fetch single file stats from storage API - much more efficient than listing all files
  const fileStat = await statFile(imagePath)

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found')
  }

  // Use the full-size thumbnail URL for the detail view
  const fullSizeSrc = fileStat.thumbnailUrls.full || fileStat.thumbnailUrls.original || ''

  const imageElement = await preloadImage(fullSizeSrc)

  // Fetch real EXIF data from imagor meta API
  let imageInfo = convertMetadataToImageInfo(null, fileStat.name, galleryKey)
  if (fileStat.thumbnailUrls.meta) {
    try {
      const metadata = await fetchImageMetadata(fileStat.thumbnailUrls.meta)
      imageInfo = convertMetadataToImageInfo(metadata, fileStat.name, galleryKey)
    } catch {
      // Fall back to basic info without EXIF data
    }
  }

  const image: GalleryImage = {
    name: fileStat.name,
    thumbnailUrls: fileStat.thumbnailUrls,
    imageKey: fileStat.name,
    imageSrc: fullSizeSrc,
    imageName: fileStat.name,
    imageInfo,
  }

  return {
    image,
    imageElement,
    galleryKey,
  }
}

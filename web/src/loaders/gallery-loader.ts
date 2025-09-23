import { getSystemRegistryMultiple } from '@/api/registry-api.ts'
import { listFiles, statFile } from '@/api/storage-api.ts'
import { Gallery } from '@/components/image-gallery/folder-grid.tsx'
import { GalleryImage } from '@/components/image-gallery/image-view.tsx'
import { SortOption, SortOrder } from '@/generated/graphql'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { getFullImageUrl } from '@/lib/api-utils.ts'
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
  videoExtensions: string
}

export interface ImageLoaderData {
  image: GalleryImage
  imageElement: HTMLImageElement
  galleryKey: string
}

const DEFAULT_IMAGE_EXTENSIONS =
  '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif'
const DEFAULT_VIDEO_EXTENSIONS = '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg'

/**
 * Check if a file extension matches any in a comma-separated list of extensions
 * @param filename - The filename to check
 * @param extensions - Comma-separated list of extensions (e.g., '.mp4,.webm,.avi')
 * @returns true if the file extension is in the extensions list
 */
const hasExtension = (filename: string, extensions: string): boolean => {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return extensions.toLowerCase().includes(ext)
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
  const path = galleryKey

  // Fetch registry settings for gallery filtering and sorting
  let extensionsString: string | undefined
  let videoExtensions: string
  let showHidden: boolean
  let sortBy: SortOption
  let sortOrder: SortOrder
  try {
    const registryResult = await getSystemRegistryMultiple([
      'config.app_image_extensions',
      'config.app_video_extensions',
      'config.app_show_hidden',
      'config.app_default_sort_by',
      'config.app_default_sort_order',
    ])

    const imageExtensionsEntry = registryResult.find((r) => r.key === 'config.app_image_extensions')
    const videoExtensionsEntry = registryResult.find((r) => r.key === 'config.app_video_extensions')

    const imageExtensions = imageExtensionsEntry?.value || DEFAULT_IMAGE_EXTENSIONS
    videoExtensions = videoExtensionsEntry?.value || DEFAULT_VIDEO_EXTENSIONS

    // Combine image and video extensions
    extensionsString = `${imageExtensions},${videoExtensions}`

    const showHiddenEntry = registryResult.find((r) => r.key === 'config.app_show_hidden')
    showHidden = showHiddenEntry?.value === 'true'

    const sortByEntry = registryResult.find((r) => r.key === 'config.app_default_sort_by')
    sortBy = (sortByEntry?.value as SortOption) || 'NAME'

    const sortOrderEntry = registryResult.find((r) => r.key === 'config.app_default_sort_order')
    sortOrder = (sortOrderEntry?.value as SortOrder) || 'ASC'
  } catch {
    // If registry fetch fails, use defaults
    extensionsString = `${DEFAULT_IMAGE_EXTENSIONS},${DEFAULT_VIDEO_EXTENSIONS}`
    videoExtensions = DEFAULT_VIDEO_EXTENSIONS
    showHidden = false
    sortBy = 'MODIFIED_TIME'
    sortOrder = 'DESC'
  }

  // Fetch files from storage API with registry settings
  const result = await listFiles({
    path,
    extensions: extensionsString,
    showHidden,
    sortBy,
    sortOrder,
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
      isVideo: hasExtension(item.name, videoExtensions),
    }))

  // Get home title from the folder tree store
  const folderTreeState = await folderTreeStore.waitFor((state) => state.isHomeTitleLoaded)
  const homeTitle = folderTreeState.homeTitle

  // Use the actual folder name, or custom home title for root
  const galleryName = galleryKey === '' ? homeTitle : galleryKey.split('/').pop() || galleryKey

  // Generate breadcrumbs based on galleryKey
  const breadcrumbs: BreadcrumbItem[] = []

  // For root gallery (empty galleryKey), just show custom home title without href
  if (galleryKey) {
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
    videoExtensions,
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
  const basePath = galleryKey
  const imagePath = basePath ? `${basePath}/${imageKey}` : imageKey
  const fileStat = await statFile(imagePath)

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found')
  }

  // Fetch video extensions from registry to match galleryLoader behavior
  let videoExtensions: string
  try {
    const registryResult = await getSystemRegistryMultiple(['config.app_video_extensions'])
    const videoExtensionsEntry = registryResult.find((r) => r.key === 'config.app_video_extensions')
    videoExtensions = videoExtensionsEntry?.value || DEFAULT_VIDEO_EXTENSIONS
  } catch {
    videoExtensions = DEFAULT_VIDEO_EXTENSIONS
  }

  const isVideo = hasExtension(fileStat.name, videoExtensions)

  // Use the full-size thumbnail URL for the detail view (same for both images and videos)
  const fullSizeSrc = getFullImageUrl(
    fileStat.thumbnailUrls.full || fileStat.thumbnailUrls.original || '',
  )

  const imageElement = await preloadImage(fullSizeSrc)

  // Fetch real EXIF data from imagor meta API
  let imageInfo = convertMetadataToImageInfo(null, fileStat.name, galleryKey)
  if (fileStat.thumbnailUrls.meta && !isVideo) {
    try {
      const metadata = await fetchImageMetadata(getFullImageUrl(fileStat.thumbnailUrls.meta))
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
    originalSrc: getFullImageUrl(fileStat.thumbnailUrls.original || ''),
    imageName: fileStat.name,
    isVideo,
    imageInfo,
  }

  return {
    image,
    imageElement,
    galleryKey,
  }
}

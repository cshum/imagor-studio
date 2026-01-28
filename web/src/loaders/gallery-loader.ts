import { getSystemRegistryMultiple, getUserRegistryMultiple } from '@/api/registry-api.ts'
import { listFiles, statFile } from '@/api/storage-api.ts'
import { Gallery } from '@/components/image-gallery/folder-grid.tsx'
import { GalleryImage } from '@/components/image-gallery/image-view.tsx'
import { SortOption, SortOrder } from '@/generated/graphql'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { getFullImageUrl } from '@/lib/api-utils.ts'
import { convertMetadataToImageInfo, fetchImageMetadata } from '@/lib/exif-utils.ts'
import { hasExtension } from '@/lib/file-extensions.ts'
import { preloadImage } from '@/lib/preload-image.ts'
import { getAuth } from '@/stores/auth-store.ts'
import { FolderNode, folderTreeStore, updateTreeData } from '@/stores/folder-tree-store.ts'

export interface GalleryLoaderData {
  galleryName: string
  galleryKey: string
  images: GalleryImage[]
  folders: Gallery[]
  breadcrumbs: BreadcrumbItem[]
  imageExtensions: string
  videoExtensions: string
  currentSortBy: SortOption
  currentSortOrder: SortOrder
  showFileNames: boolean
}

export interface ImageLoaderData {
  image: GalleryImage
  imageElement: HTMLImageElement
  galleryKey: string
}

const DEFAULT_IMAGE_EXTENSIONS =
  '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif,.cr2'
const DEFAULT_VIDEO_EXTENSIONS = '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg'
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
  // Priority: User registry → System registry → Hardcoded defaults
  let extensionsString: string | undefined
  let imageExtensions: string
  let videoExtensions: string
  let showHidden: boolean
  let sortBy: SortOption
  let sortOrder: SortOrder
  let showFileNames: boolean

  try {
    // Get current user for user registry lookup
    const auth = getAuth()
    const userId = auth.profile?.id

    // Try user registry first (if authenticated and not guest)
    let userSortBy: string | undefined
    let userSortOrder: string | undefined
    let userShowFileNames: string | undefined
    if (userId && auth.state === 'authenticated') {
      try {
        const userRegistryResult = await getUserRegistryMultiple(
          [
            'config.app_default_sort_by',
            'config.app_default_sort_order',
            'config.app_show_file_names',
          ],
          userId,
        )

        const userSortByEntry = userRegistryResult.find(
          (r) => r.key === 'config.app_default_sort_by',
        )
        const userSortOrderEntry = userRegistryResult.find(
          (r) => r.key === 'config.app_default_sort_order',
        )
        const userShowFileNamesEntry = userRegistryResult.find(
          (r) => r.key === 'config.app_show_file_names',
        )

        userSortBy = userSortByEntry?.value
        userSortOrder = userSortOrderEntry?.value
        userShowFileNames = userShowFileNamesEntry?.value
      } catch {
        // User registry fetch failed, will fall back to system registry
      }
    }

    // Fetch system registry for all settings (and as fallback for sorting)
    const systemRegistryResult = await getSystemRegistryMultiple([
      'config.app_image_extensions',
      'config.app_video_extensions',
      'config.app_show_hidden',
      'config.app_default_sort_by',
      'config.app_default_sort_order',
      'config.app_show_file_names',
    ])

    const imageExtensionsEntry = systemRegistryResult.find(
      (r) => r.key === 'config.app_image_extensions',
    )
    const videoExtensionsEntry = systemRegistryResult.find(
      (r) => r.key === 'config.app_video_extensions',
    )

    imageExtensions = imageExtensionsEntry?.value || DEFAULT_IMAGE_EXTENSIONS
    videoExtensions = videoExtensionsEntry?.value || DEFAULT_VIDEO_EXTENSIONS

    // Combine image and video extensions
    extensionsString = `${imageExtensions},${videoExtensions}`

    const showHiddenEntry = systemRegistryResult.find((r) => r.key === 'config.app_show_hidden')
    showHidden = showHiddenEntry?.value === 'true'

    // Use user preferences if available, otherwise fall back to system registry, then defaults
    const systemSortByEntry = systemRegistryResult.find(
      (r) => r.key === 'config.app_default_sort_by',
    )
    const systemSortOrderEntry = systemRegistryResult.find(
      (r) => r.key === 'config.app_default_sort_order',
    )
    const systemShowFileNamesEntry = systemRegistryResult.find(
      (r) => r.key === 'config.app_show_file_names',
    )

    sortBy = (userSortBy || systemSortByEntry?.value || 'MODIFIED_TIME') as SortOption
    sortOrder = (userSortOrder || systemSortOrderEntry?.value || 'DESC') as SortOrder
    showFileNames = (userShowFileNames || systemShowFileNamesEntry?.value || 'false') === 'true'
  } catch {
    // If registry fetch fails, use defaults
    extensionsString = `${DEFAULT_IMAGE_EXTENSIONS},${DEFAULT_VIDEO_EXTENSIONS}`
    imageExtensions = DEFAULT_IMAGE_EXTENSIONS
    videoExtensions = DEFAULT_VIDEO_EXTENSIONS
    showHidden = false
    sortBy = 'MODIFIED_TIME'
    sortOrder = 'DESC'
    showFileNames = false
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

  // Filter and convert image files
  const images: GalleryImage[] = result.items
    .filter((item) => !item.isDirectory && item.thumbnailUrls)
    .map((item) => ({
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
      const segmentPath = segments.slice(0, i + 1).join('/')
      const segmentHref = `/gallery/${encodeURIComponent(segmentPath)}`

      // Last segment should not have href (it's the current page)
      const isLastSegment = i === segments.length - 1

      breadcrumbs.push({
        label: segment,
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
    imageExtensions,
    videoExtensions,
    currentSortBy: sortBy,
    currentSortOrder: sortOrder,
    showFileNames,
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

  // Fetch real metadata from imagor meta API (works for both images and videos)
  let imageInfo = convertMetadataToImageInfo(null, fileStat.name, galleryKey)
  if (fileStat.thumbnailUrls.meta) {
    try {
      const metadata = await fetchImageMetadata(getFullImageUrl(fileStat.thumbnailUrls.meta))
      imageInfo = convertMetadataToImageInfo(metadata, fileStat.name, galleryKey)
    } catch {
      // Fall back to basic info without metadata
    }
  }

  const image: GalleryImage = {
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

import { getSpaceRegistry } from '@/api/org-api.ts'
import { getSystemRegistryMultiple } from '@/api/registry-api.ts'
import { listFiles, statFile } from '@/api/storage-api.ts'
import { Gallery } from '@/components/image-gallery/folder-grid.tsx'
import { GalleryImage } from '@/components/image-gallery/image-view.tsx'
import { SortOption, SortOrder } from '@/generated/graphql'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { addCacheBuster, getFullImageUrl } from '@/lib/api-utils.ts'
import { convertMetadataToImageInfo, fetchImageMetadata } from '@/lib/exif-utils.ts'
import { hasExtension } from '@/lib/file-extensions.ts'
import { FILE_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '@/lib/gallery-config'
import { createLatestRequestTracker } from '@/lib/latest-request-tracker'
import { normalizeDirectoryPath } from '@/lib/path-utils'
import { preloadImage } from '@/lib/preload-image.ts'
import { getScopedUserRegistryValues } from '@/lib/user-config'
import { getAuth } from '@/stores/auth-store.ts'
import {
  ensureFolderTreeReady,
  FolderNode,
  folderTreeStore,
  updateTreeData,
} from '@/stores/folder-tree-store.ts'

export interface GalleryLoaderData {
  galleryName: string
  galleryKey: string
  spaceID?: string
  spaceName?: string
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

export const TEMPLATE_EXTENSION = '.imagor.json'
const latestGalleryLoaderRequests = createLatestRequestTracker()

/**
 * Gallery loader using imagor for thumbnail generation
 * Loads images and folders from storage API with imagor-generated thumbnails
 */
export const galleryLoader = async ({
  params: { galleryKey, spaceKey, spaceID, spaceName },
}: {
  params: { galleryKey: string; spaceKey?: string; spaceID?: string; spaceName?: string }
}): Promise<GalleryLoaderData> => {
  const requestKey = `${spaceKey || '__default__'}:${galleryKey}`
  const requestGeneration = latestGalleryLoaderRequests.begin(requestKey)

  await ensureFolderTreeReady({ spaceKey, spaceID, spaceName })

  // Use galleryKey as the path for storage API
  const path = galleryKey

  // Fetch registry settings for gallery filtering and sorting.
  // Priority in spaces: User-space registry → Space registry (with system fallback) → defaults.
  // Priority outside spaces: Global user registry → System registry → defaults.
  const extensionsString = `${FILE_EXTENSIONS},${TEMPLATE_EXTENSION}`
  const imageExtensions = IMAGE_EXTENSIONS
  const videoExtensions = VIDEO_EXTENSIONS
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
        const userRegistryValues = await getScopedUserRegistryValues(
          [
            'config.app_default_sort_by',
            'config.app_default_sort_order',
            'config.app_show_file_names',
          ],
          userId,
          { spaceID },
        )

        userSortBy = userRegistryValues['config.app_default_sort_by']
        userSortOrder = userRegistryValues['config.app_default_sort_order']
        userShowFileNames = userRegistryValues['config.app_show_file_names']
      } catch {
        // User registry fetch failed, will fall back to system registry
      }
    }

    let systemRegistryResult
    if (spaceKey) {
      try {
        systemRegistryResult = await getSpaceRegistry(spaceKey, [
          'config.app_default_sort_by',
          'config.app_default_sort_order',
          'config.app_show_file_names',
        ])
      } catch {
        systemRegistryResult = await getSystemRegistryMultiple([
          'config.app_default_sort_by',
          'config.app_default_sort_order',
          'config.app_show_file_names',
        ])
      }
    } else {
      systemRegistryResult = await getSystemRegistryMultiple([
        'config.app_default_sort_by',
        'config.app_default_sort_order',
        'config.app_show_file_names',
      ])
    }

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
    sortBy = 'MODIFIED_TIME'
    sortOrder = 'DESC'
    showFileNames = false
  }

  // Fetch files from storage API with registry settings
  const result = await listFiles({
    path,
    spaceID,
    extensions: extensionsString,
    showHidden: false,
    sortBy,
    sortOrder,
  })

  // Separate files and folders
  const folders: Gallery[] = result.items
    .filter((item) => item.isDirectory)
    .map((item) => ({
      galleryKey: normalizeDirectoryPath(item.path),
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
  if (latestGalleryLoaderRequests.isLatest(requestKey, requestGeneration)) {
    await updateTreeData(path, folderNodes, { spaceKey, spaceID, spaceName })
  }

  // Filter and convert image files (including templates)
  const images: GalleryImage[] = result.items
    .filter((item) => !item.isDirectory && item.thumbnailUrls)
    .map((item) => {
      const isTemplate = hasExtension(item.name, TEMPLATE_EXTENSION)
      let imageSrc = item.thumbnailUrls?.grid || ''

      // Add cache-busting parameter for template previews to ensure fresh previews after saves
      if (isTemplate) {
        imageSrc = addCacheBuster(imageSrc, item.modifiedTime)
      }

      return {
        imageKey: item.name,
        imageSrc,
        imageName: item.name,
        isVideo: hasExtension(item.name, videoExtensions),
        isTemplate,
      }
    })

  const folderTreeState = folderTreeStore.getState()
  const homeTitle = folderTreeState.homeTitle || spaceKey || 'Home'

  // Use the actual folder name, or custom home title for root
  const galleryName = galleryKey === '' ? homeTitle : galleryKey.split('/').pop() || galleryKey

  // Generate breadcrumbs based on galleryKey
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: homeTitle,
      ...(galleryKey ? { href: spaceKey ? `/spaces/${spaceKey}` : '/' } : {}),
    },
  ]

  if (galleryKey) {
    // Add breadcrumbs for nested paths
    const segments = galleryKey.split('/')

    // Base path for breadcrumb hrefs — space-scoped vs system gallery
    const galleryBase = spaceKey ? `/spaces/${spaceKey}/gallery` : `/gallery`

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentPath = segments.slice(0, i + 1).join('/')
      const segmentHref = `${galleryBase}/${encodeURIComponent(segmentPath)}`

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
    spaceID,
    spaceName,
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
  params: { imageKey, galleryKey, spaceID },
}: {
  params: { imageKey: string; galleryKey: string; spaceID?: string }
}): Promise<ImageLoaderData> => {
  // Use galleryKey as the path for storage API, then append the image name
  const basePath = galleryKey
  const imagePath = basePath ? `${basePath}/${imageKey}` : imageKey
  const fileStat = await statFile(imagePath, spaceID)

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found')
  }

  const isVideo = hasExtension(fileStat.name, VIDEO_EXTENSIONS)

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

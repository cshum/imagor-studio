import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  FileText,
  Home,
  MoreVertical,
  Search,
  X,
} from 'lucide-react'

import { getSystemRegistryMultiple, getUserRegistryMultiple } from '@/api/registry-api'
import { listFiles } from '@/api/storage-api'
import { FilePickerBreadcrumb } from '@/components/file-picker/file-picker-breadcrumb'
import { Gallery } from '@/components/image-gallery/folder-grid'
import { FolderNode, FolderPickerNode } from '@/components/image-gallery/folder-picker-node'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { GalleryImage } from '@/components/image-gallery/image-view'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { SortOption, SortOrder } from '@/generated/graphql'
import { hasExtension } from '@/lib/file-extensions'
import { useAuth } from '@/stores/auth-store'
import { useFolderTree } from '@/stores/folder-tree-store'

export interface FilePickerContentProps {
  currentPath: string
  selectedPaths: Set<string>
  selectionMode: 'single' | 'multiple'
  mode: 'file' | 'folder' | 'both'
  fileExtensions?: string[]
  maxItemWidth?: number
  onPathChange: (path: string) => void
  onSelectionChange: (path: string, type: 'file' | 'folder') => void
}

export const FilePickerContent: React.FC<FilePickerContentProps> = ({
  currentPath,
  selectedPaths,
  selectionMode,
  mode,
  fileExtensions,
  maxItemWidth = 200,
  onPathChange,
  onSelectionChange,
}) => {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const [folders, setFolders] = useState<Gallery[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('NAME')
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC')
  const [showFileNames, setShowFileNames] = useState(true)
  const [imageExtensions, setImageExtensions] = useState('')
  const [videoExtensions, setVideoExtensions] = useState('')
  const [contentWidth, setContentWidth] = useState(800)
  const [filterText, setFilterText] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { rootFolders, loadingPaths, homeTitle } = useFolderTree()
  const [localExpandState, setLocalExpandState] = useState<Record<string, boolean>>({})

  // Build tree with local expand state (like move dialog)
  const buildTreeWithLocalExpand = useCallback(
    (storeFolders: FolderNode[]): FolderNode[] => {
      return storeFolders.map((folder) => ({
        ...folder, // Get fresh data from store (including children!)
        isExpanded: localExpandState[folder.path] ?? false, // Override with local expand state
        children: folder.children ? buildTreeWithLocalExpand(folder.children) : undefined,
      }))
    },
    [localExpandState],
  )

  // Rebuild tree whenever rootFolders or localExpandState changes
  const localFolderTree = useMemo(
    () => buildTreeWithLocalExpand(rootFolders),
    [rootFolders, buildTreeWithLocalExpand],
  )

  // Track content width with ResizeObserver to prevent size jumps on scroll
  useEffect(() => {
    if (!contentRef.current) return

    const updateWidth = () => {
      if (contentRef.current) {
        // Subtract padding (p-2 = 8px * 2 = 16px total)
        const padding = 16
        setContentWidth(contentRef.current.clientWidth - padding)
      }
    }

    // Initial measurement
    updateWidth()

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(contentRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const userId = authState.profile?.id
        let userSortBy: string | undefined
        let userSortOrder: string | undefined
        let userShowFileNames: string | undefined

        if (userId && authState.state === 'authenticated') {
          try {
            const userRegistryResult = await getUserRegistryMultiple(
              [
                'config.app_default_sort_by',
                'config.app_default_sort_order',
                'config.app_show_file_names',
              ],
              userId,
            )

            userSortBy = userRegistryResult.find(
              (r) => r.key === 'config.app_default_sort_by',
            )?.value
            userSortOrder = userRegistryResult.find(
              (r) => r.key === 'config.app_default_sort_order',
            )?.value
            userShowFileNames = userRegistryResult.find(
              (r) => r.key === 'config.app_show_file_names',
            )?.value
          } catch {
            // User registry fetch failed
          }
        }

        const systemRegistryResult = await getSystemRegistryMultiple([
          'config.app_default_sort_by',
          'config.app_default_sort_order',
          'config.app_show_file_names',
          'config.app_video_extensions',
        ])

        const systemSortBy = systemRegistryResult.find(
          (r) => r.key === 'config.app_default_sort_by',
        )?.value
        const systemSortOrder = systemRegistryResult.find(
          (r) => r.key === 'config.app_default_sort_order',
        )?.value
        const systemShowFileNames = systemRegistryResult.find(
          (r) => r.key === 'config.app_show_file_names',
        )?.value
        const systemImageExtensions = systemRegistryResult.find(
          (r) => r.key === 'config.app_image_extensions',
        )?.value
        const systemVideoExtensions = systemRegistryResult.find(
          (r) => r.key === 'config.app_video_extensions',
        )?.value

        setSortBy((userSortBy || systemSortBy || 'NAME') as SortOption)
        setSortOrder((userSortOrder || systemSortOrder || 'ASC') as SortOrder)
        setShowFileNames((userShowFileNames || systemShowFileNames || 'true') === 'true')
        setImageExtensions(
          systemImageExtensions || '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.tif,.ico',
        )
        setVideoExtensions(
          systemVideoExtensions || '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg',
        )
      } catch {
        setSortBy('NAME')
        setSortOrder('ASC')
        setShowFileNames(true)
        setImageExtensions('.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.tif,.ico')
        setVideoExtensions('.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg')
      }
    }

    loadPreferences()
  }, [authState.profile?.id, authState.state])

  // Load files when path changes
  useEffect(() => {
    const loadFilesData = async () => {
      setIsLoading(true)
      // Reset scroll position when path changes
      setScrollTop(0)
      if (scrollAreaRef.current) {
        const scrollViewport = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]',
        )
        if (scrollViewport) {
          scrollViewport.scrollTop = 0
        }
      }
      try {
        const result = await listFiles({
          path: currentPath,
          offset: 0,
          limit: 1000,
          onlyFiles: false, // Always load both to show folder grid for navigation
          onlyFolders: mode === 'folder',
          sortBy,
          sortOrder,
        })

        // Process folders
        const folderItems: Gallery[] = result.items
          .filter((item) => item.isDirectory)
          .map((item) => ({
            galleryKey: currentPath ? `${currentPath}/${item.name}` : item.name,
            galleryName: item.name,
          }))

        // Calculate baseline extensions (all allowed media types from config)
        const baselineExtensions = [
          ...imageExtensions.split(',').map((e) => e.trim()),
          ...videoExtensions.split(',').map((e) => e.trim()),
        ]

        // If fileExtensions prop provided, filter baseline to only those
        const allowedExtensions =
          fileExtensions && fileExtensions.length > 0
            ? baselineExtensions.filter((ext) => fileExtensions.includes(ext))
            : baselineExtensions

        // Process images/files
        let imageItems: GalleryImage[] = result.items
          .filter((item) => !item.isDirectory && item.thumbnailUrls)
          .map((item) => ({
            imageKey: item.name,
            imageSrc: item.thumbnailUrls?.grid || '',
            imageName: item.name,
            isVideo: hasExtension(item.name, videoExtensions), // Always use baseline for detection
          }))

        // Filter by allowed extensions (baseline + optional fileExtensions filter)
        imageItems = imageItems.filter((item) => {
          const ext = `.${item.imageName.split('.').pop()?.toLowerCase()}`
          return allowedExtensions.includes(ext)
        })

        setFolders(folderItems)
        setImages(imageItems)
      } catch (error) {
        console.error('Failed to load files:', error)
        setFolders([])
        setImages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFilesData()
  }, [currentPath, mode, fileExtensions, sortBy, sortOrder, videoExtensions, imageExtensions])

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement
    setScrollTop(target.scrollTop)
  }

  const handleImageClick = (imageKey: string) => {
    if (mode === 'file' || mode === 'both') {
      const fullPath = currentPath ? `${currentPath}/${imageKey}` : imageKey
      onSelectionChange(fullPath, 'file')
    }
  }

  const handleImageSelectionToggle = (imageKey: string) => {
    const fullPath = currentPath ? `${currentPath}/${imageKey}` : imageKey
    onSelectionChange(fullPath, 'file')
  }

  // Calculate dimensions for grids
  const aspectRatio = 4 / 3

  // Prepare selected keys
  const selectedFolderKeys = new Set<string>()
  const selectedImageKeys = new Set<string>()

  selectedPaths.forEach((path) => {
    if (path.endsWith('/') || folders.some((f) => f.galleryKey === path)) {
      selectedFolderKeys.add(path.endsWith('/') ? path : `${path}/`)
    } else {
      // Extract just the image key for comparison
      const imageKey = currentPath ? path.replace(`${currentPath}/`, '') : path
      selectedImageKeys.add(imageKey)
    }
  })

  // Handle folder tree node updates (update local expand state only)
  const handleUpdateNode = (path: string, updates: Partial<FolderNode>) => {
    if (updates.isExpanded !== undefined) {
      setLocalExpandState((prev) => ({
        ...prev,
        [path]: updates.isExpanded!,
      }))
    }
  }

  // Apply filter to images
  const filteredImages = filterText
    ? images.filter((image) => image.imageName.toLowerCase().includes(filterText.toLowerCase()))
    : images

  const isLoadingRoot = loadingPaths.has('')

  return (
    <div className='flex h-full overflow-hidden'>
      {/* Left sidebar - Folder tree */}
      <div className='w-64 flex-shrink-0 border-r'>
        <ScrollArea className='h-full'>
          <div className='p-2'>
            <div className='mb-2 px-2 py-1 text-sm font-semibold'>
              {t('components.folderTree.folders')}
            </div>
            {/* Home/Root folder */}
            <div
              className={`mb-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                currentPath === '' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-accent'
              }`}
              onClick={() => onPathChange('')}
            >
              <Home className={`h-4 w-4 ${currentPath === '' ? 'text-white' : ''}`} />
              <span className='flex-1 truncate'>{homeTitle}</span>
            </div>

            {/* Folder tree */}
            {isLoadingRoot ? (
              <div className='space-y-2 p-2'>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className='h-8 w-full' />
                ))}
              </div>
            ) : localFolderTree.length === 0 ? (
              <div className='text-muted-foreground p-4 text-center text-sm'>
                {t('components.folderTree.noFoldersFound')}
              </div>
            ) : (
              <div className='space-y-0.5'>
                {localFolderTree.map((folder) => (
                  <FolderPickerNode
                    key={folder.path}
                    folder={folder}
                    selectedPath={currentPath}
                    excludePaths={new Set()}
                    onSelect={onPathChange}
                    onUpdateNode={handleUpdateNode}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right content - Breadcrumb + Grid */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Breadcrumb with Dropdown Menu */}
        <div className='border-b px-4 py-2'>
          <div className='flex items-center justify-between'>
            {/* Left: Breadcrumb */}
            <FilePickerBreadcrumb
              currentPath={currentPath}
              homeTitle={homeTitle}
              onNavigate={onPathChange}
            />

            {/* Right: Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='h-8 w-8'>
                  <MoreVertical className='h-4 w-4' />
                  <span className='sr-only'>{t('common.buttons.more')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                {/* Filter Input */}
                <div className='px-2 py-1.5'>
                  <div className='relative'>
                    <Search className='text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2' />
                    <Input
                      type='text'
                      placeholder={t('pages.gallery.filter.placeholder')}
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className='h-8 pr-8 pl-8'
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    {filterText && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setFilterText('')
                        }}
                        className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2'
                        aria-label={t('pages.gallery.filter.clearFilter')}
                      >
                        <X className='h-4 w-4' />
                      </button>
                    )}
                  </div>
                </div>

                {/* Show File Names Toggle */}
                <DropdownMenuItem
                  className='hover:cursor-pointer'
                  onSelect={(event) => {
                    event.preventDefault()
                    setShowFileNames(!showFileNames)
                  }}
                >
                  <FileText className='text-muted-foreground mr-3 h-4 w-4' />
                  {t('pages.gallery.showFileNames')}
                  {showFileNames && <Check className='ml-auto h-4 w-4' />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('pages.gallery.sorting.sort')}</DropdownMenuLabel>

                {/* Sort by Name */}
                <DropdownMenuItem
                  className='hover:cursor-pointer'
                  onSelect={(event) => {
                    event.preventDefault()
                    if (sortBy === 'NAME') {
                      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
                    } else {
                      setSortBy('NAME')
                      setSortOrder('ASC')
                    }
                  }}
                >
                  <FileText className='text-muted-foreground mr-3 h-4 w-4' />
                  {t('pages.gallery.sorting.name')}
                  {sortBy === 'NAME' &&
                    (sortOrder === 'ASC' ? (
                      <ArrowUp className='ml-auto h-4 w-4' />
                    ) : (
                      <ArrowDown className='ml-auto h-4 w-4' />
                    ))}
                </DropdownMenuItem>

                {/* Sort by Modified Time */}
                <DropdownMenuItem
                  className='hover:cursor-pointer'
                  onSelect={(event) => {
                    event.preventDefault()
                    if (sortBy === 'MODIFIED_TIME') {
                      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
                    } else {
                      setSortBy('MODIFIED_TIME')
                      setSortOrder('DESC')
                    }
                  }}
                >
                  <Clock className='text-muted-foreground mr-3 h-4 w-4' />
                  {t('pages.gallery.sorting.modifiedTime')}
                  {sortBy === 'MODIFIED_TIME' &&
                    (sortOrder === 'ASC' ? (
                      <ArrowUp className='ml-auto h-4 w-4' />
                    ) : (
                      <ArrowDown className='ml-auto h-4 w-4' />
                    ))}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Scrollable content area */}
        <ScrollArea ref={scrollAreaRef} className='flex-1' onScrollCapture={handleScroll}>
          <div ref={contentRef} className='overflow-hidden p-2'>
            {isLoading ? (
              // Loading skeleton - 3 column grid
              <div className='grid grid-cols-3 gap-2'>
                {Array.from({ length: 9 }).map((_, index) => (
                  <Skeleton key={index} className='aspect-[4/3] w-full rounded-md' />
                ))}
              </div>
            ) : filteredImages.length === 0 ? (
              <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                {t('components.filePicker.noFiles')}
              </div>
            ) : (
              /* Image Grid - Folders navigated via sidebar tree only */
              <ImageGrid
                images={filteredImages}
                aspectRatio={aspectRatio}
                width={contentWidth}
                scrollTop={scrollTop}
                folderGridHeight={0}
                maxImageWidth={maxItemWidth}
                showFileName={showFileNames}
                selectedImageKeys={selectedImageKeys}
                onImageClick={handleImageClick}
                onImageSelectionToggle={
                  selectionMode === 'multiple' ? handleImageSelectionToggle : undefined
                }
                galleryKey={currentPath}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

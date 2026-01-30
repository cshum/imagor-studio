import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Play } from 'lucide-react'

import { getSystemRegistryMultiple, getUserRegistryMultiple } from '@/api/registry-api'
import { listFiles } from '@/api/storage-api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { SortOption, SortOrder } from '@/generated/graphql'
import { getFullImageUrl } from '@/lib/api-utils'
import { hasExtension } from '@/lib/file-extensions'
import { useAuth } from '@/stores/auth-store'

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  thumbnailUrl?: string
  isVideo?: boolean
}

export interface FilePickerGridProps {
  currentPath: string
  selectedPaths: Set<string>
  selectionMode: 'single' | 'multiple'
  mode: 'file' | 'folder' | 'both'
  fileExtensions?: string[]
  onSelectionChange: (path: string, type: 'file' | 'folder') => void
}

export const FilePickerGrid: React.FC<FilePickerGridProps> = ({
  currentPath,
  selectedPaths,
  selectionMode,
  mode,
  fileExtensions,
  onSelectionChange,
}) => {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('NAME')
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC')
  const [showFileNames, setShowFileNames] = useState(true)
  const [videoExtensions, setVideoExtensions] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const userId = authState.profile?.id
        let userSortBy: string | undefined
        let userSortOrder: string | undefined
        let userShowFileNames: string | undefined

        // Try user registry first (if authenticated)
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
            // User registry fetch failed, will fall back to system registry
          }
        }

        // Fetch system registry as fallback
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
        const systemVideoExtensions = systemRegistryResult.find(
          (r) => r.key === 'config.app_video_extensions',
        )?.value

        setSortBy((userSortBy || systemSortBy || 'NAME') as SortOption)
        setSortOrder((userSortOrder || systemSortOrder || 'ASC') as SortOrder)
        setShowFileNames((userShowFileNames || systemShowFileNames || 'true') === 'true')
        setVideoExtensions(
          systemVideoExtensions || '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg',
        )
      } catch {
        // Use defaults if registry fetch fails
        setSortBy('NAME')
        setSortOrder('ASC')
        setShowFileNames(true)
        setVideoExtensions('.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg')
      }
    }

    loadPreferences()
  }, [authState.profile?.id, authState.state])

  // Load files when path changes
  useEffect(() => {
    const loadFilesData = async () => {
      setIsLoading(true)
      try {
        const result = await listFiles({
          path: currentPath,
          offset: 0,
          limit: 1000, // Load all files for simplicity
          onlyFiles: mode === 'file',
          onlyFolders: mode === 'folder',
          sortBy,
          sortOrder,
        })

        // Filter by file extensions if provided
        let items = result.items.map((item) => ({
          name: item.name,
          path: currentPath ? `${currentPath}/${item.name}` : item.name,
          isDirectory: item.isDirectory,
          size: item.size,
          thumbnailUrl: item.thumbnailUrls?.grid || undefined,
          isVideo: hasExtension(item.name, videoExtensions),
        }))

        if (fileExtensions && fileExtensions.length > 0) {
          items = items.filter((item) => {
            if (item.isDirectory) return true
            const ext = item.name.split('.').pop()?.toLowerCase()
            return ext && fileExtensions.includes(ext)
          })
        }

        setFiles(items)
      } catch (error) {
        console.error('Failed to load files:', error)
        setFiles([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFilesData()
  }, [currentPath, mode, fileExtensions, sortBy, sortOrder, videoExtensions])

  // Virtual scrolling calculations
  const aspectRatio = 4 / 3
  const maxItemWidth = 250
  const containerWidth = containerRef.current?.clientWidth || 800
  const columnCount = Math.max(2, Math.floor(containerWidth / maxItemWidth))
  const columnWidth = containerWidth / columnCount
  const rowHeight = columnWidth / aspectRatio

  const rowCount = Math.ceil(files.length / columnCount)
  const totalHeight = rowCount * rowHeight

  const visibleRowsCount = Math.ceil(600 / rowHeight) // Approximate viewport height
  const overscanCount = visibleRowsCount
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount

  const startImageIndex = Math.max(
    0,
    Math.floor(scrollTop / rowHeight - overscanCount) * columnCount,
  )
  const endImageIndex = Math.min(files.length, startImageIndex + totalRenderedRows * columnCount)

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement
    setScrollTop(target.scrollTop)
  }

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory && (mode === 'folder' || mode === 'both')) {
      onSelectionChange(file.path, 'folder')
    } else if (!file.isDirectory && (mode === 'file' || mode === 'both')) {
      onSelectionChange(file.path, 'file')
    }
  }

  if (isLoading) {
    return (
      <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className='space-y-2'>
            <Skeleton className='aspect-[4/3] w-full rounded-md' />
            <Skeleton className='h-4 w-3/4' />
          </div>
        ))}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
        {t('components.filePicker.noFiles')}
      </div>
    )
  }

  return (
    <ScrollArea className='h-full' onScrollCapture={handleScroll}>
      <div ref={containerRef} className='relative' style={{ height: `${totalHeight}px` }}>
        {files.slice(startImageIndex, endImageIndex).map((file, idx) => {
          const actualIndex = startImageIndex + idx
          const rowIndex = Math.floor(actualIndex / columnCount)
          const columnIndex = actualIndex % columnCount
          const isSelected = selectedPaths.has(file.path)

          return (
            <div
              key={file.path}
              className='group absolute cursor-pointer p-2'
              style={{
                width: `${columnWidth}px`,
                height: `${rowHeight}px`,
                transform: `translate3d(${columnIndex * columnWidth}px, ${rowIndex * rowHeight}px, 0)`,
              }}
              onClick={() => handleFileClick(file)}
            >
              <div
                className={`relative h-full w-full overflow-hidden rounded-md bg-gray-200 transition-all dark:bg-gray-700 ${
                  isSelected ? 'ring-2 ring-blue-600' : ''
                } hover:scale-105`}
              >
                {file.thumbnailUrl ? (
                  <img
                    src={getFullImageUrl(file.thumbnailUrl)}
                    alt={file.name}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <div className='text-muted-foreground flex h-full w-full items-center justify-center'>
                    {file.isDirectory ? '📁' : '📄'}
                  </div>
                )}

                {/* Selection checkbox */}
                {selectionMode === 'multiple' && (
                  <div
                    className={`pointer-events-none absolute top-2 left-2 opacity-0 transition-opacity group-hover:opacity-100 ${
                      isSelected ? '!opacity-100' : ''
                    }`}
                  >
                    <div
                      className={`rounded-full p-1.5 ${isSelected ? 'bg-blue-600' : 'bg-black/30'}`}
                    >
                      <Check className='h-4 w-4 text-white' />
                    </div>
                  </div>
                )}

                {/* Video indicator */}
                {file.isVideo && (
                  <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 opacity-80'>
                    <Play className='h-6 w-6 fill-white text-white' />
                  </div>
                )}

                {/* File name */}
                {showFileNames && (
                  <div className='absolute right-0 bottom-0 left-0 bg-black/60 px-2 py-1.5 text-xs text-white'>
                    <div className='truncate' title={file.name}>
                      {file.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

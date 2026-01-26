import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { generateImagorUrl } from '@/api/imagor-api'
import { setUserRegistryMultiple } from '@/api/registry-api.ts'
import { deleteFile, moveFile } from '@/api/storage-api.ts'
import { HeaderBar } from '@/components/header-bar'
import { CreateFolderDialog } from '@/components/image-gallery/create-folder-dialog'
import { DeleteFolderDialog } from '@/components/image-gallery/delete-folder-dialog'
import { DeleteImageDialog } from '@/components/image-gallery/delete-image-dialog'
import { EmptyGalleryState } from '@/components/image-gallery/empty-gallery-state'
import { FolderContextMenu } from '@/components/image-gallery/folder-context-menu'
import { FolderGrid, Gallery } from '@/components/image-gallery/folder-grid'
import { GalleryDropZone } from '@/components/image-gallery/gallery-drop-zone'
import { ImageContextData, ImageContextMenu } from '@/components/image-gallery/image-context-menu'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator as ContextMenuSeparatorComponent,
} from '@/components/ui/context-menu'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { UploadProgress } from '@/components/upload/upload-progress.tsx'
import { ImagorParamsInput, SortOption, SortOrder } from '@/generated/graphql'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { DragDropFile } from '@/hooks/use-drag-drop.ts'
import { useFolderContextMenu } from '@/hooks/use-folder-context-menu'
import { useGalleryKeyboardNavigation } from '@/hooks/use-gallery-keyboard-navigation'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { restoreScrollPosition, useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { ContentLayout } from '@/layouts/content-layout'
import { getFullImageUrl } from '@/lib/api-utils'
import { GalleryLoaderData } from '@/loaders/gallery-loader.ts'
import { useAuth } from '@/stores/auth-store'
import { setCurrentPath } from '@/stores/folder-tree-store.ts'
import { ImagePosition, setPosition } from '@/stores/image-position-store.ts'
import { useSidebar } from '@/stores/sidebar-store.ts'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'

export interface GalleryPageProps extends React.PropsWithChildren {
  galleryLoaderData: GalleryLoaderData
  galleryKey: string
}

export function GalleryPage({ galleryLoaderData, galleryKey, children }: GalleryPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const fileSelectHandlerRef = useRef<((fileList: FileList | null) => void) | null>(null)
  const { isLoading, pendingMatches } = useRouterState()
  const { authState } = useAuth()
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)
  const [deleteImageDialog, setDeleteImageDialog] = useState<{
    open: boolean
    imageKey: string | null
    isDeleting: boolean
  }>({
    open: false,
    imageKey: null,
    isDeleting: false,
  })
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{
    open: boolean
    folderKey: string | null
    folderName: string | null
    isDeleting: boolean
  }>({
    open: false,
    folderKey: null,
    folderName: null,
    isDeleting: false,
  })
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean
    itemPath: string | null
    itemName: string | null
    itemType: 'file' | 'folder'
    isRenaming: boolean
  }>({
    open: false,
    itemPath: null,
    itemName: null,
    itemType: 'file',
    isRenaming: false,
  })
  const [renameInput, setRenameInput] = useState('')
  const [renameFileExtension, setRenameFileExtension] = useState('')
  const [uploadState, setUploadState] = useState<{
    files: DragDropFile[]
    isUploading: boolean
    uploadFiles: () => Promise<void>
    removeFile: (id: string) => void
    retryFile: (id: string) => Promise<void>
    clearFiles: () => void
  } | null>(null)
  const [copyUrlDialog, setCopyUrlDialog] = useState<{
    open: boolean
    url: string
  }>({
    open: false,
    url: '',
  })
  const [filterText, setFilterText] = useState('')

  const {
    galleryName,
    images,
    folders,
    currentSortBy,
    currentSortOrder,
    imageExtensions,
    videoExtensions,
    showFileNames,
  } = galleryLoaderData
  const sidebar = useSidebar()

  // Filter images and folders based on search text
  const filteredFolders = filterText
    ? folders.filter((folder) =>
        folder.galleryName.toLowerCase().includes(filterText.toLowerCase()),
      )
    : folders

  const filteredImages = filterText
    ? images.filter((image) => image.imageName.toLowerCase().includes(filterText.toLowerCase()))
    : images

  const totalItems = folders.length + images.length
  const filteredCount = filteredFolders.length + filteredImages.length

  const handleSortChange = async (sortBy: SortOption, sortOrder: SortOrder) => {
    if (authState.profile?.id && authState.state === 'authenticated') {
      await setUserRegistryMultiple(
        [
          { key: 'config.app_default_sort_by', value: sortBy, isEncrypted: false },
          { key: 'config.app_default_sort_order', value: sortOrder, isEncrypted: false },
        ],
        authState.profile.id,
      )
      // Invalidate only the current gallery route to trigger loader reload
      router.invalidate()
    }
  }

  const isDesktop = useBreakpoint('md')
  const maxItemWidth = 250

  const { scrollPosition } = useScrollHandler(galleryKey)
  const { contentWidth, updateWidth } = useWidthHandler(
    contentRef,
    sidebar.open,
    isDesktop ? 32 : 16,
  )
  useResizeHandler(updateWidth)

  const isScrolledDown = scrollPosition > 22 + 8 + (isDesktop ? 48 : 38)
  const isEmpty = images.length === 0 && folders.length === 0
  const isRootGallery = galleryKey === ''

  // Calculate column counts for keyboard navigation
  const folderColumnCount = Math.max(2, Math.floor(contentWidth / maxItemWidth))
  const imageColumnCount = Math.max(3, Math.floor(contentWidth / maxItemWidth))

  // Calculate folder grid height for scroll calculations
  const folderRowCount = folders.length > 0 ? Math.ceil(folders.length / folderColumnCount) : 0
  const folderCardPadding = isDesktop ? 24 : 32 // py-3 (12*2) or py-4 (16*2)
  const folderCardHeight = 20 + folderCardPadding // icon/text height + padding
  const folderGap = 8 // gap-2
  const folderGridHeight =
    folders.length > 0 ? folderRowCount * (folderCardHeight + folderGap) + 16 : 0 // +16 for mb-4

  // Determine if folders are visible
  const foldersVisible = scrollPosition < folderGridHeight

  // Define handlers before hook
  const handleImageClick = (imageKey: string, position?: ImagePosition | null) => {
    if (position) {
      setPosition(galleryKey, imageKey, position)
    }

    // Handle navigation for root gallery vs sub-galleries
    if (galleryKey === '') {
      return navigate({
        to: '/$imageKey',
        params: { imageKey },
      })
    } else {
      return navigate({
        to: '/gallery/$galleryKey/$imageKey',
        params: { galleryKey, imageKey },
      })
    }
  }

  const handleFolderClick = ({ galleryKey }: Gallery) => {
    return navigate({
      to: '/gallery/$galleryKey',
      params: { galleryKey },
    })
  }

  // Keyboard navigation hook
  const { galleryContainerRef, galleryContainerProps, folderGridProps, imageGridProps } =
    useGalleryKeyboardNavigation({
      folders,
      images,
      folderColumnCount,
      imageColumnCount,
      onFolderClick: handleFolderClick,
      onImageClick: handleImageClick,
    })

  useEffect(() => {
    setCurrentPath(galleryKey)
    requestAnimationFrame(() => restoreScrollPosition(galleryKey))
    setFilterText('')
  }, [galleryKey])

  const handleUploadFiles = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0 && fileSelectHandlerRef.current) {
      // Use the file select handler from GalleryDropZone
      fileSelectHandlerRef.current(files)
      // Reset the input value so the same file can be selected again
      event.target.value = ''
    }
  }

  const handleFileSelectHandler = (handler: (fileList: FileList | null) => void) => {
    fileSelectHandlerRef.current = handler
  }

  const handleEditImage = (imageKey: string) => {
    if (galleryKey) {
      navigate({
        to: '/gallery/$galleryKey/$imageKey/editor',
        params: { galleryKey, imageKey },
      })
    } else {
      navigate({
        to: '/$imageKey/editor',
        params: { imageKey },
      })
    }
  }

  const handleDeleteImageFromMenu = (imageKey: string) => {
    setDeleteImageDialog({
      open: true,
      imageKey,
      isDeleting: false,
    })
  }

  const handleDeleteImage = async () => {
    if (!deleteImageDialog.imageKey) return

    setDeleteImageDialog((prev) => ({ ...prev, isDeleting: true }))

    try {
      const imagePath = galleryKey
        ? `${galleryKey}/${deleteImageDialog.imageKey}`
        : deleteImageDialog.imageKey

      await deleteFile(imagePath)
      setDeleteImageDialog({
        open: false,
        imageKey: null,
        isDeleting: false,
      })

      router.invalidate()
      toast.success(
        t('pages.gallery.deleteImage.success', { fileName: deleteImageDialog.imageKey }),
      )
    } catch {
      toast.error(t('pages.gallery.deleteImage.error'))
      setDeleteImageDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteDialogClose = (open: boolean) => {
    if (!deleteImageDialog.isDeleting) {
      setDeleteImageDialog({
        open,
        imageKey: null,
        isDeleting: false,
      })
    }
  }

  const handleDeleteFolder = async () => {
    if (!deleteFolderDialog.folderKey || !deleteFolderDialog.folderName) return

    setDeleteFolderDialog((prev) => ({ ...prev, isDeleting: true }))

    try {
      // folderKey is already the full path from the context menu
      await handleDeleteFolderOperation(deleteFolderDialog.folderKey, deleteFolderDialog.folderName)

      setDeleteFolderDialog({
        open: false,
        folderKey: null,
        folderName: null,
        isDeleting: false,
      })
    } catch {
      setDeleteFolderDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteFolderDialogClose = (open: boolean) => {
    if (!deleteFolderDialog.isDeleting) {
      setDeleteFolderDialog({
        open,
        folderKey: null,
        folderName: null,
        isDeleting: false,
      })
    }
  }

  const handleRenameFromMenu = (itemKey: string, itemName: string, itemType: 'file' | 'folder') => {
    // itemKey is already the full path for folders from context menu
    // For files, we need to construct the full path
    const itemPath =
      itemType === 'file' ? (galleryKey ? `${galleryKey}/${itemKey}` : itemKey) : itemKey // folderKey is already full path

    // For files, extract extension and show only the name without extension
    let nameWithoutExt = itemName
    let extension = ''

    if (itemType === 'file') {
      const lastDot = itemName.lastIndexOf('.')
      if (lastDot > 0) {
        nameWithoutExt = itemName.substring(0, lastDot)
        extension = itemName.substring(lastDot) // includes the dot
      }
    }

    setRenameDialog({
      open: true,
      itemPath,
      itemName,
      itemType,
      isRenaming: false,
    })
    setRenameInput(nameWithoutExt)
    setRenameFileExtension(extension)
  }

  const handleRename = async () => {
    if (!renameDialog.itemPath || !renameInput.trim()) return

    setRenameDialog((prev) => ({ ...prev, isRenaming: true }))

    try {
      const newName =
        renameDialog.itemType === 'file'
          ? renameInput.trim() + renameFileExtension
          : renameInput.trim()

      if (renameDialog.itemType === 'folder') {
        // Use centralized folder rename handler from hook
        await handleRenameFolderOperation(renameDialog.itemPath, newName)
      } else {
        // Handle file rename locally
        const pathParts = renameDialog.itemPath.split('/')
        pathParts[pathParts.length - 1] = newName
        const newPath = pathParts.join('/')

        await moveFile(renameDialog.itemPath, newPath)
        router.invalidate()
        toast.success(t('pages.gallery.renameItem.success', { name: newName }))
      }

      setRenameDialog({
        open: false,
        itemPath: null,
        itemName: null,
        itemType: 'file',
        isRenaming: false,
      })
      setRenameInput('')
      setRenameFileExtension('')
    } catch {
      toast.error(t('pages.gallery.renameItem.error', { type: renameDialog.itemType }))
      setRenameDialog((prev) => ({ ...prev, isRenaming: false }))
    }
  }

  const handleRenameDialogClose = (open: boolean) => {
    if (!renameDialog.isRenaming) {
      setRenameDialog({
        open,
        itemPath: null,
        itemName: null,
        itemType: 'file',
        isRenaming: false,
      })
      setRenameInput('')
      setRenameFileExtension('')
    }
  }

  const handleCopyUrl = async (imageKey: string, isVideo: boolean = false) => {
    try {
      // Generate original image URL (no transformations for images, raw filter for videos)
      const params = isVideo ? { filters: [{ name: 'raw', args: '' }] } : {}

      const url = await generateImagorUrl({
        galleryKey,
        imageKey,
        params: params as ImagorParamsInput,
      })
      const fullUrl = getFullImageUrl(url)
      setCopyUrlDialog({
        open: true,
        url: fullUrl,
      })
    } catch {
      toast.error(t('pages.gallery.contextMenu.copyUrlError'))
    }
  }

  const handleDownload = async (imageKey: string) => {
    try {
      const filters = [
        { name: 'raw', args: '' },
        { name: 'attachment', args: '' },
      ]

      const url = await generateImagorUrl({
        galleryKey,
        imageKey,
        params: {
          filters,
        } as ImagorParamsInput,
      })
      // Use location.href for reliable downloads across all browsers
      window.location.href = getFullImageUrl(url)
    } catch {
      toast.error(t('pages.gallery.contextMenu.downloadError'))
    }
  }

  const renderContextMenuItems = ({ imageName, imageKey, position, isVideo }: ImageContextData) => {
    const isAuthenticated = authState.state === 'authenticated'
    const canEdit = (isAuthenticated || authState.isEmbedded) && !isVideo

    if (!imageKey) return null

    return (
      <>
        <ContextMenuLabel className='break-all'>{imageName}</ContextMenuLabel>
        <ContextMenuSeparatorComponent />
        <ContextMenuItem onClick={() => handleImageClick(imageKey, position)}>
          <Eye className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </ContextMenuItem>
        {canEdit && (
          <ContextMenuItem onClick={() => handleEditImage(imageKey)}>
            <Pencil className='mr-2 h-4 w-4' />
            {t('pages.gallery.contextMenu.edit')}
          </ContextMenuItem>
        )}
        {isAuthenticated && (
          <>
            <ContextMenuItem onClick={() => handleCopyUrl(imageKey, isVideo)}>
              <Copy className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.copyUrl')}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleDownload(imageKey)}>
              <Download className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.download')}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
                setTimeout(() => handleRenameFromMenu(imageKey, imageName, 'file'), 0)
              }}
            >
              <Type className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </ContextMenuItem>
            <ContextMenuSeparatorComponent />
            <ContextMenuItem
              onClick={() => {
                // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
                setTimeout(() => handleDeleteImageFromMenu(imageKey), 0)
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.delete')}
            </ContextMenuItem>
          </>
        )}
      </>
    )
  }

  // Render function for dropdown menus (uses DropdownMenuItem instead of ContextMenuItem)
  const renderDropdownMenuItems = (imageName: string, imageKey: string, isVideo: boolean) => {
    const isAuthenticated = authState.state === 'authenticated'
    const canEdit = (isAuthenticated || authState.isEmbedded) && !isVideo

    if (!imageKey) return null

    return (
      <>
        <DropdownMenuLabel className='break-all'>{imageName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleImageClick(imageKey)}>
          <Eye className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => handleEditImage(imageKey)}>
            <Pencil className='mr-2 h-4 w-4' />
            {t('pages.gallery.contextMenu.edit')}
          </DropdownMenuItem>
        )}
        {isAuthenticated && (
          <>
            <DropdownMenuItem onClick={() => handleCopyUrl(imageKey, isVideo)}>
              <Copy className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.copyUrl')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload(imageKey)}>
              <Download className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.download')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRenameFromMenu(imageKey, imageName, 'file')}>
              <Type className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteImageFromMenu(imageKey)}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.delete')}
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  // Use the shared folder context menu hook for context menus (right-click)
  const {
    renderMenuItems: renderFolderContextMenuItems,
    handleRename: handleRenameFolderOperation,
    handleDelete: handleDeleteFolderOperation,
  } = useFolderContextMenu({
    isAuthenticated: () => authState.state === 'authenticated',
    onRename: (folderKey, folderName) => handleRenameFromMenu(folderKey, folderName, 'folder'),
    onDelete: (folderKey, folderName) => {
      setDeleteFolderDialog({
        open: true,
        folderKey,
        folderName,
        isDeleting: false,
      })
    },
  })

  // Use the shared folder context menu hook for dropdown menus (three-dots)
  const { renderMenuItems: renderFolderDropdownMenuItems } = useFolderContextMenu({
    isAuthenticated: () => authState.state === 'authenticated',
    onRename: (folderKey, folderName) => handleRenameFromMenu(folderKey, folderName, 'folder'),
    onDelete: (folderKey, folderName) => {
      setDeleteFolderDialog({
        open: true,
        folderKey,
        folderName,
        isDeleting: false,
      })
    },
    useDropdownItems: true,
  })

  const isNavigateToImage = !!(
    pendingMatches?.length &&
    pendingMatches[pendingMatches.length - 1].routeId?.toString()?.includes('$imageKey')
  )

  // Handler for toggling show file names
  const handleToggleShowFileNames = async () => {
    const newValue = !showFileNames
    if (authState.profile?.id) {
      await setUserRegistryMultiple(
        [{ key: 'config.app_show_file_names', value: newValue.toString(), isEncrypted: false }],
        authState.profile.id,
      )
      // Invalidate the router to reload loader data with new value
      router.invalidate()
    }
  }

  // Create menu items for authenticated users
  const customMenuItems =
    authState.state === 'authenticated' ? (
      <>
        {/* Filter Section */}
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
          {filterText && (
            <p className='text-muted-foreground mt-1 text-xs'>
              {t('pages.gallery.filter.showingFiltered', {
                count: filteredCount,
                total: totalItems,
              })}
            </p>
          )}
        </div>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            handleToggleShowFileNames()
          }}
        >
          <FileText className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.showFileNames')}
          {showFileNames && <Check className='ml-auto h-4 w-4' />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={() => {
            // need to wait for dropdown close before opening dialog
            setTimeout(() => setIsCreateFolderDialogOpen(true), 0)
          }}
        >
          <FolderPlus className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.createFolder.newFolder')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={() => {
            // need to wait for dropdown close before triggering file dialog
            setTimeout(() => handleUploadFiles(), 0)
          }}
        >
          <Upload className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.upload.uploadFiles')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('pages.gallery.sorting.sort')}</DropdownMenuLabel>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            // If already selected, toggle sort order; otherwise switch to this sort option
            if (currentSortBy === 'NAME') {
              handleSortChange('NAME', currentSortOrder === 'ASC' ? 'DESC' : 'ASC')
            } else {
              handleSortChange('NAME', currentSortOrder)
            }
          }}
        >
          <FileText className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.sorting.name')}
          {currentSortBy === 'NAME' &&
            (currentSortOrder === 'ASC' ? (
              <ArrowUp className='ml-auto h-4 w-4' />
            ) : (
              <ArrowDown className='ml-auto h-4 w-4' />
            ))}
        </DropdownMenuItem>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            // If already selected, toggle sort order; otherwise switch to this sort option
            if (currentSortBy === 'MODIFIED_TIME') {
              handleSortChange('MODIFIED_TIME', currentSortOrder === 'ASC' ? 'DESC' : 'ASC')
            } else {
              handleSortChange('MODIFIED_TIME', currentSortOrder)
            }
          }}
        >
          <Clock className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.sorting.modifiedTime')}
          {currentSortBy === 'MODIFIED_TIME' &&
            (currentSortOrder === 'ASC' ? (
              <ArrowUp className='ml-auto h-4 w-4' />
            ) : (
              <ArrowDown className='ml-auto h-4 w-4' />
            ))}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </>
    ) : null

  return (
    <>
      {isNavigateToImage && <LoadingBar isLoading={isLoading} />}
      <ContentLayout title={galleryName}>
        <GalleryDropZone
          currentPath={galleryKey}
          existingFiles={images.map((img) => img.imageName)}
          imageExtensions={imageExtensions}
          videoExtensions={videoExtensions}
          onFileSelect={handleFileSelectHandler}
          onUploadStateChange={setUploadState}
          className='min-h-screen'
        >
          <div className='mx-4 my-2 grid'>
            <h1 className='text-3xl md:text-4xl'>{galleryName}</h1>
          </div>
          <HeaderBar isScrolled={isScrolledDown} customMenuItems={customMenuItems} />

          <Card className='rounded-lg border-none'>
            <CardContent className='overflow-hidden p-2 md:p-4' ref={contentRef}>
              {/* Upload Progress - After header, before gallery content */}
              {uploadState && uploadState.files.length > 0 && (
                <div className='mb-4'>
                  <UploadProgress
                    files={uploadState.files}
                    isUploading={uploadState.isUploading}
                    onUpload={uploadState.uploadFiles}
                    onRemoveFile={uploadState.removeFile}
                    onRetryFile={uploadState.retryFile}
                    onClearAll={uploadState.clearFiles}
                  />
                </div>
              )}
              {contentWidth > 0 && (
                <>
                  {isEmpty ? (
                    <EmptyGalleryState width={contentWidth} isRootGallery={isRootGallery} />
                  ) : (
                    <div ref={galleryContainerRef} {...galleryContainerProps}>
                      {filteredFolders.length > 0 && (
                        <FolderContextMenu renderMenuItems={renderFolderContextMenuItems}>
                          <FolderGrid
                            folders={filteredFolders}
                            width={contentWidth}
                            maxFolderWidth={maxItemWidth}
                            foldersVisible={foldersVisible}
                            renderMenuItems={(folder) =>
                              renderFolderDropdownMenuItems({
                                folderKey: folder.galleryKey,
                                folderName: folder.galleryName,
                              })
                            }
                            {...folderGridProps}
                          />
                        </FolderContextMenu>
                      )}
                      <ImageContextMenu renderMenuItems={renderContextMenuItems}>
                        <ImageGrid
                          images={filteredImages}
                          aspectRatio={4 / 3}
                          width={contentWidth}
                          scrollTop={scrollPosition}
                          folderGridHeight={folderGridHeight}
                          maxImageWidth={maxItemWidth}
                          showFileName={showFileNames}
                          renderMenuItems={(image) =>
                            renderDropdownMenuItems(
                              image.imageName,
                              image.imageKey,
                              image.isVideo || false,
                            )
                          }
                          {...imageGridProps}
                        />
                      </ImageContextMenu>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </GalleryDropZone>
      </ContentLayout>

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        currentPath={galleryKey}
      />

      <DeleteImageDialog
        open={deleteImageDialog.open}
        onOpenChange={handleDeleteDialogClose}
        imageName={deleteImageDialog.imageKey || ''}
        isDeleting={deleteImageDialog.isDeleting}
        onConfirm={handleDeleteImage}
      />

      <DeleteFolderDialog
        open={deleteFolderDialog.open}
        onOpenChange={handleDeleteFolderDialogClose}
        folderName={deleteFolderDialog.folderName || ''}
        isDeleting={deleteFolderDialog.isDeleting}
        onConfirm={handleDeleteFolder}
      />

      <CopyUrlDialog
        open={copyUrlDialog.open}
        onOpenChange={(open) => setCopyUrlDialog({ open, url: copyUrlDialog.url })}
        url={copyUrlDialog.url}
      />

      <Dialog open={renameDialog.open} onOpenChange={handleRenameDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('pages.gallery.renameItem.title', { type: renameDialog.itemType })}
            </DialogTitle>
            <DialogDescription>
              {t('pages.gallery.renameItem.description', { type: renameDialog.itemType })}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder={t('pages.gallery.renameItem.placeholder')}
              disabled={renameDialog.isRenaming}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameInput.trim()) {
                  handleRename()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => handleRenameDialogClose(false)}
              disabled={renameDialog.isRenaming}
            >
              {t('common.buttons.cancel')}
            </Button>
            <ButtonWithLoading
              onClick={handleRename}
              disabled={!renameInput.trim()}
              isLoading={renameDialog.isRenaming}
            >
              {t('pages.gallery.renameItem.rename')}
            </ButtonWithLoading>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for traditional upload */}
      <input
        type='file'
        multiple
        accept='image/*,video/*'
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        tabIndex={-1}
      />

      {children}
    </>
  )
}

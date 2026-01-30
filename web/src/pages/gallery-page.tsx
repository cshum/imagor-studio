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
  FolderInput,
  FolderPlus,
  Search,
  SquarePen,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { generateImagorUrl } from '@/api/imagor-api'
import { setUserRegistryMultiple } from '@/api/registry-api.ts'
import { deleteFile, moveFile } from '@/api/storage-api.ts'
import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog.tsx'
import { HeaderBar } from '@/components/header-bar'
import { BulkDeleteDialog } from '@/components/image-gallery/bulk-delete-dialog'
import { CreateFolderDialog } from '@/components/image-gallery/create-folder-dialog'
import { DeleteItemDialog } from '@/components/image-gallery/delete-item-dialog'
import { EmptyGalleryState } from '@/components/image-gallery/empty-gallery-state'
import { FolderContextMenu } from '@/components/image-gallery/folder-context-menu'
import { FolderGrid, Gallery } from '@/components/image-gallery/folder-grid'
import { GalleryDropZone } from '@/components/image-gallery/gallery-drop-zone'
import { ImageContextData, ImageContextMenu } from '@/components/image-gallery/image-context-menu'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { MoveItem, MoveItemsDialog } from '@/components/image-gallery/move-items-dialog'
import { RenameItemDialog } from '@/components/image-gallery/rename-item-dialog'
import { SelectionMenu } from '@/components/image-gallery/selection-menu'
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { UploadProgress } from '@/components/upload/upload-progress.tsx'
import { ImagorParamsInput, SortOption, SortOrder } from '@/generated/graphql'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { DragDropFile } from '@/hooks/use-drag-drop'
import { useFolderContextMenu } from '@/hooks/use-folder-context-menu'
import { useGalleryKeyboardNavigation } from '@/hooks/use-gallery-keyboard-navigation'
import { DragItem, useItemDragDrop } from '@/hooks/use-item-drag-drop'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { restoreScrollPosition, useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { ContentLayout } from '@/layouts/content-layout'
import { getFullImageUrl } from '@/lib/api-utils'
import { GalleryLoaderData } from '@/loaders/gallery-loader.ts'
import { useAuth } from '@/stores/auth-store'
import { registerDropHandler } from '@/stores/drag-drop-store'
import { setCurrentPath } from '@/stores/folder-tree-store.ts'
import { ImagePosition, setPosition } from '@/stores/image-position-store.ts'
import {
  createFolderKey,
  createImageKey,
  setGalleryContext,
  useSelection,
} from '@/stores/selection-store'
import { useSidebar } from '@/stores/sidebar-store.ts'

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
  const [createFolderPath, setCreateFolderPath] = useState<string | null>(null)
  const [deleteItemDialog, setDeleteItemDialog] = useState<{
    open: boolean
    itemKey: string | null
    itemName: string | null
    itemType: 'file' | 'folder'
    isDeleting: boolean
  }>({
    open: false,
    itemKey: null,
    itemName: null,
    itemType: 'file',
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
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean
    isDeleting: boolean
  }>({
    open: false,
    isDeleting: false,
  })
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean
    items: MoveItem[]
  }>({
    open: false,
    items: [],
  })
  const [filePickerOpen, setFilePickerOpen] = useState(false)

  // Selection store
  const selection = useSelection()

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

  // Drag and drop functionality
  const handleDropItems = async (items: DragItem[], targetFolderKey: string) => {
    try {
      let successCount = 0
      let failCount = 0
      let hasFileExistsError = false

      // Move all items sequentially
      for (const item of items) {
        try {
          const itemName = item.key.split('/').filter(Boolean).pop() || ''
          const newPath = targetFolderKey ? `${targetFolderKey}/${itemName}` : itemName

          // Skip if source and destination are the same
          if (item.key === newPath) {
            continue
          }

          await moveFile(item.key, newPath)
          successCount++
        } catch (error: any) {
          const errorCode = error?.response?.errors?.[0]?.extensions?.code
          if (errorCode === 'FILE_ALREADY_EXISTS') {
            hasFileExistsError = true
          }
          failCount++
        }
      }

      // Clear selection after move
      selection.clearSelection()

      // Refresh gallery
      router.invalidate()

      // Show result toast
      if (failCount === 0 && successCount > 0) {
        toast.success(t('pages.gallery.dragDrop.moveSuccess', { count: successCount }))
      } else if (successCount > 0) {
        const message = hasFileExistsError
          ? t('pages.gallery.dragDrop.fileExists')
          : t('pages.gallery.dragDrop.partialSuccess', {
              success: successCount,
              failed: failCount,
            })
        toast.warning(message)
      } else if (failCount > 0) {
        const message = hasFileExistsError
          ? t('pages.gallery.dragDrop.fileExists')
          : t('pages.gallery.dragDrop.moveError')
        toast.error(message)
      }
    } catch {
      toast.error(t('pages.gallery.dragDrop.moveError'))
    }
  }

  const {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleContainerDragLeave,
    handleDrop,
  } = useItemDragDrop({
    onDrop: handleDropItems,
    isAuthenticated: authState.state === 'authenticated',
  })

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

  const handleFolderClick = (
    { galleryKey: folderGalleryKey }: Gallery,
    index: number,
    event?: React.MouseEvent,
  ) => {
    // Check for Cmd/Ctrl+Click for selection (only for authenticated users)
    if (event && (event.metaKey || event.ctrlKey) && authState.state === 'authenticated') {
      event.preventDefault()
      const fullFolderKey = createFolderKey(folderGalleryKey)
      selection.toggleItem(fullFolderKey, index, 'folder')
      return
    }

    // Normal navigation
    return navigate({
      to: '/gallery/$galleryKey',
      params: { galleryKey: folderGalleryKey },
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
    // Initialize selection context for this gallery (clears selection)
    setGalleryContext(galleryKey)

    // Register drop handler for drag and drop
    registerDropHandler(handleDropItems)

    // Cleanup: unregister handler when component unmounts
    return () => {
      registerDropHandler(null)
    }
  }, [galleryKey])

  // Selection handlers
  const handleImageSelectionToggle = (imageKey: string, index: number) => {
    const fullImageKey = createImageKey(galleryKey, imageKey)
    selection.toggleItem(fullImageKey, index, 'image')
  }

  const handleFolderSelectionToggle = (folderKey: string, index: number) => {
    const fullFolderKey = createFolderKey(folderKey)
    selection.toggleItem(fullFolderKey, index, 'folder')
  }

  // Prepare selection keys for grids
  const selectedImageKeys = new Set<string>()
  const selectedFolderKeys = new Set<string>()

  selection.selectedItems.forEach((key) => {
    if (key.endsWith('/')) {
      selectedFolderKeys.add(key)
    } else {
      // Extract just the image key (without gallery path) for comparison
      const imageKey = galleryKey ? key.replace(`${galleryKey}/`, '') : key
      selectedImageKeys.add(imageKey)
    }
  })

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

  const handleDeleteItemFromMenu = (
    itemKey: string,
    itemName: string,
    itemType: 'file' | 'folder',
  ) => {
    setDeleteItemDialog({
      open: true,
      itemKey,
      itemName,
      itemType,
      isDeleting: false,
    })
  }

  const handleDeleteItem = async () => {
    if (!deleteItemDialog.itemKey || !deleteItemDialog.itemName) return

    setDeleteItemDialog((prev) => ({ ...prev, isDeleting: true }))

    try {
      if (deleteItemDialog.itemType === 'folder') {
        // folderKey is already the full path from the context menu
        await handleDeleteFolderOperation(deleteItemDialog.itemKey, deleteItemDialog.itemName)
      } else {
        // For files, construct the full path
        const itemPath = galleryKey
          ? `${galleryKey}/${deleteItemDialog.itemKey}`
          : deleteItemDialog.itemKey

        await deleteFile(itemPath)
        router.invalidate()
        toast.success(
          t('pages.gallery.deleteImage.success', { fileName: deleteItemDialog.itemName }),
        )
      }

      setDeleteItemDialog({
        open: false,
        itemKey: null,
        itemName: null,
        itemType: 'file',
        isDeleting: false,
      })
    } catch {
      const errorKey = deleteItemDialog.itemType === 'file' ? 'deleteImage' : 'deleteFolder'
      toast.error(t(`pages.gallery.${errorKey}.error`))
      setDeleteItemDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteItemDialogClose = (open: boolean) => {
    if (!deleteItemDialog.isDeleting) {
      setDeleteItemDialog({
        open,
        itemKey: null,
        itemName: null,
        itemType: 'file',
        isDeleting: false,
      })
    }
  }

  const handleRenameFromMenu = (itemKey: string, itemName: string, itemType: 'file' | 'folder') => {
    // itemKey is already the full path for folders from context menu
    // For files, we need to construct the full path
    const itemPath =
      itemType === 'file' ? (galleryKey ? `${galleryKey}/${itemKey}` : itemKey) : itemKey // folderKey is already full path

    setRenameDialog({
      open: true,
      itemPath,
      itemName,
      itemType,
      isRenaming: false,
    })
  }

  const handleRename = async (newName: string) => {
    if (!renameDialog.itemPath) return

    setRenameDialog((prev) => ({ ...prev, isRenaming: true }))

    try {
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
    } catch (error: any) {
      const errorCode = error?.response?.errors?.[0]?.extensions?.code
      if (errorCode === 'FILE_ALREADY_EXISTS') {
        toast.error(t('pages.gallery.renameItem.fileExists'))
      } else {
        toast.error(t('pages.gallery.renameItem.error', { type: renameDialog.itemType }))
      }
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
            <SquarePen className='mr-2 h-4 w-4' />
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
            <ContextMenuItem
              onClick={() => {
                // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
                setTimeout(() => handleMoveFromMenu(imageKey, imageName, 'file'), 0)
              }}
            >
              <FolderInput className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.move')}
            </ContextMenuItem>
            <ContextMenuSeparatorComponent />
            <ContextMenuItem
              onClick={() => {
                // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
                setTimeout(() => handleDeleteItemFromMenu(imageKey, imageName, 'file'), 0)
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
            <SquarePen className='mr-2 h-4 w-4' />
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
            <DropdownMenuItem onClick={() => handleMoveFromMenu(imageKey, imageName, 'file')}>
              <FolderInput className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.move')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteItemFromMenu(imageKey, imageName, 'file')}
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
      handleDeleteItemFromMenu(folderKey, folderName, 'folder')
    },
    onMove: (folderKey, folderName) => {
      // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
      setTimeout(() => handleMoveFromMenu(folderKey, folderName, 'folder'), 0)
    },
  })

  // Use the shared folder context menu hook for dropdown menus (three-dots)
  const { renderMenuItems: renderFolderDropdownMenuItems } = useFolderContextMenu({
    isAuthenticated: () => authState.state === 'authenticated',
    onRename: (folderKey, folderName) => handleRenameFromMenu(folderKey, folderName, 'folder'),
    onDelete: (folderKey, folderName) => {
      handleDeleteItemFromMenu(folderKey, folderName, 'folder')
    },
    onMove: (folderKey, folderName) => handleMoveFromMenu(folderKey, folderName, 'folder'),
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

  // Bulk selection handlers
  const handleBulkDelete = () => {
    // Use setTimeout to avoid Radix UI bug when opening dialog from dropdown menu
    setTimeout(() => {
      setBulkDeleteDialog({
        open: true,
        isDeleting: false,
      })
    }, 0)
  }

  const handleConfirmBulkDelete = async () => {
    setBulkDeleteDialog((prev) => ({ ...prev, isDeleting: true }))

    try {
      const { folders, images } = selection.splitSelections()
      let successCount = 0
      let failCount = 0

      // Delete all items sequentially
      for (const folderKey of folders) {
        try {
          await deleteFile(folderKey)
          successCount++
        } catch {
          failCount++
        }
      }

      for (const imageKey of images) {
        try {
          await deleteFile(imageKey)
          successCount++
        } catch {
          failCount++
        }
      }

      // Close dialog and clear selection
      setBulkDeleteDialog({
        open: false,
        isDeleting: false,
      })
      selection.clearSelection()

      // Refresh gallery
      router.invalidate()

      // Show result toast
      if (failCount === 0) {
        toast.success(t('pages.gallery.bulkDelete.success', { count: successCount }))
      } else if (successCount > 0) {
        toast.warning(
          t('pages.gallery.bulkDelete.partialSuccess', {
            success: successCount,
            failed: failCount,
          }),
        )
      } else {
        toast.error(t('pages.gallery.bulkDelete.error'))
      }
    } catch {
      toast.error(t('pages.gallery.bulkDelete.error'))
      setBulkDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const handleBulkDeleteDialogClose = (open: boolean) => {
    if (!bulkDeleteDialog.isDeleting) {
      setBulkDeleteDialog({
        open,
        isDeleting: false,
      })
    }
  }

  const handleClearSelection = () => {
    selection.clearSelection()
  }

  // Move handlers (single and bulk)
  const handleMoveFromMenu = (itemKey: string, itemName: string, itemType: 'file' | 'folder') => {
    // For files, construct the full path
    const fullItemKey =
      itemType === 'file' ? (galleryKey ? `${galleryKey}/${itemKey}` : itemKey) : itemKey

    setMoveDialog({
      open: true,
      items: [{ key: fullItemKey, name: itemName, type: itemType }],
    })
  }

  const handleBulkMove = () => {
    // Use setTimeout to avoid Radix UI bug when opening dialog from dropdown menu
    setTimeout(() => {
      const { folders, images } = selection.splitSelections()
      const items: MoveItem[] = [
        ...folders.map((key) => ({
          key,
          name: key.split('/').filter(Boolean).pop() || '',
          type: 'folder' as const,
        })),
        ...images.map((key) => ({
          key,
          name: key.split('/').pop() || '',
          type: 'file' as const,
        })),
      ]

      setMoveDialog({
        open: true,
        items,
      })
    }, 0)
  }

  const handleMoveDialogClose = (open: boolean) => {
    setMoveDialog({
      open,
      items: [],
    })
  }

  const handleMoveComplete = () => {
    // Clear selection after bulk move
    selection.clearSelection()
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
            // If already selected, toggle sort order; otherwise switch to this sort option with ASC default
            if (currentSortBy === 'NAME') {
              handleSortChange('NAME', currentSortOrder === 'ASC' ? 'DESC' : 'ASC')
            } else {
              handleSortChange('NAME', 'ASC')
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
            // If already selected, toggle sort order; otherwise switch to this sort option with DESC default
            if (currentSortBy === 'MODIFIED_TIME') {
              handleSortChange('MODIFIED_TIME', currentSortOrder === 'ASC' ? 'DESC' : 'ASC')
            } else {
              handleSortChange('MODIFIED_TIME', 'DESC')
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
          <div className='mx-4 my-2 flex items-center justify-between gap-4'>
            <h1 className='text-3xl md:text-4xl'>{galleryName}</h1>
            {/* Test button for file picker */}
            <Button onClick={() => setFilePickerOpen(true)} variant='outline' size='sm'>
              📁 Test File Picker
            </Button>
          </div>
          <HeaderBar
            isScrolled={isScrolledDown}
            customMenuItems={customMenuItems}
            selectionMenu={
              authState.state === 'authenticated' ? (
                <SelectionMenu
                  selectedCount={selection.selectedItems.size}
                  onMove={handleBulkMove}
                  onDelete={handleBulkDelete}
                  onClear={handleClearSelection}
                />
              ) : null
            }
            dragDropHandlers={
              authState.state === 'authenticated'
                ? {
                    handleDragOver,
                    handleDragEnter,
                    handleDragLeave,
                    handleDrop,
                  }
                : undefined
            }
          />

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
                            selectedFolderKeys={selectedFolderKeys}
                            selectedImageKeys={selectedImageKeys}
                            onFolderSelectionToggle={
                              authState.state === 'authenticated'
                                ? handleFolderSelectionToggle
                                : undefined
                            }
                            renderMenuItems={(folder) =>
                              renderFolderDropdownMenuItems({
                                folderKey: folder.galleryKey,
                                folderName: folder.galleryName,
                              })
                            }
                            onDragStart={
                              authState.state === 'authenticated' ? handleDragStart : undefined
                            }
                            onDragEnd={
                              authState.state === 'authenticated' ? handleDragEnd : undefined
                            }
                            onDragOver={
                              authState.state === 'authenticated' ? handleDragOver : undefined
                            }
                            onDragEnter={
                              authState.state === 'authenticated' ? handleDragEnter : undefined
                            }
                            onDragLeave={
                              authState.state === 'authenticated' ? handleDragLeave : undefined
                            }
                            onContainerDragLeave={
                              authState.state === 'authenticated'
                                ? handleContainerDragLeave
                                : undefined
                            }
                            onDrop={authState.state === 'authenticated' ? handleDrop : undefined}
                            dragOverTarget={dragState.dragOverTarget}
                            draggedItems={dragState.draggedItems}
                            galleryKey={galleryKey}
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
                          selectedImageKeys={selectedImageKeys}
                          selectedFolderKeys={selectedFolderKeys}
                          onImageSelectionToggle={
                            authState.state === 'authenticated'
                              ? handleImageSelectionToggle
                              : undefined
                          }
                          renderMenuItems={(image) =>
                            renderDropdownMenuItems(
                              image.imageName,
                              image.imageKey,
                              image.isVideo || false,
                            )
                          }
                          onDragStart={
                            authState.state === 'authenticated' ? handleDragStart : undefined
                          }
                          onDragEnd={
                            authState.state === 'authenticated' ? handleDragEnd : undefined
                          }
                          draggedItems={dragState.draggedItems}
                          galleryKey={galleryKey}
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
        currentPath={createFolderPath !== null ? createFolderPath : galleryKey}
      />

      <DeleteItemDialog
        open={deleteItemDialog.open}
        onOpenChange={handleDeleteItemDialogClose}
        itemName={deleteItemDialog.itemName || ''}
        itemType={deleteItemDialog.itemType}
        isDeleting={deleteItemDialog.isDeleting}
        onConfirm={handleDeleteItem}
      />

      <BulkDeleteDialog
        open={bulkDeleteDialog.open}
        onOpenChange={handleBulkDeleteDialogClose}
        itemCount={selection.selectedItems.size}
        isDeleting={bulkDeleteDialog.isDeleting}
        onConfirm={handleConfirmBulkDelete}
      />

      <MoveItemsDialog
        open={moveDialog.open}
        onOpenChange={handleMoveDialogClose}
        items={moveDialog.items}
        currentPath={galleryKey}
        onMoveComplete={handleMoveComplete}
        onCreateFolder={(selectedPath) => {
          setCreateFolderPath(selectedPath !== null ? selectedPath : galleryKey)
          setIsCreateFolderDialogOpen(true)
        }}
      />

      <CopyUrlDialog
        open={copyUrlDialog.open}
        onOpenChange={(open) => setCopyUrlDialog({ open, url: copyUrlDialog.url })}
        url={copyUrlDialog.url}
      />

      <RenameItemDialog
        open={renameDialog.open}
        onOpenChange={handleRenameDialogClose}
        itemName={renameDialog.itemName || ''}
        itemType={renameDialog.itemType}
        isRenaming={renameDialog.isRenaming}
        onConfirm={handleRename}
      />

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

      {/* File Picker Dialog for Testing */}
      <FilePickerDialog
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        onSelect={(paths) => {
          console.log('Selected files:', paths)
          toast.success(`Selected ${paths.length} file(s): ${paths.join(', ')}`)
        }}
        selectionMode='multiple'
        fileExtensions={['.jpg']}
        currentPath={galleryKey}
        title='Test File Picker'
        description='Select one or more files from your gallery'
      />
    </>
  )
}

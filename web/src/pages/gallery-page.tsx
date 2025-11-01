import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import {
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  FolderPlus,
  Pencil,
  SortAsc,
  SortDesc,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { generateImagorUrl } from '@/api/imagor-api'
import { setUserRegistryMultiple } from '@/api/registry-api.ts'
import { deleteFile } from '@/api/storage-api.ts'
import { HeaderBar } from '@/components/header-bar'
import { CreateFolderDialog } from '@/components/image-gallery/create-folder-dialog'
import { DeleteImageDialog } from '@/components/image-gallery/delete-image-dialog'
import { EmptyGalleryState } from '@/components/image-gallery/empty-gallery-state'
import { FolderGrid, Gallery } from '@/components/image-gallery/folder-grid'
import { GalleryDropZone } from '@/components/image-gallery/gallery-drop-zone'
import { ImageContextData, ImageContextMenu } from '@/components/image-gallery/image-context-menu'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { LoadingBar } from '@/components/loading-bar.tsx'
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
import { UploadProgress } from '@/components/upload/upload-progress.tsx'
import { ImagorParamsInput, SortOption, SortOrder } from '@/generated/graphql'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { DragDropFile } from '@/hooks/use-drag-drop.ts'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { restoreScrollPosition, useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { getFullImageUrl } from '@/lib/api-utils'
import { ContentLayout } from '@/layouts/content-layout'
import { GalleryLoaderData } from '@/loaders/gallery-loader.ts'
import { useAuth } from '@/stores/auth-store'
import { setCurrentPath } from '@/stores/folder-tree-store.ts'
import { ImagePosition, setPosition } from '@/stores/image-position-store.ts'
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
  const [deleteImageDialog, setDeleteImageDialog] = useState<{
    open: boolean
    imageKey: string | null
    isDeleting: boolean
  }>({
    open: false,
    imageKey: null,
    isDeleting: false,
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

  const {
    galleryName,
    images,
    folders,
    currentSortBy,
    currentSortOrder,
    imageExtensions,
    videoExtensions,
  } = galleryLoaderData
  const sidebar = useSidebar()

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

  useEffect(() => {
    setCurrentPath(galleryKey)
    requestAnimationFrame(() => restoreScrollPosition(galleryKey))
  }, [galleryKey])

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

      toast.success(t('pages.gallery.deleteImage.success'))

      setDeleteImageDialog({
        open: false,
        imageKey: null,
        isDeleting: false,
      })

      router.invalidate()
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

  const handleCopyUrl = async (imageKey: string) => {
    try {
      // Generate original image URL (no transformations)
      const url = await generateImagorUrl({
        galleryKey,
        imageKey,
        params: {} as ImagorParamsInput, // Empty params for original image
      })
      
      const fullUrl = getFullImageUrl(url)
      setCopyUrlDialog({
        open: true,
        url: fullUrl,
      })
    } catch (error) {
      toast.error(t('pages.gallery.contextMenu.copyUrlError'))
    }
  }

  const handleDownload = async (imageKey: string) => {
    try {
      // Generate download URL with attachment filter
      const url = await generateImagorUrl({
        galleryKey,
        imageKey,
        params: {
          filters: [{ name: 'attachment', args: '' }], // Empty args for default filename
        } as ImagorParamsInput,
      })
      
      const fullUrl = getFullImageUrl(url)
      // Use location.href for reliable downloads across all browsers
      window.location.href = fullUrl
    } catch (error) {
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
        <ContextMenuItem onClick={() => handleCopyUrl(imageKey)}>
          <Copy className='mr-2 h-4 w-4' />
          Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleDownload(imageKey)}>
          <Download className='mr-2 h-4 w-4' />
          Download
        </ContextMenuItem>
        {isAuthenticated && (
          <>
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

  const isScrolledDown = scrollPosition > 22 + 8 + (isDesktop ? 48 : 38)
  const isEmpty = images.length === 0 && folders.length === 0
  const isRootGallery = galleryKey === ''
  const isNavigateToImage = !!(
    pendingMatches?.length &&
    pendingMatches[pendingMatches.length - 1].routeId?.toString()?.includes('$imageKey')
  )

  // Create menu items for authenticated users
  const customMenuItems =
    authState.state === 'authenticated' ? (
      <>
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
        <DropdownMenuLabel>{t('pages.gallery.sorting.sortBy')}</DropdownMenuLabel>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            handleSortChange('NAME', currentSortOrder)
          }}
        >
          <FileText className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.sorting.name')}
          {currentSortBy === 'NAME' && <Check className='ml-auto h-4 w-4' />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            handleSortChange('MODIFIED_TIME', currentSortOrder)
          }}
        >
          <Clock className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.sorting.modifiedTime')}
          {currentSortBy === 'MODIFIED_TIME' && <Check className='ml-auto h-4 w-4' />}
        </DropdownMenuItem>

        <DropdownMenuLabel>{t('pages.gallery.sorting.sortOrder')}</DropdownMenuLabel>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            handleSortChange(currentSortBy, 'ASC')
          }}
        >
          <SortAsc className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.sorting.ascending')}
          {currentSortOrder === 'ASC' && <Check className='ml-auto h-4 w-4' />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            handleSortChange(currentSortBy, 'DESC')
          }}
        >
          <SortDesc className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.sorting.descending')}
          {currentSortOrder === 'DESC' && <Check className='ml-auto h-4 w-4' />}
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
                    <>
                      <FolderGrid
                        folders={folders}
                        onFolderClick={handleFolderClick}
                        width={contentWidth}
                        maxFolderWidth={maxItemWidth}
                      />
                      <ImageContextMenu renderMenuItems={renderContextMenuItems}>
                        <ImageGrid
                          images={images}
                          aspectRatio={4 / 3}
                          width={contentWidth}
                          scrollTop={scrollPosition}
                          maxImageWidth={maxItemWidth}
                          onImageClick={handleImageClick}
                        />
                      </ImageContextMenu>
                    </>
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

      <CopyUrlDialog
        open={copyUrlDialog.open}
        onOpenChange={(open) => setCopyUrlDialog({ open, url: copyUrlDialog.url })}
        url={copyUrlDialog.url}
        title='Copy Image URL'
      />

      {/* Hidden file input for traditional upload */}
      <input
        type='file'
        multiple
        accept='image/*,video/*'
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {children}
    </>
  )
}

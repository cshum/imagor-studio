import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { Check, Clock, FileText, FolderPlus, SortAsc, SortDesc } from 'lucide-react'

import { setUserRegistryMultiple } from '@/api/registry-api.ts'
import { HeaderBar } from '@/components/header-bar'
import { CreateFolderDialog } from '@/components/image-gallery/create-folder-dialog'
import { EmptyGalleryState } from '@/components/image-gallery/empty-gallery-state'
import { FolderGrid, Gallery } from '@/components/image-gallery/folder-grid'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { GalleryImage } from '@/components/image-gallery/image-view.tsx'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { SortOption, SortOrder } from '@/generated/graphql'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { restoreScrollPosition, useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
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
  const { isLoading, pendingMatches } = useRouterState()
  const { authState } = useAuth()
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)

  const { galleryName, images, folders, currentSortBy, currentSortOrder } = galleryLoaderData
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

  const handleImageClick = ({ imageKey }: GalleryImage, position: ImagePosition | null) => {
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
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onSelect={(event) => {
            event.preventDefault()
            setIsCreateFolderDialogOpen(true)
          }}
        >
          <FolderPlus className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.createFolder.newFolder')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
      </>
    ) : null

  return (
    <>
      {isNavigateToImage && <LoadingBar isLoading={isLoading} />}
      <ContentLayout title={galleryName}>
        <div className='mx-4 my-2 grid'>
          <h1 className='text-3xl md:text-4xl'>{galleryName}</h1>
        </div>
        <HeaderBar isScrolled={isScrolledDown} customMenuItems={customMenuItems} />
        <Card className='rounded-lg border-none'>
          <CardContent className='p-2 md:p-4' ref={contentRef}>
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
                    <ImageGrid
                      images={images}
                      aspectRatio={4 / 3}
                      width={contentWidth}
                      scrollTop={scrollPosition}
                      maxImageWidth={maxItemWidth}
                      onImageClick={handleImageClick}
                    />
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </ContentLayout>

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        currentPath={galleryKey}
      />

      {children}
    </>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { HeaderBar } from '@/components/header-bar'
import { FolderGrid, Gallery } from '@/components/image-gallery/folder-grid'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { GalleryImage } from '@/components/image-gallery/image-view.tsx'
import { Card, CardContent } from '@/components/ui/card'
import { useSidebar } from '@/components/ui/sidebar'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { ContentLayout } from '@/layouts/content-layout'
import { GalleryLoaderData } from '@/loaders/gallery-loader.ts'
import { useFolderTree } from '@/stores/folder-tree-store'
import { ImagePosition, setPosition } from '@/stores/image-position-store.ts'

export interface GalleryPageProps extends React.PropsWithChildren {
  galleryLoaderData: GalleryLoaderData
  galleryKey: string
}

export function GalleryPage({ galleryLoaderData, galleryKey, children }: GalleryPageProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const { galleryName, images, folders } = galleryLoaderData
  const { dispatch } = useFolderTree()
  const sidebar = useSidebar()

  const isDesktop = useBreakpoint('md')

  // Sync current path with folder tree store
  useEffect(() => {
    dispatch({ type: 'SET_CURRENT_PATH', path: galleryKey })
  }, [galleryKey, dispatch])

  const maxItemWidth = 280

  const { restoreScrollPosition, scrollPosition, isScrolling } = useScrollHandler(
    containerRef,
    galleryKey,
  )
  const { contentWidth, updateWidth } = useWidthHandler(
    contentRef,
    true,
    sidebar.open,
    isDesktop ? 32 : 16,
  )
  useResizeHandler(updateWidth)

  const [gridRendered, setGridRendered] = useState(false)

  useEffect(() => {
    if (containerRef.current && gridRendered) {
      restoreScrollPosition()
    }
  }, [gridRendered, restoreScrollPosition])

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

  const isScrolledDown = scrollPosition > 22 + 8 + (isDesktop ? 40 : 30)

  return (
    <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
      <ContentLayout title={galleryName}>
        <div className='mx-4 my-2 grid'>
          <h1 className='text-3xl md:text-4xl'>{galleryName}</h1>
        </div>
        <HeaderBar isScrolled={isScrolledDown} />
        <Card className='rounded-lg border-none'>
          <CardContent className='p-2 md:p-4' ref={contentRef}>
            {contentWidth > 0 && (
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
                  maxImageWidth={250}
                  isScrolling={isScrolling}
                  onRendered={() => setGridRendered(true)}
                  onImageClick={handleImageClick}
                />
              </>
            )}
          </CardContent>
        </Card>
      </ContentLayout>
      {children}
    </div>
  )
}

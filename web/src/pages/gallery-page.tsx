import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ContentLayout } from '@/layouts/content-layout'
import { Card, CardContent } from '@/components/ui/card'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { FixedHeaderBar } from '@/components/demo/fixed-header-bar'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { FolderGrid } from '@/components/image-gallery/folder-grid'
import { ImageProps, FolderProps, GalleryLoaderData } from '@/api/dummy'
import { ImagePosition, imagePositionActions } from '@/stores/image-position-store.ts'

const { setPosition } = imagePositionActions

export interface GalleryPageProps extends React.PropsWithChildren {
  galleryLoaderData: GalleryLoaderData
  galleryKey: string
}

export function GalleryPage({ galleryLoaderData, galleryKey, children }: GalleryPageProps) {
  const navigate = useNavigate()
  const { isLoading } = useRouterState()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const { images, folders } = galleryLoaderData

  const isOpen = false
  const isDesktop = useBreakpoint('md')

  const maxItemWidth = 280

  // Use galleryKey-specific storage key for scroll position
  const scrollStorageKey = `galleryPageScrollPosition_${galleryKey}`
  const { restoreScrollPosition, scrollPosition, isScrolling } = useScrollHandler(
    containerRef,
    useMemo(() => new SessionConfigStorage(scrollStorageKey), [scrollStorageKey]),
  )
  const { contentWidth, updateWidth } = useWidthHandler(contentRef, true, isOpen, isDesktop ? 32 : 16)
  useResizeHandler(updateWidth)

  const [gridRendered, setGridRendered] = useState(false)

  useEffect(() => {
    if (containerRef.current && gridRendered) {
      restoreScrollPosition()
    }
  }, [gridRendered, restoreScrollPosition])

  const handleImageClick = (
    { imageKey }: ImageProps,
    position: ImagePosition | null,
  ) => {
    if (position) {
      setPosition(galleryKey, imageKey, position)
    }
    return navigate({
      to: '/gallery/$galleryKey/$imageKey',
      params: {
        galleryKey,
        imageKey: imageKey // Use imageKey instead of id
      },
    })
  }

  const handleFolderClick = (folder: FolderProps) => {
    // Navigate to the folder as a new gallery
    console.log(`Folder clicked: ${folder.name}`)
    // You could navigate to a new gallery based on the folder
    // navigate({ to: '/gallery/$galleryKey', params: { galleryKey: folder.id } })
  }

  const isScrolledDown = scrollPosition > 22 + 8 + (isDesktop ? 40 : 30)

  // Generate gallery title based on galleryKey
  const getGalleryTitle = (key: string) => {
    switch (key) {
      case 'favorites':
        return 'Favorite Images'
      case 'recent':
        return 'Recent Images'
      case 'default':
        return 'Gallery'
      default:
        return `Gallery: ${key}`
    }
  }

  const galleryTitle = getGalleryTitle(galleryKey)

  return (
    <>
      <LoadingBar isLoading={isLoading}/>
      <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <ContentLayout title={galleryTitle} isBounded={false}>
          <div className="grid mx-4 my-2">
            <h1 className="text-3xl md:text-4xl">{galleryTitle}</h1>
          </div>
          <FixedHeaderBar isScrolled={isScrolledDown}/>
          <Card className="rounded-lg border-none">
            <CardContent className="p-2 md:p-4" ref={contentRef}>
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
                    maxImageWidth={280}
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
    </>
  )
}

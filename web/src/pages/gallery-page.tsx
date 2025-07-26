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

export interface GalleryPageProps extends React.PropsWithChildren{
  galleryLoaderData: GalleryLoaderData
}

export function GalleryPage({galleryLoaderData, children} : GalleryPageProps) {
  const navigate = useNavigate()
  const { isLoading } = useRouterState()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const initialPositionRef = useRef<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  const { images, folders } = galleryLoaderData

  const isOpen = false
  const isDesktop = useBreakpoint('md')

  const maxItemWidth = 280

  // Custom hooks
  const { restoreScrollPosition, scrollPosition, isScrolling } = useScrollHandler(
    containerRef, useMemo(() => new SessionConfigStorage('homePageScrollPosition'), []),
  )
  const { contentWidth, updateWidth } = useWidthHandler(contentRef, true, isOpen, isDesktop ? 32 : 16)
  useResizeHandler(updateWidth)

  // Grid rendered state
  const [gridRendered, setGridRendered] = useState(false)

  // Scroll restoration
  useEffect(() => {
    if (containerRef.current && gridRendered) {
      restoreScrollPosition()
    }
  }, [gridRendered, restoreScrollPosition])

  const handleImageClick = (
    { id }: ImageProps,
    position: { top: number; left: number; width: number; height: number } | null,
  ) => {
    initialPositionRef.current = position
    return navigate({
      to: '/gallery/$id',
      params: { id },
    })
  }

  const handleFolderClick = (folder: FolderProps) => {
    // Here you would typically navigate to a new route or update the state to show the folder's contents
    console.log(`Folder clicked: ${folder.name}`)
    // For example:
    // navigate({ to: '/folder/$id', params: { id: folder.id } })
  }

  const isScrolledDown = scrollPosition > 22 + 8 + (isDesktop ? 40 : 30)

  return (
    <>
      <LoadingBar isLoading={isLoading}/>
      <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <ContentLayout title="Title" isBounded={false}>
          <div className="grid mx-4 my-2">
            <h1 className="text-3xl md:text-4xl">Title</h1>
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

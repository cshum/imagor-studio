import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useLoaderData, useRouterState } from '@tanstack/react-router'
import { ContentLayout } from '@/layouts/content-layout'
import { Card, CardContent } from '@/components/ui/card'
import { ImageGrid } from '@/components/image-gallery/image-grid'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { FixedHeaderBar } from '@/components/demo/fixed-header-bar'
import { ImageFullScreen } from '@/components/image-gallery/image-full-screen.tsx'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { FolderGrid } from '@/components/image-gallery/folder-grid'
import { HomeLoaderData, ImageLoaderData, ImageProps, FolderProps } from '@/api/dummy'
import { ImageInfo } from '@/components/image-gallery/image-info-view'

export function HomePage() {
  // Get loader data from router
  const loaderData = useLoaderData({ strict: false }) as HomeLoaderData | ImageLoaderData

  // Fix: Use useParams without generic typing and handle undefined params
  const params = useParams({ strict: false })
  const id = params?.id

  const navigate = useNavigate()
  const { isLoading } = useRouterState()
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Get data from loader instead of generating locally
  const [images] = useState<ImageProps[]>(loaderData?.images || [])
  const [folders] = useState<FolderProps[]>(loaderData?.folders || [])

  const isOpen = false
  const isDesktop = useBreakpoint('md')
  const [selectedImage, setSelectedImage] = useState<ImageProps & { info?: ImageInfo } | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)


  const maxItemWidth = 280

  // Custom hooks
  const { restoreScrollPosition, scrollPosition, isScrolling } = useScrollHandler(
    containerRef, useMemo(() => new SessionConfigStorage('homePageScrollPosition'), []),
  )
  const { contentWidth, updateWidth } = useWidthHandler(contentRef, true, isOpen, isDesktop ? 32 : 16)
  useResizeHandler(updateWidth)

  // Grid rendered state
  const [gridRendered, setGridRendered] = useState(false)

  // Initialize selected image from loader data
  useEffect(() => {
    // Check if this is image loader data (has selectedImage property)
    const imageLoaderData = loaderData as ImageLoaderData

    if (id && imageLoaderData?.selectedImage && imageLoaderData?.selectedImageIndex !== null) {
      // Use data from loader
      setSelectedImage(imageLoaderData.selectedImage)
      setSelectedImageIndex(imageLoaderData.selectedImageIndex)
    } else if (!id) {
      // Clear selection when no ID in URL
      setSelectedImage(null)
      setSelectedImageIndex(null)
    }
  }, [id, loaderData])

  // Scroll restoration
  useEffect(() => {
    if (containerRef.current && gridRendered && !selectedImage) {
      restoreScrollPosition()
    }
  }, [gridRendered, restoreScrollPosition, selectedImage])

  const onRendered = useCallback(() => {
    setGridRendered(true)
  }, [])

  const handleImageClick = useCallback((
    image: ImageProps,
    position: { top: number; left: number; width: number; height: number } | null,
    direction?: -1 | 1
  ) => navigate({
    to: '/image/$id',
    params: { id: image.id },
    state: {
      ...(position && {initialPosition: position}),
      direction
    }
  }), [navigate])

  const handleFolderClick = useCallback((folder: FolderProps) => {
    // Here you would typically navigate to a new route or update the state to show the folder's contents
    console.log(`Folder clicked: ${folder.name}`)
    // For example:
    // navigate({ to: '/folder/$id', params: { id: folder.id } })
  }, [])

  const handleCloseFullView = useCallback(() => {
    setSelectedImage(null)
    setSelectedImageIndex(null)
    // Fix: Use TanStack Router navigation syntax
    navigate({
      to: '/home',
      state: {
        isClosingImage: true,
        initialPosition: location.state?.initialPosition
      }
    })
  }, [navigate, location.state?.initialPosition])

  const { handlePrevImage, handleNextImage } = useMemo(() => ({
    handlePrevImage: selectedImageIndex !== null && selectedImageIndex > 0
      ? () => handleImageClick(images[selectedImageIndex - 1], null, -1)
      : undefined,
    handleNextImage: selectedImageIndex !== null && selectedImageIndex < images.length - 1
      ? () => handleImageClick(images[selectedImageIndex + 1], null, 1)
      : undefined
  }), [selectedImageIndex, images, handleImageClick])

  useEffect(() => {
    if (location.state?.isClosingImage) {
      setSelectedImage(null)
      setSelectedImageIndex(null)
    }
  }, [location.state?.isClosingImage])

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
                    onRendered={onRendered}
                    onImageClick={handleImageClick}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </ContentLayout>
        <ImageFullScreen
          selectedImage={selectedImage}
          onClose={handleCloseFullView}
          onPrevImage={handlePrevImage}
          onNextImage={handleNextImage}
        />
      </div>
    </>
  )
}

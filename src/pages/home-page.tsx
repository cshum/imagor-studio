import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ContentLayout } from '@/layouts/content-layout'
import { Card, CardContent } from '@/components/ui/card'
import { ImageProps, ImageGrid } from '@/components/image-gallery/image-grid'
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { generateDummyImages } from '@/lib/generate-dummy-images.ts'
import { FixedHeaderBar } from '@/components/demo/fixed-header-bar'
import { FullScreenImage } from '@/components/image-gallery/full-screen-image'
import { LoadingBar } from '@/components/loading-bar.tsx';

export default function HomePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<ImageProps[]>([])
  const { isOpen } = useSidebarToggle()
  const isDesktop = useBreakpoint('md')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageProps | null>(null)

  // Custom hooks
  const { restoreScrollPosition, scrollPosition, isScrolling } = useScrollHandler(
    containerRef, useMemo(() => new SessionConfigStorage('homePageScrollPosition'), []),
  )
  const { contentWidth, updateWidth } = useWidthHandler(contentRef, true, isOpen, isDesktop ? 30 : 16)
  useResizeHandler(updateWidth)

  // Grid rendered state
  const [gridRendered, setGridRendered] = useState(false)

  useEffect(() => {
    const generatedImages = generateDummyImages(10000)
    setImages(generatedImages)

    // If there's an ID in the URL, find and select that image
    if (id) {
      const imageFromUrl = generatedImages.find(img => img.id === id)
      if (imageFromUrl) {
        setSelectedImage({
          ...imageFromUrl,
          src: imageFromUrl.src.replace('/300/225', '/1200/900'),
        })
      }
    } else {
      setSelectedImage(null)
    }
  }, [id])

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
    position: { top: number; left: number; width: number; height: number }
  ) => {
    const fullSizeSrc = image.src.replace('/300/225', '/1200/900');
    setIsLoading(true)

    // Preload the full-size image
    const preloadImage = new globalThis.Image();
    preloadImage.src = fullSizeSrc;
    preloadImage.onload = () => {
      setIsLoading(false)
      setSelectedImage({ ...image, src: fullSizeSrc })
      navigate(`/image/${image.id}`, {
        state: { isClickNavigation: true, initialPosition: position }
      })
    };
  }, [navigate])

  useEffect(() => {
    if (location.state?.isClosingImage) {
      setSelectedImage(null)
    }
  }, [location])

  const isScrolledDown = scrollPosition > 22 + (isDesktop ? 40 : 30)

  const handleCloseFullView = useCallback(() => {
    setSelectedImage(null)
  }, [])

  return (
    <>
      <LoadingBar isLoading={isLoading} />
      <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <ContentLayout title="Title" isBounded={false}>
          <div className="grid mx-4 mt-0">
            <h1 className="text-3xl md:text-4xl">Title</h1>
          </div>
          <FixedHeaderBar isScrolled={isScrolledDown}/>
          <Card className={`rounded-lg border-none`}>
            <CardContent className="p-2 md:p-4" ref={contentRef}>
              {contentWidth > 0 && (
                <ImageGrid
                  images={images}
                  aspectRatio={4 / 3}
                  width={contentWidth}
                  scrollTop={scrollPosition}
                  maxImageWidth={300}
                  isScrolling={isScrolling}
                  onRendered={onRendered}
                  onImageClick={handleImageClick}
                />
              )}
            </CardContent>
          </Card>
        </ContentLayout>
        <FullScreenImage
          selectedImage={selectedImage}
          onClose={handleCloseFullView}
        />
      </div>
    </>


  )
}

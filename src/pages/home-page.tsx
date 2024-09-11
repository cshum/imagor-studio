import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ContentLayout } from '@/layouts/content-layout'
import { Card, CardContent } from '@/components/ui/card'
import { ImageGrid, ImageProps } from '@/components/image-gallery/image-grid'
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { generateDummyImages } from '@/lib/generate-dummy-images.ts'
import { FixedHeaderBar } from '@/components/demo/fixed-header-bar'
import { ImageFullScreen } from '@/components/image-gallery/image-full-screen.tsx'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { ImageInfo } from '@/components/image-gallery/image-info-view'
import { FolderGrid, FolderProps } from '@/components/image-gallery/folder-grid'

export function HomePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<ImageProps[]>([])
  const [folders, setFolders] = useState<FolderProps[]>([])
  const { isOpen } = useSidebarToggle()
  const isDesktop = useBreakpoint('md')
  const [isLoading, setIsLoading] = useState(false)
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

  useEffect(() => {
    const generatedImages = generateDummyImages(10000)
    setImages(generatedImages)

    // Generate more dummy folders
    const dummyFolders: FolderProps[] = [
      { id: '1', name: 'Vacation Photos' },
      { id: '2', name: 'Work Projects' },
      { id: '3', name: 'Family Events' },
      { id: '4', name: 'Hobbies' },
      { id: '5', name: 'Miscellaneous' },
      { id: '6', name: 'Documents' },
      { id: '7', name: 'Music' },
      { id: '8', name: 'Videos' },
    ]
    setFolders(dummyFolders)

    // If there's an ID in the URL, find and select that image
    if (id) {
      const imageFromUrl = generatedImages.find(img => img.id === id)
      if (imageFromUrl) {
        setSelectedImage({
          ...imageFromUrl,
          src: imageFromUrl.src.replace('/300/225', '/1200/900'),
          info: {
            exif: {
              "Camera": "Canon EOS 5D Mark IV",
              "Lens": "EF 24-70mm f/2.8L II USM",
              "Focal Length": "50mm",
              "Aperture": "f/4.0",
              "Shutter Speed": "1/250s",
              "ISO": "100",
              "Date Taken": "2023-09-15 14:30:22",
              "GPS Coordinates": "40°42'46.0\"N 74°00'21.0\"W",
              "File Size": "24.5 MB",
              "Color Space": "sRGB",
              "Software": "Adobe Lightroom Classic 10.0"
            }
          }
        })
        setSelectedImageIndex(generatedImages.findIndex(img => img.id === id))
      }
    } else {
      setSelectedImage(null)
      setSelectedImageIndex(null)
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
    position?: { top: number; left: number; width: number; height: number }
  ) => {
    const fullSizeSrc = image.src.replace('/300/225', '/1200/900');
    setIsLoading(true)

    // Preload the full-size image
    const preloadImage = new Image();
    preloadImage.src = fullSizeSrc;
    preloadImage.onload = () => {
      setIsLoading(false)
      const index = images.findIndex(img => img.id === image.id)
      setSelectedImageIndex(index)
      setSelectedImage({
        ...image,
        src: fullSizeSrc,
        info: {
          exif: {
            "Camera": "Canon EOS 5D Mark IV",
            "Lens": "EF 24-70mm f/2.8L II USM",
            "Focal Length": "50mm",
            "Aperture": "f/4.0",
            "Shutter Speed": "1/250s",
            "ISO": "100",
            "Date Taken": "2023-09-15 14:30:22",
            "GPS Coordinates": "40°42'46.0\"N 74°00'21.0\"W",
            "File Size": "24.5 MB",
            "Color Space": "sRGB",
            "Software": "Adobe Lightroom Classic 10.0"
          }
        }
      })
      navigate(`/image/${image.id}`, {
        state: { isImageGrid: !!position, initialPosition: position }
      })
    };
  }, [navigate, images])

  const handleFolderClick = useCallback((folder: FolderProps) => {
    // Here you would typically navigate to a new route or update the state to show the folder's contents
    console.log(`Folder clicked: ${folder.name}`)
    // For example:
    // navigate(`/folder/${folder.id}`)
  }, [])

  const handleCloseFullView = useCallback(() => {
    setSelectedImage(null)
    setSelectedImageIndex(null)
    navigate('/', {
      state: {
        isClosingImage: true,
        initialPosition: location.state?.initialPosition
      }
    })
  }, [navigate, location.state?.initialPosition])

  const handlePrevImage = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      handleImageClick(images[selectedImageIndex - 1])
    }
  }, [selectedImageIndex, images, handleImageClick])

  const handleNextImage = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      handleImageClick(images[selectedImageIndex + 1])
    }
  }, [selectedImageIndex, images, handleImageClick])

  useEffect(() => {
    if (location.state?.isClosingImage) {
      setSelectedImage(null)
      setSelectedImageIndex(null)
    }
  }, [location])

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

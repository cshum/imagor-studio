import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentLayout } from '@/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb'
import { Card, CardContent } from '@/components/ui/card'
import { Image, ImageGrid } from '@/components/image-grid'
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage.ts'

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<Image[]>([])
  const { isOpen } = useSidebarToggle()
  const scrollStorage = useMemo(() => new LocalConfigStorage('homePageScrollPosition'), []) // Use LocalConfigStorage

  // Custom hooks
  const { restoreScrollPosition, scrollPosition } = useScrollHandler(containerRef, scrollStorage) // Using debounce with 100ms delay
  const { contentWidth, updateWidth } = useWidthHandler(contentRef, true, isOpen, 48)
  useResizeHandler(updateWidth)

  // Grid rendered state
  const [gridRendered, setGridRendered] = useState(false)

  // Generate image data for the grid
  const generateImages = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i + 1}`,
      src: `https://picsum.photos/id/${i + 1}/300/225`,
      alt: `Random image ${i + 1}`,
    }))
  }

  useEffect(() => {
    setImages(generateImages(1000))
  }, [])

  // Scroll restoration
  useEffect(() => {
    if (containerRef.current && gridRendered) {
      restoreScrollPosition()
    }
  }, [gridRendered, restoreScrollPosition])

  return (
    <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto' }}>
      <ContentLayout title="Home">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="rounded-lg border-none mt-6">
          <CardContent className="p-6" ref={contentRef}>
            {contentWidth > 0 && (
              <ImageGrid
                images={images}
                aspectRatio={4 / 3}
                width={contentWidth}
                scrollTop={scrollPosition} // Use the scroll position state
                isScrolling={false}
                maxImageWidth={300}
                onRendered={() => setGridRendered(true)} // Set grid rendered to true
              />
            )}
          </CardContent>
        </Card>
      </ContentLayout>
    </div>
  )
}

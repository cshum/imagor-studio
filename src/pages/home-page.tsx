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
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'

// Generate image data for the grid
const generateImages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    src: `https://picsum.photos/id/${i + 1}/300/225`,
    alt: `Random image ${i + 1}`,
  }))
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<Image[]>([])
  const { isOpen } = useSidebarToggle()
  const isDesktop = useBreakpoint("md")

  // Custom hooks
  const { restoreScrollPosition, scrollPosition } = useScrollHandler(
    containerRef, useMemo(() => new LocalConfigStorage('homePageScrollPosition'), [])
  )
  const { contentWidth, updateWidth } = useWidthHandler(contentRef, true, isOpen, isDesktop ? 30 : 8)
  useResizeHandler(updateWidth)

  // Grid rendered state
  const [gridRendered, setGridRendered] = useState(false)

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
          <CardContent className="p-1 md:p-4" ref={contentRef}>
            {contentWidth > 0 && (
              <ImageGrid
                images={images}
                aspectRatio={4 / 3}
                width={contentWidth}
                scrollTop={scrollPosition}
                maxImageWidth={300}
                onRendered={() => setGridRendered(true)}
              />
            )}
          </CardContent>
        </Card>
      </ContentLayout>
    </div>
  )
}

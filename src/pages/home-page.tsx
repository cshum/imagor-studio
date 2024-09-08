import { useEffect, useMemo, useRef, useState } from 'react'
import { ContentLayout } from '@/layouts/content-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Image, ImageGrid } from '@/components/image-grid'
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { useWidthHandler } from '@/hooks/use-width-handler'
import { useResizeHandler } from '@/hooks/use-resize-handler'
import { useBreakpoint } from '@/hooks/use-breakpoint.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { generateDummyImages } from '@/lib/generate-dummy-images.ts'
import { FixedHeaderBar } from '@/components/demo/fixed-header-bar'

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<Image[]>([])
  const { isOpen } = useSidebarToggle()
  const isDesktop = useBreakpoint('md')

  // Custom hooks
  const { restoreScrollPosition, scrollPosition } = useScrollHandler(
    containerRef, useMemo(() => new SessionConfigStorage('homePageScrollPosition'), []),
  )
  const { contentWidth, updateWidth } = useWidthHandler(contentRef, true, isOpen, isDesktop ? 30 : 16)
  useResizeHandler(updateWidth)

  // Grid rendered state
  const [gridRendered, setGridRendered] = useState(false)

  useEffect(() => {
    setImages(generateDummyImages(10000))
  }, [])

  // Scroll restoration
  useEffect(() => {
    if (containerRef.current && gridRendered) {
      restoreScrollPosition()
    }
  }, [gridRendered, restoreScrollPosition])

  const containerTop = containerRef.current ? containerRef.current.getBoundingClientRect().top : 0

  const isScrollDown = scrollPosition > containerTop

  return (
    <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto' }}>
      <ContentLayout title="Home" isBounded={false}>
          <FixedHeaderBar isScrolled={isScrollDown} />
          <Card className={`rounded-lg border-none rounded-t-none ${isScrollDown ? 'rounded-t-none':''}`}>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0" ref={contentRef}>
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

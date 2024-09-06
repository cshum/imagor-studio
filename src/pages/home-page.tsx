import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentLayout } from '@/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb'
import { Card, CardContent } from '@/components/ui/card'
import { ImageGallery } from '@/components/demo/image-gallery'

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)

    const currentContainer = containerRef.current
    if (currentContainer) {
      currentContainer.addEventListener('scroll', handleScroll)
    }

    return () => {
      window.removeEventListener('resize', updateWidth)
      if (currentContainer) {
        currentContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [handleScroll])

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
          <CardContent className="p-6">
            {containerWidth > 0 && (
              <ImageGallery
                imageCount={1000}
                columnCount={4}
                rowHeight={250}
                width={containerWidth}
                scrollTop={scrollTop}
              />
            )}
          </CardContent>
        </Card>
      </ContentLayout>
    </div>
  )
}

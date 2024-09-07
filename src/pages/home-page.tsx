import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentLayout } from '@/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb'
import { Card, CardContent } from '@/components/ui/card'
import { ImageGrid, Image } from '@/components/image-grid/image-grid' // Adjusted the import path
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx' // Import sidebar toggle hook

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null) // Add a ref for CardContent
  const [contentWidth, setContentWidth] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [images, setImages] = useState<Image[]>([])
  const scrollTimeoutRef = useRef<number | null>(null)
  const resizeTimeoutRef = useRef<number | null>(null) // Ref to track resize timeout
  const { isOpen } = useSidebarToggle() // Get the sidebar open state

  const generateImages = useCallback((count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i + 1}`,
      src: `https://picsum.photos/id/${i + 1}/300/225`,  // Image source passed through props
      alt: `Random image ${i + 1}`,  // Alt text passed through props
    }))
  }, [])

  useEffect(() => {
    setImages(generateImages(1000))
  }, [generateImages])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
      setIsScrolling(true)

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }
  }, [])

  const updateWidth = useCallback(() => {
    if (contentRef.current) {
      const padding = 48 // Set padding to 48px for appropriate positioning
      const calculatedWidth = contentRef.current.offsetWidth - padding
      setContentWidth(calculatedWidth) // Set the adjusted width
    }
  }, [])

  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current) // Clear any existing timeout to debounce
    }

    resizeTimeoutRef.current = window.setTimeout(() => {
      updateWidth() // Call the actual update function after the debounce timeout
    }, 100) // 100ms debounce delay for resizing
  }, [updateWidth])

  useEffect(() => {
    updateWidth() // Update width on mount

    window.addEventListener('resize', handleResize) // Attach resize handler

    const currentContainer = containerRef.current
    if (currentContainer) {
      currentContainer.addEventListener('scroll', handleScroll)
    }

    return () => {
      window.removeEventListener('resize', handleResize) // Clean up resize event listener
      if (currentContainer) {
        currentContainer.removeEventListener('scroll', handleScroll)
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [handleScroll, handleResize])

  // Trigger width update when the sidebar state (isOpen) changes
  useEffect(() => {
    const transitionDuration = 300 // Tailwind transition duration in milliseconds
    const timeoutId = setTimeout(() => {
      updateWidth() // Recalculate width after the sidebar finishes its transition
    }, transitionDuration)

    return () => {
      clearTimeout(timeoutId) // Clear the timeout on cleanup
    }
  }, [isOpen, updateWidth])

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
                width={contentWidth} // Use the adjusted width
                scrollTop={scrollTop}
                isScrolling={isScrolling}
                maxImageWidth={300} // Pass the maximum image width as a prop
              />
            )}
          </CardContent>
        </Card>
      </ContentLayout>
    </div>
  )
}

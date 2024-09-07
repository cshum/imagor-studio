import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentLayout } from '@/layouts/content-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb'
import { Card, CardContent } from '@/components/ui/card'
import { Image, ImageGrid } from '@/components/image-grid' // Adjusted import path
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx' // Import sidebar toggle hook

const SCROLL_POSITION_KEY = 'homePageScrollPosition' // Key for local storage

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null) // Add a ref for CardContent
  const scrollPositionRef = useRef<number | null>(null) // Use null initially to differentiate between 0 and no scroll
  const [contentWidth, setContentWidth] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [images, setImages] = useState<Image[]>([])
  const [gridRendered, setGridRendered] = useState(false) // New state to track if grid is rendered
  const scrollTimeoutRef = useRef<number | null>(null)
  const resizeTimeoutRef = useRef<number | null>(null) // Ref to track resize timeout
  const { isOpen } = useSidebarToggle() // Get the sidebar open state

  // Generate image data for the grid
  const generateImages = useCallback((count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i + 1}`,
      src: `https://picsum.photos/id/${i + 1}/300/225`, // Image source passed through props
      alt: `Random image ${i + 1}`, // Alt text passed through props
    }))
  }, [])

  useEffect(() => {
    setImages(generateImages(1000))
  }, [generateImages])

  // Handle scroll event and track the scroll position in a ref
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      scrollPositionRef.current = containerRef.current.scrollTop // Store scroll position in ref

      setIsScrolling(true)

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Wait 150ms before considering the scroll as finished
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false)
        scrollPositionRef.current = containerRef.current?.scrollTop || 0 // Capture the scrollTop when scrolling stops

        // Save the scroll position to localStorage
        if (scrollPositionRef.current !== null) {
          localStorage.setItem(SCROLL_POSITION_KEY, scrollPositionRef.current.toString())
        }
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

  // Restore scroll position from local storage after the grid is rendered
  useEffect(() => {
    if (gridRendered && containerRef.current) {
      const savedScrollPosition = localStorage.getItem(SCROLL_POSITION_KEY)
      if (savedScrollPosition !== null) {
        const scrollTop = parseInt(savedScrollPosition, 10)
        containerRef.current.scrollTop = scrollTop
        scrollPositionRef.current = scrollTop // Set scroll position to the restored value
      }
    }
  }, [gridRendered]) // Trigger when the grid is fully rendered

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
  }, [handleScroll, handleResize, updateWidth])

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
                scrollTop={scrollPositionRef.current ?? 0} // Use scroll position or default to 0 if null
                isScrolling={isScrolling}
                maxImageWidth={300} // Pass the maximum image width as a prop
                onRendered={() => setGridRendered(true)} // Callback to signal grid has rendered
              />
            )}
          </CardContent>
        </Card>
      </ContentLayout>
    </div>
  )
}

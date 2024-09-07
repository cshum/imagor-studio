import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentLayout } from '@/layouts/content-layout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { ImageGallery } from '@/components/demo/image-gallery';  // Adjust the import path based on your structure

interface Image {
  id: string;
  src: string;
  alt: string;
  isLoaded: boolean;
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const scrollTimeoutRef = useRef<number | null>(null);

  const generateImages = useCallback((count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i + 1}`,
      src: `https://picsum.photos/id/${i + 1}/300/225`,  // Image source passed through props
      alt: `Random image ${i + 1}`,  // Alt text passed through props
      isLoaded: false,
    }));
  }, []);

  useEffect(() => {
    setImages(generateImages(1000));
  }, [generateImages]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    }
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      if (currentContainer) {
        currentContainer.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

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
                images={images}
                aspectRatio={4 / 3}
                width={containerWidth}
                scrollTop={scrollTop}
                isScrolling={isScrolling}
              />
            )}
          </CardContent>
        </Card>
      </ContentLayout>
    </div>
  );
}

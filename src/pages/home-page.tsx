import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentLayout } from '@/layouts/content-layout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { ImageGallery } from '@/components/demo/image-gallery';

const SCROLL_POSITION_KEY = 'homePageScrollPosition';

interface Image {
  id: string;
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

  useEffect(() => {
    const savedScrollPosition = localStorage.getItem(SCROLL_POSITION_KEY);
    if (savedScrollPosition && containerRef.current) {
      containerRef.current.scrollTop = parseInt(savedScrollPosition, 10);
    }

    return () => {
      if (containerRef.current) {
        localStorage.setItem(SCROLL_POSITION_KEY, containerRef.current.scrollTop.toString());
      }
    };
  }, []);

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
                columnCount={4}
                aspectRatio={4/3}
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

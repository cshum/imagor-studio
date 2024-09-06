import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ContentLayout } from '@/layouts/content-layout.tsx';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { ImageGallery } from '@/components/demo/image-gallery.tsx';
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx';

// Custom debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function HomePage() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isOpen } = useSidebarToggle();

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  const debouncedUpdateDimensions = useCallback(
    debounce(updateDimensions, 250),
    [updateDimensions]
  );

  // Handle window resizes
  useEffect(() => {
    window.addEventListener('resize', debouncedUpdateDimensions);
    return () => {
      window.removeEventListener('resize', debouncedUpdateDimensions);
    };
  }, [debouncedUpdateDimensions]);

  // Handle sidebar toggle
  useEffect(() => {
    const timeoutId = setTimeout(updateDimensions, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, updateDimensions]);

  // Initial dimension calculation
  useEffect(() => {
    updateDimensions();
  }, [updateDimensions]);

  return (
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
          <div
            ref={containerRef}
            className="h-[calc(100vh-200px)] overflow-auto"
          >
            {dimensions.width > 0 && dimensions.height > 0 && (
              <ImageGallery
                imageCount={1000}
                columnCount={4}
                rowHeight={250}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

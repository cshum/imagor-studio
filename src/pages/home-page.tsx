import { Link } from 'react-router-dom';
import { ContentLayout } from '@/layouts/content-layout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { ImageGallery } from '@/components/demo/image-gallery';
import { useResponsiveDimensions } from '@/hooks/use-responsive-dimensions'

export default function HomePage() {
  const { dimensions, containerRef } = useResponsiveDimensions();

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

import { Link } from 'react-router-dom' // Use React Router's Link
import { ContentLayout } from '@/layouts/content-layout.tsx'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb'
import { Card, CardContent } from '@/components/ui/card.tsx'
import { ImageGallery } from '@/components/demo/image-gallery.tsx'

export default function HomePage() {
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
          <ImageGallery imageCount={1000} columnCount={4} rowHeight={250} />
        </CardContent>
      </Card>
    </ContentLayout>
  )
}

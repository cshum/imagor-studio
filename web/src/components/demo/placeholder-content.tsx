import { Link } from 'react-router-dom' // React Router Link
import { Card, CardContent } from '@/components/ui/card' // ShadCN components

export function PlaceholderContent() {
  return (
    <Card className="rounded-lg border-none mt-4">
      <CardContent className="p-6">
        <div className="flex justify-center items-center min-h-[calc(100vh-56px-64px-20px-24px-56px-48px)]">
          <div className="flex flex-col relative">
            <img
              src="/placeholder.png"
              alt="Placeholder Image"
              width={500}
              height={500}
              className="w-[500px] h-[500px] object-cover"  // Tailwind CSS classes for size
            />
            <div className="absolute -bottom-8 right-0">
              <Link
                to="https://www.freepik.com"  // React Router Link with Tailwind styling
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground"
              >
                Designed by Freepik
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

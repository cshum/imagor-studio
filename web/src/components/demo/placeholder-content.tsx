import { Card, CardContent } from '@/components/ui/card' // ShadCN components

export function PlaceholderContent() {
  return (
    <Card className='mt-4 rounded-lg border-none'>
      <CardContent className='p-6'>
        <div className='flex min-h-[calc(100vh-56px-64px-20px-24px-56px-48px)] items-center justify-center'>
          <div className='relative flex flex-col'>
            <img
              src='/placeholder.png'
              alt='Placeholder Image'
              width={500}
              height={500}
              className='h-[500px] w-[500px] object-cover' // Tailwind CSS classes for size
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

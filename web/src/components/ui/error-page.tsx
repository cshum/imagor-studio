import { AlertTriangle, Home } from 'lucide-react'

import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface ErrorPageProps {
  error?: Error | string
  title?: string
  description?: string
}

const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'

export function ErrorPage({
  error,
  title = 'Something went wrong',
  description = 'There was an error loading the page. Please try going back to the home page.',
}: ErrorPageProps) {
  const handleGoHome = () => {
    window.location.href = '/'
  }

  const errorMessage = typeof error === 'string' ? error : error?.message

  return (
    <div className='flex min-h-[400px] items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
            <AlertTriangle className='h-6 w-6 text-red-600' />
          </div>
          <CardTitle className='text-red-900'>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {errorMessage && process.env.NODE_ENV === 'development' && (
            <div className='rounded-md bg-red-50 p-3'>
              <p className='text-sm font-medium text-red-800'>Error Details:</p>
              <p className='mt-1 font-mono text-xs text-red-700'>{errorMessage}</p>
            </div>
          )}
          {!isEmbeddedMode && (
            <Button onClick={handleGoHome} className='w-full'>
              <Home className='mr-2 h-4 w-4' />
              Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

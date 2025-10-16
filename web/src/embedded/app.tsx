import { useEffect, useState } from 'react'
import { EmbeddedImageEditor } from './components/embedded-image-editor'
import { parseQueryParams } from './lib/query-params'
import { initializeTheme } from '@/stores/theme-store'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { Toaster } from '@/components/ui/sonner'

export function EmbeddedApp() {
  const [queryParams, setQueryParams] = useState<{
    image?: string
    token?: string
    error?: string
  }>({})

  useEffect(() => {
    // Initialize theme for embedded mode
    const themeStorage = new LocalConfigStorage('theme')
    initializeTheme(themeStorage, 'class')

    // Parse query parameters
    const params = parseQueryParams()
    setQueryParams(params)

    // Validate required parameters
    if (!params.image) {
      setQueryParams(prev => ({ 
        ...prev, 
        error: 'Missing required parameter: image' 
      }))
    }
  }, [])

  if (queryParams.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error</h1>
          <p className="text-muted-foreground">{queryParams.error}</p>
        </div>
      </div>
    )
  }

  if (!queryParams.image) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <EmbeddedImageEditor 
        imagePath={queryParams.image}
        token={queryParams.token}
      />
      <Toaster />
    </>
  )
}

import { useTranslation } from 'react-i18next'
import { ChevronRight, Image, Layers } from 'lucide-react'

import type { ImageEditor } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerBreadcrumbProps {
  imageEditor: ImageEditor
  className?: string
}

export function LayerBreadcrumb({ imageEditor, className }: LayerBreadcrumbProps) {
  const { t } = useTranslation()
  const contextPath = imageEditor.getContextPath()
  const allLayers = imageEditor.getBaseLayers()

  // Build breadcrumb items
  const breadcrumbItems: Array<{ id: string | null; name: string; icon: typeof Image }> = [
    {
      id: null,
      name: t('imageEditor.layers.breadcrumb.base'),
      icon: Image,
    },
  ]

  // Add each layer in the path
  for (const layerId of contextPath) {
    const layer = allLayers.find((l) => l.id === layerId)
    if (layer) {
      breadcrumbItems.push({
        id: layerId,
        name: layer.name,
        icon: Layers,
      })
    }
  }

  // Don't show breadcrumb if we're at the base level
  if (contextPath.length === 0) {
    return null
  }

  const handleNavigate = (targetId: string | null) => {
    if (targetId === null) {
      // Navigate to base - go up all levels
      const depth = imageEditor.getContextDepth()
      for (let i = 0; i < depth; i++) {
        imageEditor.switchContext(null)
      }
    } else {
      // Navigate to a specific layer in the path
      const targetIndex = contextPath.indexOf(targetId)
      if (targetIndex !== -1) {
        // Go up the required number of levels
        const levelsToGoUp = contextPath.length - targetIndex - 1
        for (let i = 0; i < levelsToGoUp; i++) {
          imageEditor.switchContext(null)
        }
      }
    }
  }

  return (
    <div className={cn('flex items-center gap-1 text-sm', className)}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1
        const Icon = item.icon

        return (
          <div key={item.id || 'base'} className='flex items-center gap-1'>
            <button
              onClick={() => !isLast && handleNavigate(item.id)}
              disabled={isLast}
              className={cn(
                'flex items-center gap-1.5 rounded px-2 py-1 transition-colors',
                isLast
                  ? 'text-foreground cursor-default font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className='h-3.5 w-3.5' />
              <span className='max-w-[150px] truncate'>{item.name}</span>
            </button>
            {!isLast && <ChevronRight className='text-muted-foreground h-3.5 w-3.5' />}
          </div>
        )
      })}
    </div>
  )
}

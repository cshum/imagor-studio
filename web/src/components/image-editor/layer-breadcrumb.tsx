import { ChevronDown, ChevronRight, FileText, Image, Layers } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ImageEditor } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerBreadcrumbProps {
  imageEditor: ImageEditor
  className?: string
  isMobile?: boolean
  baseLabel?: React.ReactNode
  baseName?: string
}

export function LayerBreadcrumb({
  imageEditor,
  className,
  isMobile = false,
  baseLabel,
  baseName,
}: LayerBreadcrumbProps) {
  const contextPath = imageEditor.getContextPath()
  const allLayers = imageEditor.getBaseLayers()

  // Extract filename from base image path
  const imagePath = imageEditor.getBaseImagePath()
  const baseImageName = imagePath.split('/').pop() || imagePath

  // Use baseName if provided, otherwise use the image filename
  const displayBaseName = baseName || baseImageName

  // Determine if this is a template (baseName is provided)
  const isTemplate = !!baseName

  // Build breadcrumb items by traversing the layer tree
  const breadcrumbItems: Array<{ id: string | null; name: string; icon: typeof Image }> = [
    {
      id: null,
      name: displayBaseName,
      icon: isTemplate ? FileText : Image,
    },
  ]

  // Traverse the tree to find each layer in the path
  let currentLayers = allLayers
  for (const layerId of contextPath) {
    const layer = currentLayers.find((l) => l.id === layerId)
    if (layer) {
      breadcrumbItems.push({
        id: layerId,
        name: layer.name,
        icon: Layers,
      })
      // Go deeper into nested layers for next iteration
      currentLayers = layer.transforms?.layers || []
    } else {
      // Layer not found in current depth, stop here
      break
    }
  }

  // Check if we're at the base level
  const isAtBase = contextPath.length === 0

  // Get the current page (last breadcrumb item)
  const currentPage = breadcrumbItems[breadcrumbItems.length - 1]

  // If at base level, show simple non-interactive breadcrumb
  if (isAtBase) {
    // If baseLabel is provided, use it; otherwise show the base image name
    if (baseLabel) {
      return <div className={cn('flex items-center px-2', className)}>{baseLabel}</div>
    }

    return (
      <div className={cn('text-muted-foreground flex items-center px-2', className)}>
        <span
          className={cn('truncate', isMobile ? 'max-w-[260px] text-base' : 'max-w-[240px] text-sm')}
        >
          {baseImageName}
        </span>
      </div>
    )
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
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className={cn(
              'gap-1 px-2',
              isMobile ? 'h-auto min-h-[44px] w-full justify-start py-2' : 'h-9',
            )}
          >
            <Layers className={cn('mr-1 flex-shrink-0', isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
            <span
              className={cn(
                'truncate',
                isMobile ? 'max-w-[220px] text-base' : 'max-w-[200px] text-sm',
              )}
            >
              {currentPage?.name}
            </span>
            <ChevronDown className={cn('flex-shrink-0', isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-64'>
          {breadcrumbItems.map((breadcrumb, index) => {
            const isLast = index === breadcrumbItems.length - 1
            const Icon = breadcrumb.icon

            return (
              <DropdownMenuItem
                key={breadcrumb.id || 'base'}
                className={cn('flex items-center', isLast && 'bg-accent/50')}
                onClick={() => !isLast && handleNavigate(breadcrumb.id)}
                disabled={isLast}
              >
                <div className='flex w-full items-center'>
                  <div
                    className='flex w-full items-center'
                    style={{ paddingLeft: `${index * 16}px` }}
                  >
                    {index > 0 && (
                      <ChevronRight className='text-muted-foreground mr-2 h-3 w-3 flex-shrink-0' />
                    )}
                    <Icon className='mr-2 h-3.5 w-3.5 flex-shrink-0' />
                    <span className={cn('truncate', isLast && 'font-medium')}>
                      {breadcrumb.name}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

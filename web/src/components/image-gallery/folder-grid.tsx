import { RefObject } from 'react'
import { Folder } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export interface Gallery {
  galleryKey: string
  galleryName: string
}

export interface FolderGridProps {
  folders: Gallery[]
  width: number
  maxFolderWidth: number
  focusedIndex?: number
  folderRefs?: RefObject<(HTMLDivElement | null)[]>
  onFolderKeyDown?: (event: React.KeyboardEvent, index: number) => void
  onFolderClick?: (folder: Gallery, index: number) => void
}

export const FolderGrid = ({
  folders,
  width,
  maxFolderWidth,
  focusedIndex = -1,
  folderRefs,
  onFolderKeyDown,
  onFolderClick,
}: FolderGridProps) => {
  const columnCount = Math.max(2, Math.floor(width / maxFolderWidth))
  const folderWidth = width / columnCount

  if (folders.length === 0) {
    return null
  }

  return (
    <div
      className='mb-4 grid gap-2'
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        width: `${width}px`,
      }}
      role='grid'
      aria-label='Folders'
      tabIndex={-1}
    >
      {folders.map((folder, index) => (
        <Card
          key={folder.galleryKey}
          ref={(el) => {
            if (folderRefs?.current) {
              folderRefs.current[index] = el
            }
          }}
          className='hover-touch:bg-accent focus-visible:ring-ring cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          onClick={() => onFolderClick?.(folder, index)}
          onKeyDown={(e) => onFolderKeyDown?.(e, index)}
          tabIndex={index === 0 && focusedIndex === -1 ? 0 : focusedIndex === index ? 0 : -1}
          role='gridcell'
          aria-label={`Folder: ${folder.galleryName}`}
          style={{ width: `${folderWidth - 8}px` }} // Subtracting 8px to account for the gap
        >
          <CardContent className='flex items-center px-4 py-4 sm:py-3'>
            <Folder className='text-primary mr-2 h-5 w-5 flex-shrink-0' />
            <span className='truncate text-sm font-medium'>{folder.galleryName}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

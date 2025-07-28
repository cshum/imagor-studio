import { Folder } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export interface Gallery {
  galleryKey: string
  galleryName: string
}

export interface FolderGridProps {
  folders: Gallery[]
  onFolderClick?: (folder: Gallery) => void
  width: number
  maxFolderWidth: number
}

export const FolderGrid = ({ folders, onFolderClick, width, maxFolderWidth }: FolderGridProps) => {
  const columnCount = Math.max(2, Math.floor(width / maxFolderWidth))
  const folderWidth = width / columnCount

  return (
    <div
      className='mb-4 grid gap-2'
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        width: `${width}px`,
      }}
    >
      {folders.map((folder) => (
        <Card
          key={folder.galleryKey}
          className='hover:bg-accent cursor-pointer transition-colors'
          onClick={() => onFolderClick?.(folder)}
          style={{ width: `${folderWidth - 8}px` }} // Subtracting 8px to account for the gap
        >
          <CardContent className='flex items-center px-4 py-3'>
            <Folder className='text-primary mr-2 h-5 w-5 flex-shrink-0' />
            <span className='truncate text-sm font-medium'>{folder.galleryName}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

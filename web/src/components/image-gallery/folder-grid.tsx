import { RefObject, useState } from 'react'
import { Folder, MoreVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface Gallery {
  galleryKey: string
  galleryName: string
}

export interface FolderGridProps {
  folders: Gallery[]
  width: number
  maxFolderWidth: number
  foldersVisible?: boolean
  focusedIndex?: number
  folderRefs?: RefObject<(HTMLDivElement | null)[]>
  onFolderKeyDown?: (event: React.KeyboardEvent, index: number) => void
  onFolderClick?: (folder: Gallery, index: number) => void
  onFolderMenuClick?: (folder: Gallery, event: React.MouseEvent) => void
}

interface FolderCardProps {
  folder: Gallery
  index: number
  folderWidth: number
  foldersVisible: boolean
  focusedIndex: number
  folderRef?: (el: HTMLDivElement | null) => void
  onFolderKeyDown?: (event: React.KeyboardEvent, index: number) => void
  onFolderClick?: (folder: Gallery, index: number) => void
  onFolderMenuClick?: (folder: Gallery, event: React.MouseEvent) => void
}

const FolderCard = ({
  folder,
  index,
  folderWidth,
  foldersVisible,
  focusedIndex,
  folderRef,
  onFolderKeyDown,
  onFolderClick,
  onFolderMenuClick,
}: FolderCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      ref={folderRef}
      className='hover-touch:bg-accent focus-visible:ring-ring cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
      onClick={() => onFolderClick?.(folder, index)}
      onKeyDown={(e) => onFolderKeyDown?.(e, index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={
        foldersVisible
          ? index === 0 && focusedIndex === -1
            ? 0
            : focusedIndex === index
              ? 0
              : -1
          : -1
      }
      role='gridcell'
      aria-label={`Folder: ${folder.galleryName}`}
      style={{ width: `${folderWidth - 8}px` }}
      data-folder-key={folder.galleryKey}
      data-folder-name={folder.galleryName}
    >
      <CardContent className='relative flex items-center px-4 py-4 sm:py-3'>
        <Folder className='text-primary mr-2 h-5 w-5 flex-shrink-0' />
        <span className='truncate text-sm font-medium'>{folder.galleryName}</span>
        {onFolderMenuClick && isHovered && (
          <Button
            variant='ghost'
            size='sm'
            className='absolute right-2 h-6 w-6 p-0'
            onClick={(e) => {
              e.stopPropagation()
              onFolderMenuClick(folder, e)
            }}
            aria-label='More options'
          >
            <MoreVertical className='h-3 w-3' />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export const FolderGrid = ({
  folders,
  width,
  maxFolderWidth,
  foldersVisible = true,
  focusedIndex = -1,
  folderRefs,
  onFolderKeyDown,
  onFolderClick,
  onFolderMenuClick,
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
        <FolderCard
          key={folder.galleryKey}
          folder={folder}
          index={index}
          folderWidth={folderWidth}
          foldersVisible={foldersVisible}
          focusedIndex={focusedIndex}
          folderRef={(el) => {
            if (folderRefs?.current) {
              folderRefs.current[index] = el
            }
          }}
          onFolderKeyDown={onFolderKeyDown}
          onFolderClick={onFolderClick}
          onFolderMenuClick={onFolderMenuClick}
        />
      ))}
    </div>
  )
}

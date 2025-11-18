import { useEffect, useRef, useState } from 'react'
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
  focusedIndex?: number
  onFocusChange?: (index: number) => void
  onNavigateDown?: () => void
}

export const FolderGrid = ({ 
  folders, 
  onFolderClick, 
  width, 
  maxFolderWidth,
  focusedIndex: externalFocusedIndex,
  onFocusChange,
  onNavigateDown
}: FolderGridProps) => {
  const columnCount = Math.max(2, Math.floor(width / maxFolderWidth))
  const folderWidth = width / columnCount
  const focusedIndex = externalFocusedIndex ?? -1
  const folderRefs = useRef<(HTMLDivElement | null)[]>([])

  // Initialize refs array
  useEffect(() => {
    folderRefs.current = folderRefs.current.slice(0, folders.length)
  }, [folders.length])

  // Focus element when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < folders.length) {
      folderRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex, folders.length])

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const currentRow = Math.floor(index / columnCount)
    const currentCol = index % columnCount
    const lastRow = Math.floor((folders.length - 1) / columnCount)

    let newIndex = index

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        onFolderClick?.(folders[index])
        break

      case 'ArrowRight':
        event.preventDefault()
        newIndex = Math.min(index + 1, folders.length - 1)
        break

      case 'ArrowLeft':
        event.preventDefault()
        newIndex = Math.max(index - 1, 0)
        break

      case 'ArrowDown':
        event.preventDefault()
        // If we're on the last row, navigate to images
        if (currentRow === lastRow && onNavigateDown) {
          onNavigateDown()
          return
        }
        newIndex = Math.min(index + columnCount, folders.length - 1)
        break

      case 'ArrowUp':
        event.preventDefault()
        newIndex = Math.max(index - columnCount, 0)
        break

      case 'Home':
        event.preventDefault()
        newIndex = 0
        break

      case 'End':
        event.preventDefault()
        newIndex = folders.length - 1
        break

      default:
        return
    }

    if (newIndex !== index && onFocusChange) {
      onFocusChange(newIndex)
    }
  }

  const handleClick = (folder: Gallery, index: number) => {
    onFocusChange?.(index)
    onFolderClick?.(folder)
  }

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
            folderRefs.current[index] = el
          }}
          className='hover-touch:bg-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          onClick={() => handleClick(folder, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
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

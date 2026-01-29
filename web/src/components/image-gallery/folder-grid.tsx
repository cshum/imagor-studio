import { RefObject } from 'react'
import { Check, Folder, MoreVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DragItem } from '@/hooks/use-item-drag-drop'

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
  selectedFolderKeys?: Set<string>
  selectedImageKeys?: Set<string>
  folderRefs?: RefObject<(HTMLDivElement | null)[]>
  onFolderKeyDown?: (event: React.KeyboardEvent, index: number) => void
  onFolderClick?: (folder: Gallery, index: number, event?: React.MouseEvent) => void
  onFolderSelectionToggle?: (folderKey: string, index: number, event: React.MouseEvent) => void
  renderMenuItems?: (folder: Gallery) => React.ReactNode
  // Drag and drop props
  onDragStart?: (e: React.DragEvent, items: DragItem[], sourceGalleryKey: string) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent, targetFolderKey: string) => void
  onDragEnter?: (e: React.DragEvent, targetFolderKey: string) => void
  onDragLeave?: (e: React.DragEvent, targetFolderKey: string) => void
  onContainerDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, targetFolderKey: string) => void
  dragOverTarget?: string | null
  draggedItems?: DragItem[]
  galleryKey?: string
}

interface FolderCardProps {
  folder: Gallery
  index: number
  folderWidth: number
  foldersVisible: boolean
  focusedIndex: number
  isSelected?: boolean
  folderRef?: (el: HTMLDivElement | null) => void
  onFolderKeyDown?: (event: React.KeyboardEvent, index: number) => void
  onFolderClick?: (folder: Gallery, index: number, event?: React.MouseEvent) => void
  onSelectionToggle?: (folderKey: string, index: number, event: React.MouseEvent) => void
  renderMenuItems?: (folder: Gallery) => React.ReactNode
  // Drag and drop props
  onDragStart?: (e: React.DragEvent, items: DragItem[], sourceGalleryKey: string) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent, targetFolderKey: string) => void
  onDragEnter?: (e: React.DragEvent, targetFolderKey: string) => void
  onDragLeave?: (e: React.DragEvent, targetFolderKey: string) => void
  onDrop?: (e: React.DragEvent, targetFolderKey: string) => void
  isDragOver?: boolean
  isBeingDragged?: boolean
  selectedFolderKeys?: Set<string>
  selectedImageKeys?: Set<string>
  galleryKey?: string
}

const FolderCard = ({
  folder,
  index,
  folderWidth,
  foldersVisible,
  focusedIndex,
  isSelected = false,
  folderRef,
  onFolderKeyDown,
  onFolderClick,
  onSelectionToggle,
  renderMenuItems,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragOver = false,
  isBeingDragged = false,
  selectedFolderKeys,
  selectedImageKeys,
  galleryKey = '',
}: FolderCardProps) => {
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelectionToggle) {
      onSelectionToggle(folder.galleryKey, index, e)
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (!onDragStart) return

    // Determine what to drag
    const folderKey = folder.galleryKey.endsWith('/') ? folder.galleryKey : `${folder.galleryKey}/`
    const items: DragItem[] = []

    // If this folder is selected, drag ALL selected items (folders AND images)
    if (selectedFolderKeys?.has(folderKey)) {
      // Add all selected folders
      selectedFolderKeys.forEach((key) => {
        const name = key.split('/').filter(Boolean).pop() || 'Root'
        items.push({ key, name, type: 'folder' })
      })

      // Add all selected images
      selectedImageKeys?.forEach((imageKey) => {
        const fullKey = galleryKey ? `${galleryKey}/${imageKey}` : imageKey
        const name = imageKey.split('/').pop() || imageKey
        items.push({ key: fullKey, name, type: 'image' })
      })
    } else {
      // Otherwise, just drag this folder
      items.push({
        key: folderKey,
        name: folder.galleryName,
        type: 'folder',
      })
    }

    // Extract source gallery key from folder path
    const pathParts = folder.galleryKey.split('/')
    pathParts.pop() // Remove folder name
    const sourceGalleryKey = pathParts.join('/')

    onDragStart(e, items, sourceGalleryKey)
  }

  return (
    <Card
      ref={folderRef}
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver?.(e, folder.galleryKey)}
      onDragEnter={(e) => onDragEnter?.(e, folder.galleryKey)}
      onDragLeave={(e) => onDragLeave?.(e, folder.galleryKey)}
      onDrop={(e) => onDrop?.(e, folder.galleryKey)}
      className={`group/folder hover-touch:bg-accent focus-visible:ring-ring cursor-pointer transition-all select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${isSelected ? 'ring-2 ring-blue-600' : ''} ${isDragOver ? 'bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950' : ''} ${isBeingDragged ? '!opacity-50' : ''}`}
      onClick={(e) => {
        // Check for Cmd/Ctrl+Click for selection
        if ((e.metaKey || e.ctrlKey) && onSelectionToggle) {
          e.preventDefault()
          e.stopPropagation()
          onSelectionToggle(folder.galleryKey, index, e)
          return
        }

        // Normal click: always navigate to folder
        onFolderClick?.(folder, index, e)
      }}
      onKeyDown={(e) => onFolderKeyDown?.(e, index)}
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
        {onSelectionToggle ? (
          <div
            className='group/icon mr-2 flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded transition-colors'
            onClick={handleIconClick}
            role='button'
            aria-label={isSelected ? 'Deselect folder' : 'Select folder'}
          >
            {isSelected ? (
              <div className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 p-1'>
                <Check className='h-5 w-5 text-white' />
              </div>
            ) : (
              <>
                <Folder className='text-primary h-5 w-5 group-hover/icon:hidden' />
                <Check className='text-primary hidden h-5 w-5 group-hover/icon:block' />
              </>
            )}
          </div>
        ) : (
          <Folder className='text-primary mr-2 h-5 w-5 flex-shrink-0' />
        )}
        <span className='truncate text-sm font-medium'>{folder.galleryName}</span>
        {renderMenuItems && (
          <div
            className='pointer-events-none absolute right-2 opacity-0 transition-opacity group-hover/folder:pointer-events-auto group-hover/folder:opacity-100'
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0'
                  aria-label='More options'
                  tabIndex={-1}
                >
                  <MoreVertical className='h-3 w-3' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='w-56'
                onClick={(e) => e.stopPropagation()}
              >
                {renderMenuItems(folder)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
  selectedFolderKeys,
  selectedImageKeys,
  folderRefs,
  onFolderKeyDown,
  onFolderClick,
  onFolderSelectionToggle,
  renderMenuItems,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onContainerDragLeave,
  onDrop,
  dragOverTarget,
  draggedItems = [],
  galleryKey = '',
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
      onDragLeave={onContainerDragLeave}
    >
      {folders.map((folder, index) => {
        const folderKey = folder.galleryKey.endsWith('/')
          ? folder.galleryKey
          : `${folder.galleryKey}/`
        const isSelected = selectedFolderKeys?.has(folderKey) || false
        const isDragOver = dragOverTarget === folder.galleryKey
        const isBeingDragged = draggedItems.some((item) => item.key === folderKey)

        return (
          <FolderCard
            key={folder.galleryKey}
            folder={folder}
            index={index}
            folderWidth={folderWidth}
            foldersVisible={foldersVisible}
            focusedIndex={focusedIndex}
            isSelected={isSelected}
            folderRef={(el) => {
              if (folderRefs?.current) {
                folderRefs.current[index] = el
              }
            }}
            onFolderKeyDown={onFolderKeyDown}
            onFolderClick={onFolderClick}
            onSelectionToggle={onFolderSelectionToggle}
            renderMenuItems={renderMenuItems}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            isDragOver={isDragOver}
            isBeingDragged={isBeingDragged}
            selectedFolderKeys={selectedFolderKeys}
            selectedImageKeys={selectedImageKeys}
            galleryKey={galleryKey}
          />
        )
      })}
    </div>
  )
}

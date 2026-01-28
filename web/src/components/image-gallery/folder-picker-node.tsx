import React, { useState } from 'react'
import { ChevronRight, Folder } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { listFiles } from '@/api/storage-api'

export interface FolderNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FolderNode[]
  isLoaded: boolean
  isExpanded: boolean
}

interface FolderPickerNodeProps {
  folder: FolderNode
  selectedPath: string | null
  excludePaths: Set<string>
  onSelect: (path: string) => void
  onUpdateNode: (path: string, updates: Partial<FolderNode>) => void
  level?: number
}

export function FolderPickerNode({
  folder,
  selectedPath,
  excludePaths,
  onSelect,
  onUpdateNode,
  level = 0,
}: FolderPickerNodeProps) {
  const [isLoading, setIsLoading] = useState(false)

  const isSelected = selectedPath === folder.path
  // Check if this folder is excluded or is a subfolder of an excluded folder
  const isDisabled = excludePaths.has(folder.path) || 
    Array.from(excludePaths).some(excludedPath => {
      // Check if current folder is a subfolder of any excluded path
      // e.g., if "folder1/" is excluded, "folder1/subfolder/" should also be disabled
      return excludedPath && folder.path.startsWith(excludedPath)
    })
  const hasChildren = folder.children && folder.children.length > 0
  const canExpand = folder.isDirectory && (!folder.isLoaded || hasChildren)

  const handleFolderClick = () => {
    if (!isDisabled) {
      onSelect(folder.path)
    }
  }

  const handleExpandClick = async (evt?: React.MouseEvent) => {
    evt?.stopPropagation()

    if (!folder.isLoaded && folder.isDirectory) {
      // Load children if not loaded yet
      setIsLoading(true)
      try {
        const result = await listFiles({
          path: folder.path,
          onlyFolders: true,
        })

        const children: FolderNode[] = result.items.map((item) => ({
          name: item.name,
          path: item.path,
          isDirectory: item.isDirectory,
          isLoaded: false,
          isExpanded: false,
        }))

        onUpdateNode(folder.path, {
          children,
          isLoaded: true,
          isExpanded: true,
        })
      } catch (error) {
        console.error('Failed to load folder children:', error)
      } finally {
        setIsLoading(false)
      }
    } else if (folder.isExpanded) {
      // Collapse if already expanded
      onUpdateNode(folder.path, { isExpanded: false })
    } else {
      // Expand if collapsed
      onUpdateNode(folder.path, { isExpanded: true })
    }
  }

  // If this is a leaf folder (no children), render as a simple button
  if (!canExpand) {
    return (
      <div
        className={`hover:bg-accent flex min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm transition-colors ${
          isSelected ? 'bg-accent' : ''
        } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
        onClick={handleFolderClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className='w-4' />
        <Folder className='text-primary h-4 w-4 flex-shrink-0' />
        <span className='flex-1 truncate'>{folder.name || 'Root'}</span>
      </div>
    )
  }

  // Render expandable folder
  return (
    <Collapsible
      open={folder.isExpanded}
      className='[&[data-state=open]>div>div>svg:first-child]:rotate-90'
    >
      <div
        className={`hover:bg-accent flex min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm transition-colors ${
          isSelected ? 'bg-accent' : ''
        } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
        onClick={handleFolderClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <CollapsibleTrigger asChild>
          <div onClick={handleExpandClick} className='flex items-center'>
            <ChevronRight className='h-4 w-4 transition-transform' />
          </div>
        </CollapsibleTrigger>
        <Folder className='text-primary h-4 w-4 flex-shrink-0' />
        <span className='flex-1 truncate'>{folder.name || 'Root'}</span>
      </div>

      <CollapsibleContent>
        <div className='space-y-0.5'>
          {folder.children?.map((child) => (
            <FolderPickerNode
              key={child.path}
              folder={child}
              selectedPath={selectedPath}
              excludePaths={excludePaths}
              onSelect={onSelect}
              onUpdateNode={onUpdateNode}
              level={level + 1}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

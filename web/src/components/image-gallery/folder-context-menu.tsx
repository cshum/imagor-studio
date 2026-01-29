import React from 'react'

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'

export interface FolderContextData {
  folderName: string
  folderKey: string
}

interface FolderContextMenuProps {
  children: React.ReactNode
  renderMenuItems: (data: FolderContextData) => React.ReactNode
}

export const FolderContextMenu = ({ children, renderMenuItems }: FolderContextMenuProps) => {
  const [contextData, setContextData] = React.useState<FolderContextData | null>(null)

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    // Find the closest folder element using event delegation
    const target = (e.target as Element).closest('[data-folder-key]') as HTMLElement
    if (target) {
      const folderKey = target.getAttribute('data-folder-key') || ''
      const folderName = target.getAttribute('data-folder-name') || ''
      setContextData({ folderKey, folderName })
    } else {
      // Prevent context menu from opening when clicking on empty space
      e.preventDefault()
      setContextData(null)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenuOpen}>{children}</div>
      </ContextMenuTrigger>
      {contextData && (
        <ContextMenuContent className='w-56'>{renderMenuItems(contextData)}</ContextMenuContent>
      )}
    </ContextMenu>
  )
}

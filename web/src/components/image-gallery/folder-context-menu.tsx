import React from 'react'

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'

export interface FolderContextData {
  folderName: string
  folderKey: string
}

interface FolderContextMenuProps {
  children: React.ReactNode
  renderMenuItems: (data: FolderContextData) => React.ReactNode
  renderBulkMenuItems?: () => React.ReactNode
  selectedItems?: Set<string>
  selectedCount?: number
}

export const FolderContextMenu = ({
  children,
  renderMenuItems,
  renderBulkMenuItems,
  selectedItems,
  selectedCount = 0,
}: FolderContextMenuProps) => {
  const [contextData, setContextData] = React.useState<FolderContextData | null>(null)
  const [showBulkMenu, setShowBulkMenu] = React.useState(false)

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    // Find the closest folder element using event delegation
    const target = (e.target as Element).closest('[data-folder-key]') as HTMLElement
    if (target) {
      const folderKey = target.getAttribute('data-folder-key') || ''
      const folderName = target.getAttribute('data-folder-name') || ''

      // Ensure folder key ends with / for comparison
      const normalizedFolderKey = folderKey.endsWith('/') ? folderKey : `${folderKey}/`

      // If this folder is in the selection, show bulk menu instead
      if (selectedItems && selectedItems.has(normalizedFolderKey) && selectedCount > 0) {
        setShowBulkMenu(true)
        setContextData(null)
        return
      }

      // Show individual menu
      setShowBulkMenu(false)
      setContextData({ folderKey, folderName })
    } else {
      // Prevent context menu from opening when clicking on empty space
      e.preventDefault()
      setContextData(null)
      setShowBulkMenu(false)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenuOpen}>{children}</div>
      </ContextMenuTrigger>
      {showBulkMenu && renderBulkMenuItems && (
        <ContextMenuContent className='w-56'>{renderBulkMenuItems()}</ContextMenuContent>
      )}
      {!showBulkMenu && contextData && (
        <ContextMenuContent className='w-56'>{renderMenuItems(contextData)}</ContextMenuContent>
      )}
    </ContextMenu>
  )
}

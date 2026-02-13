import React, { useState } from 'react'

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'

export interface ImageContextData {
  imageKey: string | null
  imageName: string
  isVideo: boolean
  position?: { top: number; left: number; width: number; height: number }
}

interface ImageContextMenuProps {
  children: React.ReactNode
  renderMenuItems?: (contextData: ImageContextData) => React.ReactNode
  renderBulkMenuItems?: () => React.ReactNode
  selectedItems?: Set<string>
  selectedCount?: number
}

export const ImageContextMenu: React.FC<ImageContextMenuProps> = ({
  children,
  renderMenuItems,
  renderBulkMenuItems,
  selectedItems,
  selectedCount = 0,
}) => {
  const [contextImageKey, setContextImageKey] = useState<string | null>(null)
  const [contextImageName, setContextImageName] = useState<string>('')
  const [contextIsVideo, setContextIsVideo] = useState<boolean>(false)
  const [contextPosition, setContextPosition] = useState<
    { top: number; left: number; width: number; height: number } | undefined
  >(undefined)
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    // Find the closest image element using event delegation
    const imageElement = (e.target as Element).closest('[data-image-key]')
    if (imageElement) {
      const imageKey = imageElement.getAttribute('data-image-key')
      const imageName = imageElement.getAttribute('data-image-name') || ''
      const isVideo = imageElement.getAttribute('data-is-video') === 'true'

      // If this image is in the selection, show bulk menu instead
      if (selectedItems && imageKey && selectedItems.has(imageKey) && selectedCount > 0) {
        setShowBulkMenu(true)
        setContextImageKey(null)
        return
      }

      // Show individual menu
      setShowBulkMenu(false)

      // Calculate position once here
      const rect = imageElement.getBoundingClientRect()
      const position = {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }

      setContextImageKey(imageKey)
      setContextImageName(imageName)
      setContextIsVideo(isVideo)
      setContextPosition(position)
    } else {
      // Prevent context menu from opening when clicking on empty space
      e.preventDefault()
      setContextImageKey(null)
      setShowBulkMenu(false)
    }
  }

  const contextData: ImageContextData = {
    imageKey: contextImageKey,
    imageName: contextImageName,
    isVideo: contextIsVideo,
    position: contextPosition,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenuOpen}>{children}</div>
      </ContextMenuTrigger>
      {showBulkMenu && renderBulkMenuItems && (
        <ContextMenuContent className='w-56'>{renderBulkMenuItems()}</ContextMenuContent>
      )}
      {!showBulkMenu && contextImageKey && renderMenuItems && (
        <ContextMenuContent className='w-56'>{renderMenuItems(contextData)}</ContextMenuContent>
      )}
    </ContextMenu>
  )
}

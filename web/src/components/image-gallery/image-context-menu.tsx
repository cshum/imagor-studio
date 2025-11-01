import React, { useState } from 'react'

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'

export interface ImageContextData {
  imageKey: string | null
  imageName: string
  isVideo: boolean
}

interface ImageContextMenuProps {
  children: React.ReactNode
  renderMenuItems?: (contextData: ImageContextData) => React.ReactNode
}

export const ImageContextMenu: React.FC<ImageContextMenuProps> = ({
  children,
  renderMenuItems,
}) => {
  const [contextImageKey, setContextImageKey] = useState<string | null>(null)
  const [contextImageName, setContextImageName] = useState<string>('')
  const [contextIsVideo, setContextIsVideo] = useState<boolean>(false)

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    // Find the closest image element using event delegation
    const imageElement = (e.target as Element).closest('[data-image-key]')
    if (imageElement) {
      const imageKey = imageElement.getAttribute('data-image-key')
      const imageName = imageElement.getAttribute('data-image-name') || ''
      const isVideo = imageElement.getAttribute('data-is-video') === 'true'

      setContextImageKey(imageKey)
      setContextImageName(imageName)
      setContextIsVideo(isVideo)
    }
  }

  const contextData: ImageContextData = {
    imageKey: contextImageKey,
    imageName: contextImageName,
    isVideo: contextIsVideo,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenuOpen}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        {renderMenuItems?.(contextData)}
      </ContextMenuContent>
    </ContextMenu>
  )
}

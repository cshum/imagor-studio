import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Pencil, Trash2 } from 'lucide-react'

import { Position } from '@/components/image-gallery/image-view.tsx'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useAuth } from '@/stores/auth-store'

export type ContextMenuAction = 'open' | 'edit' | 'delete'

export interface ContextMenuData {
  action: ContextMenuAction
  imageKey: string
  position?: Position
}

interface ImageContextMenuProps {
  children: React.ReactNode
  onContextMenu?: (data: ContextMenuData) => void
}

export const ImageContextMenu: React.FC<ImageContextMenuProps> = ({ children, onContextMenu }) => {
  const { t } = useTranslation()
  const { authState } = useAuth()
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

  const handleContextMenuAction = (action: ContextMenuAction) => {
    if (!onContextMenu || !contextImageKey) return

    if (action === 'open') {
      // Use querySelector to get the actual image element position
      const rect = document
        .querySelector(`[data-image-key="${contextImageKey}"]`)
        ?.getBoundingClientRect()
      const position = rect
        ? {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        : undefined

      onContextMenu({ action, imageKey: contextImageKey, position })
    } else {
      // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
      setTimeout(() => {
        onContextMenu({ action, imageKey: contextImageKey })
      }, 0)
    }
  }

  const isAuthenticated = authState.state === 'authenticated' || authState.isEmbedded
  const canEdit = isAuthenticated && !contextIsVideo

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenuOpen}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuLabel>{contextImageName}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleContextMenuAction('open')}>
          <Eye className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </ContextMenuItem>
        {canEdit && (
          <ContextMenuItem onClick={() => handleContextMenuAction('edit')}>
            <Pencil className='mr-2 h-4 w-4' />
            {t('pages.gallery.contextMenu.edit')}
          </ContextMenuItem>
        )}
        {isAuthenticated && (
          <ContextMenuItem
            onClick={() => handleContextMenuAction('delete')}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            {t('pages.gallery.contextMenu.delete')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

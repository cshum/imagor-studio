import React from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Pencil, Trash2 } from 'lucide-react'

import { GalleryImage, Position } from '@/components/image-gallery/image-view.tsx'
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
  image: GalleryImage
  position?: Position
}

interface ImageContextMenuProps {
  image: GalleryImage
  children: React.ReactNode
  onContextMenu?: (data: ContextMenuData) => void
}

export const ImageContextMenu: React.FC<ImageContextMenuProps> = ({
  image,
  children,
  onContextMenu,
}) => {
  const { t } = useTranslation()
  const { authState } = useAuth()

  const handleContextMenuAction = (action: ContextMenuAction) => {
    if (!onContextMenu) return

    if (action === 'open') {
      // Use querySelector to get the actual image element position (consistent with original approach)
      const rect = document
        .querySelector(`[data-image-key="${image.imageKey}"]`)
        ?.getBoundingClientRect()
      const position = rect
        ? {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        : undefined

      onContextMenu({ action, image, position })
    } else {
      // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
      setTimeout(() => {
        onContextMenu({ action, image })
      }, 0)
    }
  }

  const isAuthenticated = authState.state === 'authenticated' || authState.isEmbedded
  const canEdit = isAuthenticated && !image.isVideo

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuLabel>{image.imageName}</ContextMenuLabel>
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

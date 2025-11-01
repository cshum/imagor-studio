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
  children?: React.ReactNode
  onImageClick?: (image: GalleryImage, position: Position) => void
  onEdit?: (image: GalleryImage, position: Position) => void
  onDelete?: (image: GalleryImage, position: Position) => void
}

export const ImageContextMenu = ({
  image,
  children,
  onImageClick,
  onEdit,
  onDelete,
}: ImageContextMenuProps) => {
  const { t } = useTranslation()
  const { authState } = useAuth()

  const handleContextMenuAction = (action: ContextMenuAction) => {
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
      : {
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        }

    if (action === 'open' && onImageClick) {
      onImageClick(image, position)
    } else if (action === 'edit' && onEdit) {
      // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
      setTimeout(() => {
        onEdit(image, position)
      }, 0)
    } else if (action === 'delete' && onDelete) {
      // Use setTimeout to avoid Radix UI bug when opening dialog from context menu
      setTimeout(() => {
        onDelete(image, position)
      }, 0)
    }
  }

  const isAuthenticated = authState.state === 'authenticated' || authState.isEmbedded
  const canEdit = isAuthenticated && !image.isVideo

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
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

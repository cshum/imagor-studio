import { useTranslation } from 'react-i18next'
import { Copy, Download, Eye, FolderInput, SquarePen, Trash2, Type } from 'lucide-react'

import type { ImageContextData } from '@/components/image-gallery/image-context-menu'
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { ImagePosition } from '@/stores/image-position-store'

interface UseImageContextMenuProps {
  /**
   * Function to check if user is authenticated.
   */
  isAuthenticated: () => boolean
  /**
   * Check if in embedded mode (affects edit permission).
   */
  isEmbedded: boolean
  /**
   * Callback to handle opening/viewing an image or template.
   */
  onOpen: (imageKey: string, position?: ImagePosition | null) => void
  /**
   * Callback to handle editing an image or template.
   */
  onEdit: (imageKey: string) => void
  /**
   * Callback to handle copying URL.
   */
  onCopyUrl: (imageKey: string, isVideo: boolean) => void
  /**
   * Callback to handle downloading.
   */
  onDownload: (imageKey: string) => void
  /**
   * Callback to trigger rename dialog.
   */
  onRename: (imageKey: string, imageName: string, itemType: 'file') => void
  /**
   * Callback to trigger move dialog.
   */
  onMove: (imageKey: string, imageName: string, itemType: 'file') => void
  /**
   * Callback to trigger delete dialog.
   */
  onDelete: (imageKey: string, imageName: string, itemType: 'file') => void
  /**
   * If true, returns renderDropdownMenuItems instead of renderMenuItems.
   * Use this for dropdown menus (three-dots) instead of context menus (right-click).
   */
  useDropdownItems?: boolean
}

export function useImageContextMenu({
  isAuthenticated,
  isEmbedded,
  onOpen,
  onEdit,
  onCopyUrl,
  onDownload,
  onRename,
  onMove,
  onDelete,
  useDropdownItems = false,
}: UseImageContextMenuProps) {
  const { t } = useTranslation()

  /**
   * Render context menu items (right-click menu)
   */
  const renderContextMenuItems = ({
    imageName,
    imageKey,
    position,
    isVideo,
    isTemplate,
  }: ImageContextData) => {
    const authenticated = isAuthenticated()
    const canEdit = (authenticated || isEmbedded) && !isVideo

    if (!imageKey) return null

    // For templates, show only Edit, Rename, Move, Delete
    if (isTemplate) {
      return (
        <>
          <ContextMenuLabel className='break-all'>{imageName}</ContextMenuLabel>
          <ContextMenuSeparator />
          {authenticated && (
            <>
              <ContextMenuItem onClick={() => onEdit(imageKey)}>
                <SquarePen className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.edit')}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  setTimeout(() => onRename(imageKey, imageName, 'file'), 0)
                }}
              >
                <Type className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.rename')}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  setTimeout(() => onMove(imageKey, imageName, 'file'), 0)
                }}
              >
                <FolderInput className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.move')}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => {
                  setTimeout(() => onDelete(imageKey, imageName, 'file'), 0)
                }}
                className='text-destructive focus:text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.delete')}
              </ContextMenuItem>
            </>
          )}
        </>
      )
    }

    // For regular images/videos, show full menu
    return (
      <>
        <ContextMenuLabel className='break-all'>{imageName}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onOpen(imageKey, position)}>
          <Eye className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </ContextMenuItem>
        {canEdit && (
          <ContextMenuItem onClick={() => onEdit(imageKey)}>
            <SquarePen className='mr-2 h-4 w-4' />
            {t('pages.gallery.contextMenu.edit')}
          </ContextMenuItem>
        )}
        {authenticated && (
          <>
            <ContextMenuItem onClick={() => onCopyUrl(imageKey, isVideo)}>
              <Copy className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.copyUrl')}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDownload(imageKey)}>
              <Download className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.download')}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setTimeout(() => onRename(imageKey, imageName, 'file'), 0)
              }}
            >
              <Type className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setTimeout(() => onMove(imageKey, imageName, 'file'), 0)
              }}
            >
              <FolderInput className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.move')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => {
                setTimeout(() => onDelete(imageKey, imageName, 'file'), 0)
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.delete')}
            </ContextMenuItem>
          </>
        )}
      </>
    )
  }

  /**
   * Render dropdown menu items (three-dots menu)
   */
  const renderDropdownMenuItems = ({
    imageName,
    imageKey,
    isVideo,
    isTemplate,
  }: ImageContextData) => {
    const authenticated = isAuthenticated()
    const canEdit = (authenticated || isEmbedded) && !isVideo

    if (!imageKey) return null

    // For templates, show only Edit, Rename, Move, Delete
    if (isTemplate) {
      return (
        <>
          <DropdownMenuLabel className='break-all'>{imageName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {authenticated && (
            <>
              <DropdownMenuItem onClick={() => onEdit(imageKey)}>
                <SquarePen className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(imageKey, imageName, 'file')}>
                <Type className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(imageKey, imageName, 'file')}>
                <FolderInput className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.move')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(imageKey, imageName, 'file')}
                className='text-destructive focus:text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                {t('pages.gallery.contextMenu.delete')}
              </DropdownMenuItem>
            </>
          )}
        </>
      )
    }

    // For regular images/videos, show full menu
    return (
      <>
        <DropdownMenuLabel className='break-all'>{imageName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onOpen(imageKey)}>
          <Eye className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(imageKey)}>
            <SquarePen className='mr-2 h-4 w-4' />
            {t('pages.gallery.contextMenu.edit')}
          </DropdownMenuItem>
        )}
        {authenticated && (
          <>
            <DropdownMenuItem onClick={() => onCopyUrl(imageKey, isVideo)}>
              <Copy className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.copyUrl')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(imageKey)}>
              <Download className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.download')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(imageKey, imageName, 'file')}>
              <Type className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(imageKey, imageName, 'file')}>
              <FolderInput className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.move')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(imageKey, imageName, 'file')}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.delete')}
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  return {
    renderMenuItems: useDropdownItems ? renderDropdownMenuItems : renderContextMenuItems,
  }
}

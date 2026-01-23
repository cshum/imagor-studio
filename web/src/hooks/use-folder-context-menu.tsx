import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'

import type { FolderContextData } from '@/components/image-gallery/folder-context-menu'
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'

interface UseFolderContextMenuProps {
  onRename: (folderKey: string, folderName: string) => void
  onDelete: (folderKey: string, folderName: string) => void
  /**
   * Optional function to check if user is authenticated.
   * If provided, menu items will only show when this returns true.
   * If not provided, menu items always show (for sidebar use case).
   */
  isAuthenticated?: () => boolean
}

export function useFolderContextMenu({
  onRename,
  onDelete,
  isAuthenticated,
}: UseFolderContextMenuProps) {
  const { t } = useTranslation()

  const renderMenuItems = ({ folderName, folderKey }: FolderContextData) => {
    if (!folderKey) return null

    // If authentication check is provided and user is not authenticated, show only label
    const showActions = !isAuthenticated || isAuthenticated()

    return (
      <>
        <ContextMenuLabel className='break-all'>{folderName}</ContextMenuLabel>
        <ContextMenuSeparator />
        {showActions && (
          <>
            <ContextMenuItem
              onClick={() => {
                setTimeout(() => onRename(folderKey, folderName), 0)
              }}
            >
              <Pencil className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setTimeout(() => onDelete(folderKey, folderName), 0)
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('pages.gallery.folderContextMenu.delete')}
            </ContextMenuItem>
          </>
        )}
      </>
    )
  }

  return { renderMenuItems }
}

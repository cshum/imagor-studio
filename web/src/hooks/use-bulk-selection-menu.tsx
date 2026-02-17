import { useTranslation } from 'react-i18next'
import { FolderInput, Trash2, X } from 'lucide-react'

import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'

interface UseBulkSelectionMenuProps {
  /**
   * Number of selected items
   */
  selectedCount: number
  /**
   * Callback to clear all selections
   */
  onClearSelection: () => void
  /**
   * Callback to trigger bulk move dialog
   */
  onMove: () => void
  /**
   * Callback to trigger bulk delete dialog
   */
  onDelete: () => void
  /**
   * Function to check if user is authenticated
   */
  isAuthenticated: () => boolean
}

export function useBulkSelectionMenu({
  selectedCount,
  onClearSelection,
  onMove,
  onDelete,
  isAuthenticated,
}: UseBulkSelectionMenuProps) {
  const { t } = useTranslation()

  const renderBulkMenuItems = () => {
    const authenticated = isAuthenticated()

    return (
      <>
        <ContextMenuLabel>
          {t('pages.gallery.selection.title', { count: selectedCount })}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onClearSelection} className='hover:cursor-pointer'>
          <X className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.selection.clearSelection')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {authenticated && (
          <>
            <ContextMenuItem
              onClick={() => {
                setTimeout(() => onMove(), 0)
              }}
              className='hover:cursor-pointer'
            >
              <FolderInput className='mr-3 h-4 w-4' />
              {t('pages.gallery.moveItems.title')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => {
                setTimeout(() => onDelete(), 0)
              }}
              className='text-destructive focus:text-destructive hover:cursor-pointer'
            >
              <Trash2 className='mr-3 h-4 w-4' />
              {t('pages.gallery.selection.deleteSelected', { count: selectedCount })}
            </ContextMenuItem>
          </>
        )}
      </>
    )
  }

  return {
    renderBulkMenuItems,
  }
}

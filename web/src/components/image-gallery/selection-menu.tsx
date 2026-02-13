import React from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, FolderInput, Trash2, X } from 'lucide-react'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface SelectionMenuProps {
  selectedCount: number
  onMove?: () => void
  onDelete?: () => void
  onClear: () => void
}

interface SelectionMenuItemsProps {
  selectedCount: number
  onMove?: () => void
  onDelete?: () => void
  onClear: () => void
  useContextItems?: boolean
}

// Shared component to render menu items for both dropdown and context menu
const SelectionMenuItems: React.FC<SelectionMenuItemsProps> = ({
  selectedCount,
  onMove,
  onDelete,
  onClear,
  useContextItems = false,
}) => {
  const { t } = useTranslation()

  const MenuItem = useContextItems ? ContextMenuItem : DropdownMenuItem
  const MenuSeparator = useContextItems ? ContextMenuSeparator : DropdownMenuSeparator

  return (
    <>
      <MenuItem onClick={onClear} className='hover:cursor-pointer'>
        <X className='text-muted-foreground mr-3 h-4 w-4' />
        {t('pages.gallery.selection.clearSelection')}
      </MenuItem>
      <MenuSeparator />
      {onMove && (
        <MenuItem onClick={onMove} className='hover:cursor-pointer'>
          <FolderInput className='mr-3 h-4 w-4' />
          {t('pages.gallery.moveItems.title')}
        </MenuItem>
      )}
      {onMove && onDelete && <MenuSeparator />}
      {onDelete && (
        <MenuItem
          onClick={onDelete}
          className='text-destructive focus:text-destructive hover:cursor-pointer'
        >
          <Trash2 className='mr-3 h-4 w-4' />
          {t('pages.gallery.selection.deleteSelected', { count: selectedCount })}
        </MenuItem>
      )}
    </>
  )
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({
  selectedCount,
  onMove,
  onDelete,
  onClear,
}) => {
  const { t } = useTranslation()

  if (selectedCount === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className='flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none md:h-8'
          aria-label={t('pages.gallery.selection.menu')}
        >
          <Check className='h-4 w-4' />
          <span>{selectedCount}</span>
          <ChevronDown className='h-3.5 w-3.5' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <SelectionMenuItems
          selectedCount={selectedCount}
          onMove={onMove}
          onDelete={onDelete}
          onClear={onClear}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface SelectionContextMenuProps {
  children: React.ReactNode
  selectedCount: number
  selectedItems: Set<string>
  onMove?: () => void
  onDelete?: () => void
  onClear: () => void
}

export const SelectionContextMenu: React.FC<SelectionContextMenuProps> = ({
  children,
  selectedCount,
  selectedItems,
  onMove,
  onDelete,
  onClear,
}) => {
  const [shouldShowBulkMenu, setShouldShowBulkMenu] = React.useState(false)

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    // Check if right-clicked on a selected item
    const target = e.target as Element
    const imageElement = target.closest('[data-image-key]')
    const folderElement = target.closest('[data-folder-key]')

    let clickedItemKey: string | null = null

    if (imageElement) {
      clickedItemKey = imageElement.getAttribute('data-image-key')
    } else if (folderElement) {
      const folderKey = folderElement.getAttribute('data-folder-key')
      // Ensure folder key ends with /
      clickedItemKey = folderKey?.endsWith('/') ? folderKey : `${folderKey}/`
    }

    // Show bulk menu if:
    // 1. Multiple items are selected
    // 2. The clicked item is in the selection
    if (selectedCount > 0 && clickedItemKey && selectedItems.has(clickedItemKey)) {
      setShouldShowBulkMenu(true)
    } else {
      setShouldShowBulkMenu(false)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenuOpen}>{children}</div>
      </ContextMenuTrigger>
      {shouldShowBulkMenu && (
        <ContextMenuContent className='w-56'>
          <SelectionMenuItems
            selectedCount={selectedCount}
            onMove={onMove}
            onDelete={onDelete}
            onClear={onClear}
            useContextItems={true}
          />
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
}

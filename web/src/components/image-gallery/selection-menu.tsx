import React from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, FolderInput, Trash2, X } from 'lucide-react'

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
        {onMove && (
          <DropdownMenuItem onClick={onMove} className='hover:cursor-pointer'>
            <FolderInput className='mr-3 h-4 w-4' />
            {t('pages.gallery.selection.moveSelected')}
          </DropdownMenuItem>
        )}
        {onMove && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className='text-destructive focus:text-destructive hover:cursor-pointer'
          >
            <Trash2 className='mr-3 h-4 w-4' />
            {t('pages.gallery.selection.deleteSelected')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onClear} className='hover:cursor-pointer'>
          <X className='text-muted-foreground mr-3 h-4 w-4' />
          {t('pages.gallery.selection.clearSelection')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Download, Trash2, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface SelectionMenuProps {
  selectedCount: number
  onDownload?: () => void
  onDelete?: () => void
  onClear: () => void
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({
  selectedCount,
  onDownload,
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
        <Badge
          variant='default'
          className='h-10 cursor-pointer gap-2 bg-blue-600 px-3 py-2 transition-colors hover:bg-blue-700'
          aria-label={t('pages.gallery.selection.menu')}
        >
          <Check className='h-4 w-4' />
          <span className='text-sm font-semibold'>{selectedCount}</span>
          <ChevronDown className='h-3.5 w-3.5' />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>
          {t('pages.gallery.selection.title', { count: selectedCount })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onDownload && (
          <DropdownMenuItem onClick={onDownload} className='hover:cursor-pointer'>
            <Download className='text-muted-foreground mr-3 h-4 w-4' />
            {t('pages.gallery.selection.downloadAll')}
          </DropdownMenuItem>
        )}
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

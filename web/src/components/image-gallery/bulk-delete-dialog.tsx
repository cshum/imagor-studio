import React from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, File, Folder } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isFolderKey } from '@/stores/selection-store'

export interface BulkDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: string[]
  isDeleting: boolean
  onConfirm: () => void
}

export const BulkDeleteDialog: React.FC<BulkDeleteDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  isDeleting,
  onConfirm,
}) => {
  const { t } = useTranslation()

  // Split items into folders and files
  const folders = selectedItems.filter((key) => isFolderKey(key))
  const files = selectedItems.filter((key) => !isFolderKey(key))

  const totalCount = selectedItems.length

  // Extract display names from keys
  const getFolderName = (key: string) => {
    const parts = key.split('/').filter(Boolean)
    return parts[parts.length - 1] || key
  }

  const getFileName = (key: string) => {
    const parts = key.split('/')
    return parts[parts.length - 1] || key
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='text-destructive h-5 w-5' />
            {t('pages.gallery.bulkDelete.title')}
          </DialogTitle>
          <DialogDescription>
            {t('pages.gallery.bulkDelete.description', { count: totalCount })}
          </DialogDescription>
        </DialogHeader>

        <div className='my-4'>
          <div className='text-muted-foreground mb-2 text-sm font-medium'>
            {t('pages.gallery.bulkDelete.itemsToDelete')}:
          </div>
          <ScrollArea className='border-muted h-48 rounded-md border'>
            <div className='space-y-1 p-2'>
              {folders.map((folderKey) => (
                <div
                  key={folderKey}
                  className='bg-muted/50 flex items-center gap-2 rounded px-2 py-1.5 text-sm'
                >
                  <Folder className='text-primary h-4 w-4 flex-shrink-0' />
                  <span className='truncate'>{getFolderName(folderKey)}</span>
                </div>
              ))}
              {files.map((fileKey) => (
                <div
                  key={fileKey}
                  className='bg-muted/50 flex items-center gap-2 rounded px-2 py-1.5 text-sm'
                >
                  <File className='text-muted-foreground h-4 w-4 flex-shrink-0' />
                  <span className='truncate'>{getFileName(fileKey)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            {t('pages.gallery.bulkDelete.confirmButton', { count: totalCount })}
          </ButtonWithLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

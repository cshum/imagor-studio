import { useTranslation } from 'react-i18next'
import { FolderX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  isDeleting: boolean
  onConfirm: () => void
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folderName,
  isDeleting,
  onConfirm,
}: DeleteFolderDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FolderX className='text-destructive h-5 w-5' />
            {t('pages.gallery.deleteFolder.title')}
          </DialogTitle>
          <DialogDescription className='space-y-3'>
            <p>{t('pages.gallery.deleteFolder.description')}</p>
            <div className='bg-muted rounded-md p-3'>
              <p className='text-foreground font-mono text-sm break-all'>{folderName}</p>
            </div>
            <p className='text-destructive text-sm font-semibold'>
              {t('pages.gallery.deleteFolder.warning')}
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading variant='destructive' onClick={onConfirm} isLoading={isDeleting}>
            {t('common.buttons.delete')}
          </ButtonWithLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

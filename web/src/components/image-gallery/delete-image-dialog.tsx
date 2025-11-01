import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageName: string
  isDeleting: boolean
  onConfirm: () => void
}

export function DeleteImageDialog({
  open,
  onOpenChange,
  imageName,
  isDeleting,
  onConfirm,
}: DeleteImageDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Trash2 className='text-destructive h-5 w-5' />
            {t('pages.gallery.deleteImage.title')}
          </DialogTitle>
          <DialogDescription className='space-y-3'>
            <p>{t('pages.gallery.deleteImage.description')}</p>
            <div className='bg-muted rounded-md p-3'>
              <p className='text-foreground font-mono text-sm break-all'>{imageName}</p>
            </div>
            <p className='text-muted-foreground text-sm'>
              {t('pages.gallery.deleteImage.warning')}
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t('common.buttons.cancel')}
          </Button>
          <Button variant='destructive' onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t('pages.gallery.deleteImage.deleting') : t('common.buttons.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

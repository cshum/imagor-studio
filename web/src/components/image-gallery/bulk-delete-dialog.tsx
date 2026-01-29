import { useTranslation } from 'react-i18next'

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

export interface BulkDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemCount: number
  isDeleting: boolean
  onConfirm: () => void
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  itemCount,
  isDeleting,
  onConfirm,
}: BulkDeleteDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pages.gallery.bulkDelete.title')}</DialogTitle>
          <DialogDescription>
            {t('pages.gallery.bulkDelete.description', {
              count: itemCount,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
            variant='destructive'
          >
            {t('pages.gallery.bulkDelete.confirmButton', {
              count: itemCount,
            })}
          </ButtonWithLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

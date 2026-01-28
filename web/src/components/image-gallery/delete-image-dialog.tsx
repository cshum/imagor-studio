import { Trans, useTranslation } from 'react-i18next'

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pages.gallery.deleteImage.title')}</DialogTitle>
          <DialogDescription>
            <Trans i18nKey="pages.gallery.deleteImage.description" values={{ imageName }}>
              Are you sure you want to delete <strong>{{ imageName }}</strong>?
            </Trans>
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

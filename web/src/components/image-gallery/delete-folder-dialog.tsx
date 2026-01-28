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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pages.gallery.deleteFolder.title')}</DialogTitle>
          <DialogDescription>
            <Trans i18nKey="pages.gallery.deleteFolder.description" values={{ folderName }}>
              Are you sure you want to delete <strong>{{ folderName }}</strong>?
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

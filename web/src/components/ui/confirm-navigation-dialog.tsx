import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmNavigationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmNavigationDialog({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmNavigationDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('imageEditor.page.confirmLeave')}</DialogTitle>
          <DialogDescription>{t('imageEditor.page.confirmLeaveMessage')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('imageEditor.page.stay')}
          </Button>
          <Button variant='destructive' onClick={onConfirm}>
            {t('imageEditor.page.leave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

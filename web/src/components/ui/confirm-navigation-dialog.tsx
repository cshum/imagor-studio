import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{t('imageEditor.page.confirmLeave')}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {t('imageEditor.page.confirmLeaveMessage')}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <ResponsiveDialogFooter>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          {t('imageEditor.page.stay')}
        </Button>
        <Button variant='destructive' onClick={onConfirm}>
          {t('imageEditor.page.leave')}
        </Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  )
}

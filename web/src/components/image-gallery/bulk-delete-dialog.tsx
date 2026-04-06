import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{t('pages.gallery.bulkDelete.title')}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {t('pages.gallery.bulkDelete.description', {
            count: itemCount,
          })}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <ResponsiveDialogFooter>
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
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  )
}

import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog'

export interface DeleteItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: 'file' | 'folder'
  isDeleting: boolean
  onConfirm: () => void
}

export function DeleteItemDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  isDeleting,
  onConfirm,
}: DeleteItemDialogProps) {
  const { t } = useTranslation()

  // Use appropriate translation keys based on item type
  const translationKey = itemType === 'file' ? 'deleteImage' : 'deleteFolder'
  const valueKey = itemType === 'file' ? 'imageName' : 'folderName'

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{t(`pages.gallery.${translationKey}.title`)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className='break-words'>
          <Trans
            i18nKey={`pages.gallery.${translationKey}.description`}
            values={{ [valueKey]: itemName }}
            components={{ 1: <strong className='break-all' /> }}
          />
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <ResponsiveDialogFooter>
        <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isDeleting}>
          {t('common.buttons.cancel')}
        </Button>
        <ButtonWithLoading variant='destructive' onClick={onConfirm} isLoading={isDeleting}>
          {t('common.buttons.delete')}
        </ButtonWithLoading>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  )
}

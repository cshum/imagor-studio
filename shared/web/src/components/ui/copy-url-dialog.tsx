import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@shared/components/ui/button'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@shared/components/ui/responsive-dialog'
import { Textarea } from '@shared/components/ui/textarea'
import { silentCopyToClipboard } from '@/lib/browser-utils'

interface CopyUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}

export function CopyUrlDialog({ open, onOpenChange, url }: CopyUrlDialogProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && url) {
      silentCopyToClipboard(url)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.select()
          textareaRef.current.setSelectionRange(0, url.length)
        }
      }, 100)
    }
  }, [open, url])

  const handleCopyClick = () => {
    if (textareaRef.current) {
      textareaRef.current.select()
      textareaRef.current.setSelectionRange(0, url.length)
      silentCopyToClipboard(url)
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} contentClassName='sm:max-w-md'>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{t('pages.gallery.copyUrlDialog.title')}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>{t('pages.gallery.copyUrlDialog.description')}</ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <div className='flex flex-col space-y-4'>
        <Textarea ref={textareaRef} value={url} readOnly className='min-h-[100px] resize-none' onClick={handleCopyClick} />
        <div className='flex justify-between'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>{t('pages.gallery.copyUrlDialog.closeButton')}</Button>
          <Button onClick={handleCopyClick}>{t('pages.gallery.copyUrlDialog.copyButton')}</Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

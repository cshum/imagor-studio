import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { silentCopyToClipboard } from '@/lib/browser-utils'

interface CopyUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title?: string
}

export function CopyUrlDialog({
  open,
  onOpenChange,
  url,
  title = 'Copy Image URL',
}: CopyUrlDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && url) {
      // Try to copy to clipboard silently in the background
      silentCopyToClipboard(url)

      // Auto-select the text in the textarea after a short delay
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Copy the URL below. We attempted to copy it automatically, but you may need to copy it
            manually.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col space-y-4'>
          <Textarea
            ref={textareaRef}
            value={url}
            readOnly
            className='min-h-[100px] resize-none'
            onClick={handleCopyClick}
          />
          <div className='flex justify-between'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleCopyClick}>Select & Copy</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'

export interface RenameItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: 'file' | 'folder'
  isRenaming: boolean
  onConfirm: (newName: string) => Promise<void>
}

export function RenameItemDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  isRenaming,
  onConfirm,
}: RenameItemDialogProps) {
  const { t } = useTranslation()
  const [renameInput, setRenameInput] = useState('')
  const [fileExtension, setFileExtension] = useState('')

  // Initialize input when dialog opens or itemName changes
  useEffect(() => {
    if (open && itemName) {
      // For files, extract extension and show only the name without extension
      if (itemType === 'file') {
        // Special handling for template files (.imagor.json)
        if (itemName.endsWith('.imagor.json')) {
          const baseName = itemName.replace(/\.imagor\.json$/, '')
          setRenameInput(baseName)
          setFileExtension('.imagor.json')
        } else {
          // Regular file handling
          const lastDot = itemName.lastIndexOf('.')
          if (lastDot > 0) {
            const nameWithoutExt = itemName.substring(0, lastDot)
            const extension = itemName.substring(lastDot) // includes the dot
            setRenameInput(nameWithoutExt)
            setFileExtension(extension)
          } else {
            setRenameInput(itemName)
            setFileExtension('')
          }
        }
      } else {
        // For folders, use the full name
        setRenameInput(itemName)
        setFileExtension('')
      }
    }
  }, [open, itemName, itemType])

  const handleConfirm = async () => {
    if (!renameInput.trim()) return

    // Reconstruct full name with extension for files
    const newName = itemType === 'file' ? renameInput.trim() + fileExtension : renameInput.trim()

    await onConfirm(newName)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isRenaming) {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Reset state when closing
        setRenameInput('')
        setFileExtension('')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`pages.gallery.renameItem.${itemType}.title`)}</DialogTitle>
          <DialogDescription>
            {t(`pages.gallery.renameItem.${itemType}.description`)}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='flex items-center gap-2'>
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder={t('pages.gallery.renameItem.placeholder')}
              disabled={isRenaming}
              className='flex-1'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameInput.trim()) {
                  handleConfirm()
                }
              }}
            />
            {fileExtension && (
              <span className='shrink-0 rounded bg-muted px-2 py-1 font-mono text-sm text-muted-foreground'>
                {fileExtension}
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)} disabled={isRenaming}>
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            onClick={handleConfirm}
            disabled={!renameInput.trim()}
            isLoading={isRenaming}
          >
            {t('pages.gallery.renameItem.rename')}
          </ButtonWithLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

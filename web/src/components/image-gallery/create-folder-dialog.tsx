import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { FolderPlus } from 'lucide-react'
import { toast } from 'sonner'

import { createFolder } from '@/api/storage-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

export function CreateFolderDialog({ open, onOpenChange, currentPath }: CreateFolderDialogProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [folderName, setFolderName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!folderName.trim()) {
      setError(t('pages.gallery.createFolder.errors.nameRequired'))
      return
    }

    // Basic validation for folder name
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(folderName)) {
      setError(t('pages.gallery.createFolder.errors.invalidCharacters'))
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Construct the full path for the new folder
      const folderPath = currentPath ? `${currentPath}/${folderName.trim()}` : folderName.trim()

      await createFolder(folderPath)

      // Show success message with folder name
      toast.success(t('pages.gallery.createFolder.success', { folderName: folderName.trim() }))
      onOpenChange(false)
      setFolderName('')
      setError(null)
      await router.invalidate()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('pages.gallery.createFolder.errors.createFailed')
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Reset form when closing
        setFolderName('')
        setError(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FolderPlus className='h-5 w-5' />
            {t('pages.gallery.createFolder.title')}
          </DialogTitle>
          <DialogDescription>{t('pages.gallery.createFolder.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-2'>
            <label htmlFor='folder-name' className='text-sm font-medium'>
              {t('pages.gallery.createFolder.folderName')}
            </label>
            <Input
              id='folder-name'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t('pages.gallery.createFolder.placeholder')}
              disabled={isCreating}
              autoFocus
            />
            {error && <p className='text-destructive text-sm'>{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              {t('common.buttons.cancel')}
            </Button>
            <ButtonWithLoading type='submit' isLoading={isCreating} disabled={!folderName.trim()}>
              {t('common.buttons.create')}
            </ButtonWithLoading>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

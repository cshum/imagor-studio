import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { FolderPlus } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const createFolderSchema = z.object({
  folderName: z
    .string()
    .min(1, 'Folder name is required')
    .refine(
      (name) => !/[<>:"/\\|?*]/.test(name),
      'Folder name contains invalid characters (<>:"/\\|?*)',
    ),
})

type CreateFolderFormData = z.infer<typeof createFolderSchema>

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

export function CreateFolderDialog({ open, onOpenChange, currentPath }: CreateFolderDialogProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const form = useForm<CreateFolderFormData>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      folderName: '',
    },
  })

  const handleSubmit = async (values: CreateFolderFormData) => {
    setIsCreating(true)

    try {
      // Construct the full path for the new folder
      const folderPath = currentPath
        ? `${currentPath}/${values.folderName.trim()}`
        : values.folderName.trim()

      await createFolder(folderPath)

      // Show success message with folder name
      toast.success(
        t('pages.gallery.createFolder.success', { folderName: values.folderName.trim() }),
      )
      onOpenChange(false)
      form.reset()
      await router.invalidate()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('pages.gallery.createFolder.errors.createFailed')

      // Set error on the form field
      form.setError('folderName', { message: errorMessage })
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Reset form when closing
        form.reset()
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='folderName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.gallery.createFolder.folderName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('pages.gallery.createFolder.placeholder')}
                      {...field}
                      disabled={isCreating}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                {t('common.buttons.cancel')}
              </Button>
              <ButtonWithLoading
                type='submit'
                isLoading={isCreating}
                disabled={!form.watch('folderName')?.trim()}
              >
                {t('common.buttons.create')}
              </ButtonWithLoading>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

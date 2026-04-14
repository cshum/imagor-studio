import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from '@tanstack/react-router'
import { FolderPlus } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { createFolder } from '@/api/storage-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'

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
  onFolderCreated?: (folderPath: string) => void
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  currentPath,
  onFolderCreated,
}: CreateFolderDialogProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const { spaceKey } = useParams({ strict: false })

  const form = useForm<CreateFolderFormData>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      folderName: '',
    },
  })

  const handleSubmit = async (values: CreateFolderFormData) => {
    setIsCreating(true)

    try {
      const folderPath = currentPath
        ? `${currentPath}/${values.folderName.trim()}`
        : values.folderName.trim()

      await createFolder(folderPath, spaceKey)

      toast.success(
        t('pages.gallery.createFolder.success', { folderName: values.folderName.trim() }),
      )

      // Notify parent that folder was created
      onFolderCreated?.(folderPath)

      onOpenChange(false)
      form.reset()
      await router.invalidate()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('pages.gallery.createFolder.errors.createFailed')

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
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      contentClassName='sm:max-w-[425px]'
    >
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle className='flex items-center gap-2'>
          <FolderPlus className='h-5 w-5' />
          {t('pages.gallery.createFolder.title')}
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {t('pages.gallery.createFolder.description')}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
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

          <ResponsiveDialogFooter>
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
          </ResponsiveDialogFooter>
        </form>
      </Form>
    </ResponsiveDialog>
  )
}

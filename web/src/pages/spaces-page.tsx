import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { FolderOpen, Plus, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { createSpace, deleteSpace, type SpaceItem } from '@/api/org-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Skeleton } from '@/components/ui/skeleton'
import type { ListSpacesQuery } from '@/generated/graphql'

interface SpacesPageProps {
  loaderData?: ListSpacesQuery['spaces']
}

const createSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase letters, numbers or hyphens'),
  name: z.string().min(1).max(255),
})
type CreateFormData = z.infer<typeof createSchema>

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function SpacesPage({ loaderData }: SpacesPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<SpaceItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const spaces = loaderData ?? []

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { key: '', name: '' },
  })

  const handleCreateSpace = async (values: CreateFormData) => {
    setIsSaving(true)
    try {
      await createSpace({
        input: {
          key: values.key,
          name: values.name,
          storageType: 's3',
          bucket: null,
          region: null,
          endpoint: null,
          prefix: null,
          accessKeyId: null,
          secretKey: null,
          usePathStyle: null,
          customDomain: null,
          isShared: null,
          signerAlgorithm: null,
          signerTruncate: null,
          imagorSecret: null,
        },
      })
      toast.success(t('pages.spaces.messages.spaceCreatedSuccess'))
      setIsCreateDialogOpen(false)
      createForm.reset({ key: '', name: '' })
      // Navigate to the new space's settings page
      await navigate({ to: '/spaces/$spaceKey/settings', params: { spaceKey: values.key } })
    } catch (err) {
      toast.error(`${t('pages.spaces.messages.createSpaceFailed')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSpace = async () => {
    if (!selectedSpace) return
    setIsDeleting(true)
    try {
      await deleteSpace({ key: selectedSpace.key })
      toast.success(t('pages.spaces.messages.spaceDeletedSuccess'))
      setIsDeleteDialogOpen(false)
      setSelectedSpace(null)
      window.location.reload()
    } catch (err) {
      toast.error(`${t('pages.spaces.messages.deleteSpaceFailed')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>{t('pages.spaces.title')}</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              {t('pages.spaces.createSpace')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Desktop table */}
            <div className='hidden rounded-lg border md:block'>
              <div className='bg-muted/50 grid grid-cols-4 gap-4 border-b p-4 font-medium'>
                <div>{t('pages.spaces.tableHeaders.key')}</div>
                <div>{t('pages.spaces.tableHeaders.name')}</div>
                <div>{t('pages.spaces.tableHeaders.storage')}</div>
                <div>{t('pages.spaces.tableHeaders.actions')}</div>
              </div>

              {!loaderData ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className='grid grid-cols-4 gap-4 border-b p-4'>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className='h-4 w-full' />
                    ))}
                  </div>
                ))
              ) : spaces.length === 0 ? (
                <div className='text-muted-foreground p-8 text-center'>
                  {t('pages.spaces.noSpacesFound')}
                </div>
              ) : (
                spaces.map((space) => (
                  <div key={space.key} className='grid grid-cols-4 items-center gap-4 border-b p-4'>
                    <div className='font-mono text-sm font-medium'>{space.key}</div>
                    <div>{space.name}</div>
                    <div>
                      {space.bucket ? (
                        <span className='bg-muted inline-flex items-center rounded px-2 py-0.5 text-xs font-medium'>
                          S3
                        </span>
                      ) : (
                        <span className='text-muted-foreground text-xs'>
                          {t('pages.spaces.storageNotConfigured')}
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
                        <Button variant='outline' size='sm'>
                          <FolderOpen className='mr-1 h-4 w-4' />
                          {t('pages.spaces.openGallery')}
                        </Button>
                      </Link>
                      <Link to='/spaces/$spaceKey/settings' params={{ spaceKey: space.key }}>
                        <Button variant='outline' size='sm'>
                          <Settings className='h-4 w-4' />
                        </Button>
                      </Link>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-destructive'
                        onClick={() => {
                          setSelectedSpace(space)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile cards */}
            <div className='space-y-4 md:hidden'>
              {!loaderData ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className='space-y-3 rounded-lg border p-4'>
                    <Skeleton className='h-5 w-32' />
                    <Skeleton className='h-4 w-48' />
                  </div>
                ))
              ) : spaces.length === 0 ? (
                <div className='text-muted-foreground rounded-lg border p-8 text-center'>
                  {t('pages.spaces.noSpacesFound')}
                </div>
              ) : (
                spaces.map((space) => (
                  <div key={space.key} className='space-y-3 rounded-lg border p-4'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='font-mono text-sm font-medium'>{space.key}</h3>
                        <p className='text-muted-foreground text-sm'>{space.name}</p>
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }} className='flex-1'>
                        <Button variant='outline' size='sm' className='w-full'>
                          <FolderOpen className='mr-1 h-4 w-4' />
                          {t('pages.spaces.openGallery')}
                        </Button>
                      </Link>
                      <Link to='/spaces/$spaceKey/settings' params={{ spaceKey: space.key }}>
                        <Button variant='outline' size='sm'>
                          <Settings className='h-4 w-4' />
                        </Button>
                      </Link>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-destructive'
                        onClick={() => {
                          setSelectedSpace(space)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className='text-muted-foreground text-sm'>
              {t('pages.spaces.spaceCount', { count: spaces.length })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Space dialog — name + key only */}
      <ResponsiveDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.createNewSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.createSpaceDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...createForm}>
          <form onSubmit={createForm.handleSubmit(handleCreateSpace)} className='space-y-4'>
            <FormField
              control={createForm.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.spaces.formLabels.name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('pages.spaces.placeholders.name')}
                      {...field}
                      disabled={isSaving}
                      onChange={(e) => {
                        field.onChange(e)
                        // Auto-populate key from name if user hasn't typed in key
                        const keyValue = createForm.getValues('key')
                        if (!keyValue || keyValue === slugify(field.value)) {
                          createForm.setValue('key', slugify(e.target.value), {
                            shouldValidate: true,
                          })
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={createForm.control}
              name='key'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.spaces.formLabels.key')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='my-space'
                      {...field}
                      disabled={isSaving}
                      className='font-mono'
                    />
                  </FormControl>
                  <FormDescription>{t('pages.spaces.keyDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ResponsiveDialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSaving}
              >
                {t('common.buttons.cancel')}
              </Button>
              <ButtonWithLoading type='submit' isLoading={isSaving}>
                {t('pages.spaces.createSpaceButton')}
              </ButtonWithLoading>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialog>

      {/* Delete confirmation dialog */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.deleteSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.deleteSpaceDescription')} <strong>{selectedSpace?.key}</strong>?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setIsDeleteDialogOpen(false)}
            disabled={isDeleting}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            onClick={handleDeleteSpace}
            isLoading={isDeleting}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.delete')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </div>
  )
}


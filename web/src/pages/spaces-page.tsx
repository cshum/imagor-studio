import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { Edit, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { createSpace, deleteSpace, updateSpace, type SpaceItem } from '@/api/org-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Skeleton } from '@/components/ui/skeleton'
import type { ListSpacesQuery } from '@/generated/graphql'

interface SpacesPageProps {
  loaderData?: ListSpacesQuery['spaces']
}

const spaceSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase letters, numbers or hyphens'),
  name: z.string().min(1).max(255),
  storageType: z.enum(['file', 's3']).optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretKey: z.string().optional(),
  prefix: z.string().optional(),
  customDomain: z.string().optional(),
  signerAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  imagorSecret: z.string().optional(),
})

type SpaceFormData = z.infer<typeof spaceSchema>

function defaultValues(space?: SpaceItem | null): SpaceFormData {
  return {
    key: space?.key ?? '',
    name: space?.name ?? '',
    storageType: (space?.storageType as 'file' | 's3' | undefined) ?? undefined,
    bucket: space?.bucket ?? '',
    region: space?.region ?? '',
    endpoint: space?.endpoint ?? '',
    prefix: space?.prefix ?? '',
    customDomain: space?.customDomain ?? '',
    signerAlgorithm: (space?.signerAlgorithm as 'sha1' | 'sha256' | 'sha512' | undefined) ?? undefined,
    imagorSecret: '',
    accessKeyId: '',
    secretKey: '',
  }
}

export function SpacesPage({ loaderData }: SpacesPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<SpaceItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const spaces = loaderData ?? []

  const createForm = useForm<SpaceFormData>({
    resolver: zodResolver(spaceSchema),
    defaultValues: defaultValues(),
  })

  const editForm = useForm<SpaceFormData>({
    resolver: zodResolver(spaceSchema),
    defaultValues: defaultValues(),
  })

  const handleCreateSpace = async (values: SpaceFormData) => {
    setIsSaving(true)
    try {
      await createSpace({
        input: {
          key: values.key,
          name: values.name,
          storageType: values.storageType ?? null,
          bucket: values.bucket ?? null,
          region: values.region ?? null,
          endpoint: values.endpoint ?? null,
          prefix: values.prefix ?? null,
          accessKeyId: values.accessKeyId ?? null,
          secretKey: values.secretKey ?? null,
          usePathStyle: null,
          customDomain: values.customDomain ?? null,
          isShared: null,
          signerAlgorithm: values.signerAlgorithm ?? null,
          signerTruncate: null,
          imagorSecret: values.imagorSecret ?? null,
        },
      })
      toast.success(t('pages.spaces.messages.spaceCreatedSuccess'))
      setIsCreateDialogOpen(false)
      createForm.reset(defaultValues())
      await router.invalidate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`${t('pages.spaces.messages.createSpaceFailed')}: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateSpace = async (values: SpaceFormData) => {
    if (!selectedSpace) return
    setIsSaving(true)
    try {
      await updateSpace({
        key: selectedSpace.key,
        input: {
          key: values.key,
          name: values.name,
          storageType: values.storageType ?? null,
          bucket: values.bucket ?? null,
          region: values.region ?? null,
          endpoint: values.endpoint ?? null,
          prefix: values.prefix ?? null,
          accessKeyId: values.accessKeyId ?? null,
          // Only send secretKey if the user typed a new one
          secretKey: values.secretKey ? values.secretKey : null,
          usePathStyle: null,
          customDomain: values.customDomain ?? null,
          isShared: null,
          signerAlgorithm: values.signerAlgorithm ?? null,
          signerTruncate: null,
          imagorSecret: values.imagorSecret ? values.imagorSecret : null,
        },
      })
      toast.success(t('pages.spaces.messages.spaceUpdatedSuccess'))
      setIsEditDialogOpen(false)
      setSelectedSpace(null)
      await router.invalidate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`${t('pages.spaces.messages.updateSpaceFailed')}: ${msg}`)
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
      await router.invalidate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`${t('pages.spaces.messages.deleteSpaceFailed')}: ${msg}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditDialog = (space: SpaceItem) => {
    setSelectedSpace(space)
    editForm.reset(defaultValues(space))
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (space: SpaceItem) => {
    setSelectedSpace(space)
    setIsDeleteDialogOpen(true)
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
            {/* Spaces Table — Desktop */}
            <div className='hidden rounded-lg border md:block'>
              <div className='bg-muted/50 grid grid-cols-5 gap-4 border-b p-4 font-medium'>
                <div>{t('pages.spaces.tableHeaders.key')}</div>
                <div>{t('pages.spaces.tableHeaders.name')}</div>
                <div>{t('pages.spaces.tableHeaders.storageType')}</div>
                <div>{t('pages.spaces.tableHeaders.customDomain')}</div>
                <div>{t('pages.spaces.tableHeaders.actions')}</div>
              </div>

              {!loaderData ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className='grid grid-cols-5 gap-4 border-b p-4'>
                    {Array.from({ length: 5 }).map((_, j) => (
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
                  <div key={space.key} className='grid grid-cols-5 items-center gap-4 border-b p-4'>
                    <div className='font-mono text-sm font-medium'>{space.key}</div>
                    <div>{space.name}</div>
                    <div>
                      <span className='bg-muted inline-flex items-center rounded px-2 py-0.5 text-xs font-medium'>
                        {space.storageType}
                      </span>
                    </div>
                    <div className='text-muted-foreground truncate text-sm'>
                      {space.customDomain || '—'}
                    </div>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => openEditDialog(space)}>
                            <Edit className='mr-2 h-4 w-4' />
                            {t('common.buttons.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-destructive'
                            onClick={() => openDeleteDialog(space)}
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            {t('common.buttons.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Spaces Cards — Mobile */}
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
                  <div key={space.key} className='space-y-2 rounded-lg border p-4'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='font-mono text-sm font-medium'>{space.key}</h3>
                        <p className='text-muted-foreground text-sm'>{space.name}</p>
                      </div>
                      <div className='flex gap-2'>
                        <Button variant='outline' size='sm' onClick={() => openEditDialog(space)}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='text-destructive'
                          onClick={() => openDeleteDialog(space)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                    {space.customDomain && (
                      <p className='text-muted-foreground text-xs'>{space.customDomain}</p>
                    )}
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

      {/* Create / Edit Space Form — shared component */}
      <SpaceFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        form={createForm}
        onSubmit={handleCreateSpace}
        isSaving={isSaving}
        isEdit={false}
      />
      <SpaceFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        form={editForm}
        onSubmit={handleUpdateSpace}
        isSaving={isSaving}
        isEdit={true}
      />

      {/* Delete confirmation */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.deleteSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.deleteSpaceDescription')}{' '}
            <strong>{selectedSpace?.key}</strong>?
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

// ---------------------------------------------------------------------------
// Shared space form dialog used for both create and edit
// ---------------------------------------------------------------------------

interface SpaceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: ReturnType<typeof useForm<SpaceFormData>>
  onSubmit: (values: SpaceFormData) => Promise<void>
  isSaving: boolean
  isEdit: boolean
}

function SpaceFormDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isSaving,
  isEdit,
}: SpaceFormDialogProps) {
  const { t } = useTranslation()

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>
          {isEdit ? t('pages.spaces.editSpace') : t('pages.spaces.createNewSpace')}
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {isEdit ? t('pages.spaces.editSpaceDescription') : t('pages.spaces.createSpaceDescription')}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          {/* Key — only editable on create */}
          <FormField
            control={form.control}
            name='key'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.spaces.formLabels.key')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='my-space'
                    {...field}
                    disabled={isSaving || isEdit}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.spaces.formLabels.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('pages.spaces.placeholders.name')} {...field} disabled={isSaving} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='storageType'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.spaces.formLabels.storageType')}</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? ''}
                    disabled={isSaving}
                    className='border-input bg-background w-full rounded-md border p-2'
                  >
                    <option value=''>{t('pages.spaces.placeholders.selectStorageType')}</option>
                    <option value='file'>file</option>
                    <option value='s3'>s3</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='bucket'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.spaces.formLabels.bucket')}</FormLabel>
                  <FormControl>
                    <Input placeholder='my-bucket' {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='region'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.spaces.formLabels.region')}</FormLabel>
                  <FormControl>
                    <Input placeholder='us-east-1' {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='endpoint'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.spaces.formLabels.endpoint')}</FormLabel>
                <FormControl>
                  <Input placeholder='https://…' {...field} disabled={isSaving} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='prefix'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.spaces.formLabels.prefix')}</FormLabel>
                <FormControl>
                  <Input placeholder='gallery/' {...field} disabled={isSaving} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='accessKeyId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.spaces.formLabels.accessKeyId')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isEdit ? t('pages.spaces.placeholders.unchanged') : ''}
                      {...field}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='secretKey'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.spaces.formLabels.secretKey')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={isEdit ? t('pages.spaces.placeholders.unchanged') : ''}
                      {...field}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='customDomain'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.spaces.formLabels.customDomain')}</FormLabel>
                <FormControl>
                  <Input placeholder='space.example.com' {...field} disabled={isSaving} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='imagorSecret'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.spaces.formLabels.imagorSecret')}</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder={isEdit ? t('pages.spaces.placeholders.unchanged') : ''}
                    {...field}
                    disabled={isSaving}
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
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {t('common.buttons.cancel')}
            </Button>
            <ButtonWithLoading type='submit' isLoading={isSaving}>
              {isEdit ? t('pages.spaces.updateSpaceButton') : t('pages.spaces.createSpaceButton')}
            </ButtonWithLoading>
          </ResponsiveDialogFooter>
        </form>
      </Form>
    </ResponsiveDialog>
  )
}

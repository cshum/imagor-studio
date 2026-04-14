import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Database,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { createSpace, deleteSpace, type SpaceItem } from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { ListSpacesQuery } from '@/generated/graphql'

interface SpacesPageProps {
  loaderData?: ListSpacesQuery['spaces']
}

const createSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, 'Key must be lowercase letters, numbers or hyphens'),
    name: z.string().min(1).max(255),
    storageType: z.enum(['managed', 's3']),
    bucket: z.string().optional(),
    region: z.string().optional(),
    endpoint: z.string().optional(),
    prefix: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretKey: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.storageType === 's3') {
      if (!data.bucket?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bucket is required', path: ['bucket'] })
      }
      if (!data.region?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Region is required', path: ['region'] })
      }
    }
  })

type CreateFormData = z.infer<typeof createSchema>

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const

function avatarColor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function spaceInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function SpacesPage({ loaderData }: SpacesPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<SpaceItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)

  const spaces = loaderData ?? []

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { key: '', name: '', storageType: 'managed' },
  })

  const selectedStorageType = useWatch({ control: createForm.control, name: 'storageType' })
  const isByob = selectedStorageType === 's3'

  const handleOpenCreate = () => {
    createForm.reset({ key: '', name: '', storageType: 'managed' })
    setCreateStep(1)
    setIsCreateOpen(true)
  }

  const handleNextStep = async () => {
    const valid = await createForm.trigger(['name', 'key'])
    if (valid) setCreateStep(2)
  }

  const handleCreateSpace = async (values: CreateFormData) => {
    setIsSaving(true)
    const isS3 = values.storageType === 's3'
    try {
      await createSpace({
        input: {
          key: values.key,
          name: values.name,
          storageType: values.storageType,
          bucket: isS3 ? (values.bucket ?? null) : null,
          region: isS3 ? (values.region ?? null) : null,
          endpoint: isS3 ? (values.endpoint ?? null) : null,
          prefix: isS3 ? (values.prefix ?? null) : null,
          accessKeyId: isS3 ? (values.accessKeyId ?? null) : null,
          secretKey: isS3 ? (values.secretKey ?? null) : null,
          usePathStyle: null,
          customDomain: null,
          isShared: null,
          signerAlgorithm: null,
          signerTruncate: null,
          imagorSecret: null,
        },
      })
      toast.success(t('pages.spaces.messages.spaceCreatedSuccess'))
      setIsCreateOpen(false)
      createForm.reset()
      await navigate({ to: '/spaces/$spaceKey/settings', params: { spaceKey: values.key } })
    } catch (err) {
      toast.error(
        `${t('pages.spaces.messages.createSpaceFailed')}: ${err instanceof Error ? err.message : String(err)}`,
      )
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
      setIsDeleteOpen(false)
      setSelectedSpace(null)
      window.location.reload()
    } catch (err) {
      toast.error(
        `${t('pages.spaces.messages.deleteSpaceFailed')}: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Page header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight'>{t('pages.spaces.title')}</h2>
          <p className='text-muted-foreground mt-1 text-sm'>{t('pages.spaces.description')}</p>
        </div>
        <Button onClick={handleOpenCreate} className='shrink-0'>
          <Plus className='mr-2 h-4 w-4' />
          {t('pages.spaces.createSpace')}
        </Button>
      </div>

      {/* Loading skeleton */}
      {!loaderData ? (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='space-y-4 rounded-xl border p-5'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-10 w-10 rounded-lg' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-3 w-20' />
                </div>
              </div>
              <div className='flex gap-2'>
                <Skeleton className='h-5 w-20 rounded-full' />
                <Skeleton className='h-5 w-16 rounded-full' />
              </div>
              <Skeleton className='h-9 w-full rounded-md' />
            </div>
          ))}
        </div>
      ) : spaces.length === 0 ? (
        /* Empty state */
        <div className='flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center'>
          <div className='bg-muted flex h-14 w-14 items-center justify-center rounded-full'>
            <LayoutGrid className='text-muted-foreground h-7 w-7' />
          </div>
          <h3 className='mt-4 text-base font-semibold'>{t('pages.spaces.noSpacesFound')}</h3>
          <p className='text-muted-foreground mt-1.5 max-w-xs text-sm'>
            {t('pages.spaces.emptyDescription')}
          </p>
          <Button onClick={handleOpenCreate} className='mt-6'>
            <Plus className='mr-2 h-4 w-4' />
            {t('pages.spaces.createSpace')}
          </Button>
        </div>
      ) : (
        /* Card grid */
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {spaces.map((space) => {
            const color = avatarColor(space.key)
            const initials = spaceInitials(space.name)
            return (
              <div
                key={space.key}
                className='group relative flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:shadow-md'
              >
                {/* Card header row */}
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${color}`}
                    >
                      {initials}
                    </div>
                    <div className='min-w-0'>
                      <p className='truncate font-semibold leading-tight'>{space.name}</p>
                      <p className='text-muted-foreground truncate font-mono text-xs'>{space.key}</p>
                    </div>
                  </div>

                  {/* Kebab menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100'
                        aria-label='Space actions'
                      >
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem asChild>
                        <Link to='/spaces/$spaceKey/settings' params={{ spaceKey: space.key }}>
                          <Settings className='mr-2 h-4 w-4' />
                          {t('pages.spaces.settings')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        onClick={() => {
                          setSelectedSpace(space)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        {t('pages.spaces.deleteSpace')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges */}
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Badge
                    variant={space.storageType === 's3' ? 'outline' : 'secondary'}
                    className={
                      space.storageType === 's3'
                        ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                        : ''
                    }
                  >
                    {space.storageType === 's3' ? (
                      <Database className='mr-1 h-3 w-3' />
                    ) : (
                      <Cloud className='mr-1 h-3 w-3' />
                    )}
                    {t(`pages.spaces.storageType.${space.storageType}`)}
                  </Badge>
                </div>

                {/* Action buttons */}
                <div className='mt-4 flex gap-2'>
                  <Button variant='outline' size='sm' className='flex-1' asChild>
                    <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
                      <FolderOpen className='mr-1.5 h-4 w-4' />
                      {t('pages.spaces.openGallery')}
                    </Link>
                  </Button>
                  <Button variant='outline' size='sm' asChild title={t('pages.spaces.settings')}>
                    <Link to='/spaces/$spaceKey/settings' params={{ spaceKey: space.key }}>
                      <Settings className='h-4 w-4' />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Space count footer */}
      {loaderData && spaces.length > 0 && (
        <p className='text-muted-foreground text-sm'>
          {t('pages.spaces.spaceCount', { count: spaces.length })}
        </p>
      )}

      {/* Create Space dialog — 2-step wizard */}
      <ResponsiveDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateStep(1)
            createForm.reset()
          }
          setIsCreateOpen(open)
        }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.createNewSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.createSpaceDescription')}
          </ResponsiveDialogDescription>
          {/* Step indicator */}
          <div className='mt-3 flex items-center gap-1.5 text-xs'>
            <span
              className={
                createStep === 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }
            >
              1. {t('pages.spaces.wizard.stepIdentity')}
            </span>
            <ArrowRight className='text-muted-foreground h-3 w-3 shrink-0' />
            <span
              className={
                createStep === 2 ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }
            >
              2. {t('pages.spaces.wizard.stepStorage')}
            </span>
          </div>
        </ResponsiveDialogHeader>

        <Form {...createForm}>
          <form onSubmit={createForm.handleSubmit(handleCreateSpace)} className='space-y-4'>
            {createStep === 1 ? (
              <>
                {/* Step 1: Identity */}
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
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isSaving}
                  >
                    {t('common.buttons.cancel')}
                  </Button>
                  <Button type='button' onClick={handleNextStep}>
                    {t('pages.spaces.wizard.next')}
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </ResponsiveDialogFooter>
              </>
            ) : (
              <>
                {/* Step 2: Storage type */}
                <FormField
                  control={createForm.control}
                  name='storageType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pages.spaces.storageTypeLabel')}</FormLabel>
                      <div className='grid grid-cols-2 gap-3'>
                        {(['managed', 's3'] as const).map((type) => {
                          const isSelected = field.value === type
                          return (
                            <button
                              key={type}
                              type='button'
                              disabled={isSaving}
                              onClick={() => field.onChange(type)}
                              className={[
                                'relative rounded-lg border p-4 text-left transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                  : 'border-border hover:bg-muted/50',
                              ].join(' ')}
                            >
                              {isSelected && (
                                <CheckCircle2 className='text-primary absolute top-2 right-2 h-4 w-4' />
                              )}
                              <div className='mb-2'>
                                {type === 'managed' ? (
                                  <Cloud className='text-primary h-5 w-5' />
                                ) : (
                                  <Database className='h-5 w-5 text-amber-500' />
                                )}
                              </div>
                              <p className='text-sm font-medium'>
                                {t(`pages.spaces.storageType.${type}`)}
                              </p>
                              <p className='text-muted-foreground mt-1 text-xs'>
                                {t(`pages.spaces.storageTypeDesc.${type}`)}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* BYOB S3 fields — only visible when S3 selected */}
                {isByob && (
                  <>
                    <Separator />
                    <div className='grid grid-cols-2 gap-4'>
                      <FormField
                        control={createForm.control}
                        name='bucket'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('pages.spaceSettings.storage.bucket')} *</FormLabel>
                            <FormControl>
                              <Input placeholder='my-bucket' {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name='region'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('pages.spaceSettings.storage.region')} *</FormLabel>
                            <FormControl>
                              <Input placeholder='us-east-1' {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={createForm.control}
                      name='endpoint'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('pages.spaceSettings.storage.endpoint')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='https://s3.amazonaws.com'
                              {...field}
                              disabled={isSaving}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('pages.spaceSettings.storage.endpointDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name='prefix'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('pages.spaceSettings.storage.prefix')}</FormLabel>
                          <FormControl>
                            <Input placeholder='media/' {...field} disabled={isSaving} />
                          </FormControl>
                          <FormDescription>
                            {t('pages.spaceSettings.storage.prefixDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className='grid grid-cols-2 gap-4'>
                      <FormField
                        control={createForm.control}
                        name='accessKeyId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('pages.spaceSettings.storage.accessKeyId')}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name='secretKey'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('pages.spaceSettings.storage.secretKey')}</FormLabel>
                            <FormControl>
                              <Input type='password' {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                <ResponsiveDialogFooter>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setCreateStep(1)}
                    disabled={isSaving}
                  >
                    {t('pages.spaces.wizard.back')}
                  </Button>
                  <ButtonWithLoading type='submit' isLoading={isSaving}>
                    {t('pages.spaces.createSpaceButton')}
                  </ButtonWithLoading>
                </ResponsiveDialogFooter>
              </>
            )}
          </form>
        </Form>
      </ResponsiveDialog>

      {/* Delete confirmation dialog */}
      <ResponsiveDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.deleteSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.deleteSpaceDescription')}{' '}
            <strong className='text-foreground'>{selectedSpace?.key}</strong>?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setIsDeleteOpen(false)}
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

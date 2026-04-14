import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Database, FolderOpen, Settings } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { deleteSpace, updateSpace } from '@/api/org-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { GetSpaceQuery } from '@/generated/graphql'

export type SpaceSettingsData = NonNullable<GetSpaceQuery['space']>

interface SpaceSettingsPageProps {
  loaderData: SpaceSettingsData
}

// ── General section ──────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1).max(255),
  customDomain: z.string().optional(),
})
type GeneralFormData = z.infer<typeof generalSchema>

// ── BYOB Storage section (credentials rotation only) ─────────────────────────

const storageSchema = z.object({
  endpoint: z.string().optional(),
  prefix: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretKey: z.string().optional(),
})
type StorageFormData = z.infer<typeof storageSchema>

// ── Image Processing section ─────────────────────────────────────────────────

const imageProcessingSchema = z.object({
  imagorSecret: z.string().optional(),
  signerAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  signerTruncate: z.number().int().min(0).optional(),
})
type ImageProcessingFormData = z.infer<typeof imageProcessingSchema>

// ── Page component ───────────────────────────────────────────────────────────

export function SpaceSettingsPage({ loaderData: space }: SpaceSettingsPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // BYOB = user provided their own S3 bucket at creation time
  const isByob = space.storageType === 's3'

  // -- General form ----------------------------------------------------------
  const generalForm = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: space.name ?? '',
      customDomain: space.customDomain ?? '',
    },
  })
  const [isSavingGeneral, setIsSavingGeneral] = useState(false)

  const handleSaveGeneral = async (values: GeneralFormData) => {
    setIsSavingGeneral(true)
    try {
      await updateSpace({
        key: space.key,
        input: {
          key: space.key,
          name: values.name,
          customDomain: values.customDomain ?? null,
          storageType: null,
          bucket: null,
          region: null,
          endpoint: null,
          prefix: null,
          accessKeyId: null,
          secretKey: null,
          usePathStyle: null,
          isShared: null,
          signerAlgorithm: null,
          signerTruncate: null,
          imagorSecret: null,
        },
      })
      toast.success(t('pages.spaceSettings.general.saved'))
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingGeneral(false)
    }
  }

  // -- BYOB Storage form (credentials + endpoint + prefix rotation) ----------
  const storageForm = useForm<StorageFormData>({
    resolver: zodResolver(storageSchema),
    defaultValues: {
      endpoint: space.endpoint ?? '',
      prefix: space.prefix ?? '',
      accessKeyId: '',
      secretKey: '',
    },
  })
  const [isSavingStorage, setIsSavingStorage] = useState(false)

  const handleSaveStorage = async (values: StorageFormData) => {
    setIsSavingStorage(true)
    try {
      await updateSpace({
        key: space.key,
        input: {
          key: space.key,
          name: space.name,
          storageType: null,
          bucket: null, // bucket is locked after creation
          region: null, // region is locked after creation
          endpoint: values.endpoint ?? null,
          prefix: values.prefix ?? null,
          accessKeyId: values.accessKeyId ?? null,
          secretKey: values.secretKey || null, // blank = keep existing
          usePathStyle: null,
          customDomain: null,
          isShared: null,
          signerAlgorithm: null,
          signerTruncate: null,
          imagorSecret: null,
        },
      })
      toast.success(t('pages.spaceSettings.storage.saved'))
      storageForm.setValue('accessKeyId', '')
      storageForm.setValue('secretKey', '')
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingStorage(false)
    }
  }

  // -- Image Processing form -------------------------------------------------
  const imageProcessingForm = useForm<ImageProcessingFormData>({
    resolver: zodResolver(imageProcessingSchema),
    defaultValues: {
      imagorSecret: '',
      signerAlgorithm: (space.signerAlgorithm as 'sha1' | 'sha256' | 'sha512') || 'sha256',
      signerTruncate: space.signerTruncate ?? 0,
    },
  })
  const [isSavingImageProcessing, setIsSavingImageProcessing] = useState(false)

  const handleSaveImageProcessing = async (values: ImageProcessingFormData) => {
    setIsSavingImageProcessing(true)
    try {
      await updateSpace({
        key: space.key,
        input: {
          key: space.key,
          name: space.name,
          storageType: null,
          bucket: null,
          region: null,
          endpoint: null,
          prefix: null,
          accessKeyId: null,
          secretKey: null,
          usePathStyle: null,
          customDomain: null,
          isShared: null,
          signerAlgorithm: values.signerAlgorithm ?? null,
          signerTruncate: values.signerTruncate ?? null,
          imagorSecret: values.imagorSecret || null, // blank = keep existing
        },
      })
      toast.success(t('pages.spaceSettings.imageProcessing.saved'))
      imageProcessingForm.setValue('imagorSecret', '')
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingImageProcessing(false)
    }
  }

  // -- Delete ----------------------------------------------------------------
  const handleDeleteSpace = async () => {
    setIsDeleting(true)
    try {
      await deleteSpace({ key: space.key })
      toast.success(t('pages.spaces.messages.spaceDeletedSuccess'))
      await navigate({ to: '/account/spaces' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header with back + open gallery links */}
      <div className='flex items-center gap-3'>
        <Link to='/account/spaces'>
          <Button variant='ghost' size='sm'>
            <ArrowLeft className='mr-1 h-4 w-4' />
            {t('pages.spaceSettings.backToSpaces')}
          </Button>
        </Link>
        <Separator orientation='vertical' className='h-4' />
        <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
          <Button variant='ghost' size='sm'>
            <FolderOpen className='mr-1 h-4 w-4' />
            {t('pages.spaceSettings.openGallery')}
          </Button>
        </Link>
      </div>

      <div className='flex items-center gap-2'>
        <Settings className='text-muted-foreground h-5 w-5' />
        <h1 className='text-2xl font-semibold'>
          {space.name}
          <span className='text-muted-foreground ml-2 font-mono text-base font-normal'>
            {space.key}
          </span>
        </h1>
      </div>

      {/* ── General ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.spaceSettings.sections.general')}</CardTitle>
          <CardDescription>{t('pages.spaceSettings.general.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...generalForm}>
            <form onSubmit={generalForm.handleSubmit(handleSaveGeneral)} className='space-y-4'>
              <FormField
                control={generalForm.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.spaceSettings.general.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSavingGeneral} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={generalForm.control}
                name='customDomain'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.spaceSettings.general.customDomain')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='images.example.com'
                        {...field}
                        disabled={isSavingGeneral}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('pages.spaceSettings.general.customDomainDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex justify-end'>
                <ButtonWithLoading type='submit' isLoading={isSavingGeneral}>
                  {t('common.buttons.save')}
                </ButtonWithLoading>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Storage ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.spaceSettings.sections.storage')}</CardTitle>
          <CardDescription>{t('pages.spaceSettings.storage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isByob ? (
            /* Platform-managed: read-only info */
            <div className='bg-muted/50 flex items-start gap-3 rounded-lg border p-4'>
              <Database className='text-muted-foreground mt-0.5 h-5 w-5 shrink-0' />
              <div className='space-y-1'>
                <p className='text-sm font-medium'>
                  {t('pages.spaceSettings.storage.managedTitle')}
                </p>
                <p className='text-muted-foreground text-sm'>
                  {t('pages.spaceSettings.storage.managedDescription')}
                </p>
              </div>
            </div>
          ) : (
            /* BYOB: show bucket/region as locked, allow credential rotation */
            <>
              <div className='bg-muted/30 mb-4 rounded-lg border p-3'>
                <p className='text-sm'>
                  <span className='text-muted-foreground font-medium'>
                    {t('pages.spaceSettings.storage.bucket')}:
                  </span>{' '}
                  <span className='font-mono text-sm'>{space.bucket}</span>
                  {space.region && (
                    <>
                      <span className='text-muted-foreground mx-2'>·</span>
                      <span className='text-muted-foreground font-medium'>
                        {t('pages.spaceSettings.storage.region')}:
                      </span>{' '}
                      <span className='font-mono text-sm'>{space.region}</span>
                    </>
                  )}
                </p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {t('pages.spaceSettings.storage.bucketLocked')}
                </p>
              </div>
              <Form {...storageForm}>
                <form onSubmit={storageForm.handleSubmit(handleSaveStorage)} className='space-y-4'>
                  <FormField
                    control={storageForm.control}
                    name='endpoint'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.spaceSettings.storage.endpoint')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://s3.amazonaws.com'
                            {...field}
                            disabled={isSavingStorage}
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
                    control={storageForm.control}
                    name='prefix'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.spaceSettings.storage.prefix')}</FormLabel>
                        <FormControl>
                          <Input placeholder='media/' {...field} disabled={isSavingStorage} />
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
                      control={storageForm.control}
                      name='accessKeyId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('pages.spaceSettings.storage.accessKeyId')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                              {...field}
                              disabled={isSavingStorage}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={storageForm.control}
                      name='secretKey'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('pages.spaceSettings.storage.secretKey')}</FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                              {...field}
                              disabled={isSavingStorage}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className='flex justify-end'>
                    <ButtonWithLoading type='submit' isLoading={isSavingStorage}>
                      {t('common.buttons.save')}
                    </ButtonWithLoading>
                  </div>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Image Processing ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.spaceSettings.sections.imageProcessing')}</CardTitle>
          <CardDescription>{t('pages.spaceSettings.imageProcessing.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...imageProcessingForm}>
            <form
              onSubmit={imageProcessingForm.handleSubmit(handleSaveImageProcessing)}
              className='space-y-4'
            >
              <FormField
                control={imageProcessingForm.control}
                name='imagorSecret'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.spaceSettings.imageProcessing.imagorSecret')}</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                        {...field}
                        disabled={isSavingImageProcessing}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('pages.spaceSettings.imageProcessing.imagorSecretDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={imageProcessingForm.control}
                  name='signerAlgorithm'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('pages.spaceSettings.imageProcessing.signerAlgorithm')}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? 'sha256'}
                        disabled={isSavingImageProcessing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='sha1'>SHA-1</SelectItem>
                          <SelectItem value='sha256'>SHA-256</SelectItem>
                          <SelectItem value='sha512'>SHA-512</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={imageProcessingForm.control}
                  name='signerTruncate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('pages.spaceSettings.imageProcessing.signerTruncate')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='0'
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(
                              isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber,
                            )
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          disabled={isSavingImageProcessing}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('pages.spaceSettings.imageProcessing.signerTruncateDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='flex justify-end'>
                <ButtonWithLoading type='submit' isLoading={isSavingImageProcessing}>
                  {t('common.buttons.save')}
                </ButtonWithLoading>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <Card className='border-destructive/50'>
        <CardHeader>
          <CardTitle className='text-destructive flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5' />
            {t('pages.spaceSettings.sections.dangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between rounded-lg border p-4'>
            <div>
              <p className='font-medium'>{t('pages.spaceSettings.danger.deleteTitle')}</p>
              <p className='text-muted-foreground text-sm'>
                {t('pages.spaceSettings.danger.deleteDescription')}
              </p>
            </div>
            <Button variant='destructive' onClick={() => setIsDeleteDialogOpen(true)}>
              {t('pages.spaceSettings.danger.deleteButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.deleteSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.deleteSpaceDescription')} <strong>{space.key}</strong>?
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

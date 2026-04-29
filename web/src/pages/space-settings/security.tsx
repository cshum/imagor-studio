import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { setSpaceRegistryObject, updateSpace } from '@/api/org-api'
import { ImagorUrlSigningDescription } from '@/components/imagor/imagor-url-signing-description'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
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
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
import type { UpdateSpaceMutationVariables } from '@/generated/graphql'
import { copyToClipboard } from '@/lib/browser-utils'
import { rememberSpacePropagationNotice } from '@/lib/space-propagation'

import type { SpaceSettingsData } from './shared'

// ── Security section ───────────────────────────────────────────────────────

interface SecuritySectionProps {
  space: SpaceSettingsData
  initialValues: Record<string, string>
}

const settingsSchema = z.object({
  imagorCORSOrigins: z.string().optional(),
})

type SettingsFormData = z.infer<typeof settingsSchema>
type SignerType = 'SHA1' | 'SHA256' | 'SHA512'

function normalizeSignerType(value: string | null | undefined): SignerType {
  const normalized = value?.toUpperCase() ?? 'SHA256'
  if (normalized === 'SHA1' || normalized === 'SHA256' || normalized === 'SHA512') {
    return normalized
  }
  return 'SHA256'
}

function generateUrlSigningSecret(): string {
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function SecuritySection({ space, initialValues }: SecuritySectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const hasCustomImagorSecret = space.hasCustomImagorSecret
  const [secretDialogOpen, setSecretDialogOpen] = useState(false)
  const [confirmResetDialogOpen, setConfirmResetDialogOpen] = useState(false)
  const [hasGeneratedSecret, setHasGeneratedSecret] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [isResettingSecret, setIsResettingSecret] = useState(false)
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      imagorCORSOrigins: space.imagorCORSOrigins ?? '',
    },
  })
  const secretSchema = z
    .object({
      imagorSecret: z.string().trim(),
      signerType: z.enum(['SHA1', 'SHA256', 'SHA512']),
      signerTruncate: z.number().int().min(0),
    })
    .superRefine((values, ctx) => {
      if (!hasCustomImagorSecret && values.imagorSecret.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('pages.spaceSettings.imagor.customSecretRequired'),
          path: ['imagorSecret'],
        })
      }
    })
  const secretForm = useForm<{
    imagorSecret: string
    signerType: SignerType
    signerTruncate: number
  }>({
    resolver: zodResolver(secretSchema),
    defaultValues: {
      imagorSecret: '',
      signerType: normalizeSignerType(space.signerAlgorithm),
      signerTruncate: space.signerTruncate ?? 32,
    },
  })

  const mediaSettings: SystemSetting[] = [
    {
      key: 'config.app_video_thumbnail_position',
      type: 'select',
      label: t('pages.admin.systemSettings.fields.videoThumbnailPosition.label'),
      description: t('pages.admin.systemSettings.fields.videoThumbnailPosition.description'),
      defaultValue: 'first_frame',
      options: ['first_frame', 'seek_1s', 'seek_3s', 'seek_5s', 'seek_10pct', 'seek_25pct'],
      optionLabels: {
        first_frame: t(
          'pages.admin.systemSettings.fields.videoThumbnailPosition.options.firstFrame',
        ),
        seek_1s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek1s'),
        seek_3s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek3s'),
        seek_5s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek5s'),
        seek_10pct: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek10pct'),
        seek_25pct: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek25pct'),
      },
    },
  ]

  const saveImagorSettings = async ({
    signerAlgorithm,
    signerTruncate,
    imagorCORSOrigins,
    imagorSecret,
  }: {
    signerAlgorithm?: string
    signerTruncate?: number | null
    imagorCORSOrigins?: string
    imagorSecret?: string
  }) => {
    const input = {
      key: space.key,
      name: space.name,
      storageMode: null,
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
      ...(signerAlgorithm !== undefined ? { signerAlgorithm } : {}),
      ...(signerTruncate !== undefined ? { signerTruncate } : {}),
      ...(imagorSecret !== undefined ? { imagorSecret } : {}),
      ...(imagorCORSOrigins !== undefined ? { imagorCORSOrigins } : {}),
    } as UpdateSpaceMutationVariables['input']

    await updateSpace({
      key: space.key,
      input,
    })
  }

  const handleSave = async (values: SettingsFormData) => {
    await saveImagorSettings({
      imagorCORSOrigins: values.imagorCORSOrigins?.trim() ?? '',
    })

    rememberSpacePropagationNotice({
      action: 'updated',
      savedAt: Date.now(),
      spaceKey: space.key,
    })

    toast.success(t('pages.spaceSettings.imagor.saved'))
    await router.invalidate()
  }

  const handleOpenSecretDialog = () => {
    secretForm.reset({
      imagorSecret: '',
      signerType: normalizeSignerType(space.signerAlgorithm),
      signerTruncate: space.signerTruncate ?? 32,
    })
    setHasGeneratedSecret(false)
    setShowSecret(false)
    setSecretDialogOpen(true)
  }

  const handleSaveCustomSecret = async (values: {
    imagorSecret: string
    signerType: SignerType
    signerTruncate: number
  }) => {
    const nextSecret = values.imagorSecret.trim()

    await saveImagorSettings({
      imagorSecret: nextSecret === '' && hasCustomImagorSecret ? undefined : nextSecret,
      signerAlgorithm: values.signerType.toLowerCase(),
      signerTruncate: values.signerTruncate ?? null,
    })

    rememberSpacePropagationNotice({
      action: 'updated',
      savedAt: Date.now(),
      spaceKey: space.key,
    })

    toast.success(t('pages.spaceSettings.imagor.customSecretSaved'))
    secretForm.reset({
      imagorSecret: '',
      signerType: values.signerType,
      signerTruncate: values.signerTruncate,
    })
    setHasGeneratedSecret(false)
    setShowSecret(false)
    setSecretDialogOpen(false)
    await router.invalidate()
  }

  const handleUseWorkspaceDefault = async () => {
    setIsResettingSecret(true)
    try {
      await saveImagorSettings({ imagorSecret: '' })

      rememberSpacePropagationNotice({
        action: 'updated',
        savedAt: Date.now(),
        spaceKey: space.key,
      })

      toast.success(t('pages.spaceSettings.imagor.workspaceDefaultRestored'))
      setConfirmResetDialogOpen(false)
      await router.invalidate()
    } finally {
      setIsResettingSecret(false)
    }
  }

  const handleGenerateSecret = () => {
    secretForm.setValue('imagorSecret', generateUrlSigningSecret(), {
      shouldDirty: true,
      shouldValidate: true,
    })
    setHasGeneratedSecret(true)
    setShowSecret(true)
  }

  const handleCopySecret = async () => {
    const secret = secretForm.getValues('imagorSecret').trim()
    if (!secret) {
      return
    }

    const copied = await copyToClipboard(secret)
    if (copied) {
      setHasGeneratedSecret(false)
      toast.success(t('pages.spaceSettings.imagor.secretCopied'))
    } else {
      toast.error(t('pages.spaceSettings.imagor.secretCopyFailed'))
    }
  }

  const signerTypeLabel = t(
    `pages.spaceSettings.imagor.${
      normalizeSignerType(space.signerAlgorithm) === 'SHA1'
        ? 'algorithmSha1'
        : normalizeSignerType(space.signerAlgorithm) === 'SHA512'
          ? 'algorithmSha512'
          : 'algorithmSha256'
    }`,
  )

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <SettingsSection
            title={t('pages.spaceSettings.imagor.urlSigning')}
            description={<ImagorUrlSigningDescription />}
            className='mb-8'
          >
            <SettingRow
              label={t('pages.spaceSettings.imagor.urlSigningSecret')}
              description={
                hasCustomImagorSecret
                  ? t('pages.spaceSettings.imagor.customSecretConfiguredDescription')
                  : t('pages.spaceSettings.imagor.workspaceDefaultDescription')
              }
            >
              <div className='flex justify-end gap-2'>
                {hasCustomImagorSecret && (
                  <ButtonWithLoading
                    type='button'
                    variant='outline'
                    isLoading={isResettingSecret}
                    onClick={() => setConfirmResetDialogOpen(true)}
                  >
                    {t('pages.spaceSettings.imagor.useWorkspaceDefault')}
                  </ButtonWithLoading>
                )}
                <Button type='button' variant='outline' onClick={handleOpenSecretDialog}>
                  {hasCustomImagorSecret
                    ? t('pages.spaceSettings.imagor.replaceCustomSecret')
                    : t('pages.spaceSettings.imagor.setCustomSecret')}
                </Button>
              </div>
            </SettingRow>
            {hasCustomImagorSecret && (
              <>
                <SettingRow
                  label={t('pages.spaceSettings.imagor.signerAlgorithm')}
                  description={t('pages.spaceSettings.imagor.signerAlgorithmPreviewDescription')}
                  contentClassName='flex justify-end'
                >
                  <div className='text-right text-sm'>{signerTypeLabel}</div>
                </SettingRow>

                <SettingRow
                  label={t('pages.spaceSettings.imagor.signerTruncate')}
                  description={t('pages.spaceSettings.imagor.signerTruncatePreviewDescription')}
                  contentClassName='flex justify-end'
                  last
                >
                  <div className='text-right text-sm'>{String(space.signerTruncate ?? 32)}</div>
                </SettingRow>
              </>
            )}
          </SettingsSection>

          <SettingsSection
            title={t('pages.spaceSettings.imagor.corsOrigins')}
            description={t('pages.spaceSettings.imagor.corsOriginsDescription')}
          >
            <FormField
              control={form.control}
              name='imagorCORSOrigins'
              render={({ field }) => (
                <FormItem>
                  <SettingRow description={t('pages.spaceSettings.imagor.corsOriginsHelp')} last>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('pages.spaceSettings.imagor.corsOriginsPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />
          </SettingsSection>

          <div className='mt-2 flex justify-end pt-2'>
            <ButtonWithLoading type='submit' isLoading={form.formState.isSubmitting}>
              {t('common.buttons.save')}
            </ButtonWithLoading>
          </div>
        </form>
      </Form>

      <SystemSettingsForm
        title={t('pages.spaceSettings.imagor.media', { defaultValue: 'Media' })}
        description={t('pages.spaceSettings.imagor.mediaDescription', {
          defaultValue: 'Control how video thumbnails are generated for this space.',
        })}
        settings={mediaSettings}
        initialValues={initialValues}
        saveCallback={(changedValues) => setSpaceRegistryObject(space.key, changedValues)}
      />

      <ResponsiveDialog
        open={secretDialogOpen}
        onOpenChange={(open) => {
          setSecretDialogOpen(open)
          if (!open) {
            secretForm.reset({
              imagorSecret: '',
              signerType: normalizeSignerType(space.signerAlgorithm),
              signerTruncate: space.signerTruncate ?? 32,
            })
            setHasGeneratedSecret(false)
            setShowSecret(false)
          }
        }}
        contentClassName='sm:max-w-xl'
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('pages.spaceSettings.imagor.customSigningDialogTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(
              hasCustomImagorSecret
                ? 'pages.spaceSettings.imagor.customSigningDialogUpdateDescription'
                : 'pages.spaceSettings.imagor.customSigningDialogDescription',
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...secretForm}>
          <form onSubmit={secretForm.handleSubmit(handleSaveCustomSecret)} className='space-y-4'>
            <FormField
              control={secretForm.control}
              name='imagorSecret'
              render={({ field }) => (
                <FormItem>
                  <div className='space-y-2'>
                    <div className='flex items-stretch gap-0'>
                      <FormControl>
                        <Input
                          type={showSecret ? 'text' : 'password'}
                          autoFocus
                          className='relative z-10 h-10 rounded-r-none'
                          {...field}
                          onChange={(event) => {
                            setHasGeneratedSecret(false)
                            field.onChange(event)
                          }}
                        />
                      </FormControl>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-10 shrink-0 rounded-l-none border-l-0'
                        onClick={
                          hasGeneratedSecret
                            ? handleCopySecret
                            : () => setShowSecret((value) => !value)
                        }
                      >
                        {hasGeneratedSecret
                          ? t('pages.spaceSettings.imagor.copySecret')
                          : showSecret
                            ? t('pages.spaceSettings.imagor.hideSecret')
                            : t('pages.spaceSettings.imagor.showSecret')}
                      </Button>
                    </div>
                    <FormMessage className='mt-1.5' />
                    <Button
                      type='button'
                      variant='outline'
                      className='w-fit'
                      onClick={handleGenerateSecret}
                    >
                      {t('pages.spaceSettings.imagor.generateSecret')}
                    </Button>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={secretForm.control}
              name='signerType'
              render={({ field }) => (
                <FormItem>
                  <div className='space-y-2'>
                    <p className='text-sm font-medium'>
                      {t('pages.spaceSettings.imagor.signerAlgorithm')}
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      {t('pages.spaceSettings.imagor.secretDialogSignerAlgorithmDescription')}
                    </p>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='SHA1'>
                          {t('pages.spaceSettings.imagor.algorithmSha1')}
                        </SelectItem>
                        <SelectItem value='SHA256'>
                          {t('pages.spaceSettings.imagor.algorithmSha256')}
                        </SelectItem>
                        <SelectItem value='SHA512'>
                          {t('pages.spaceSettings.imagor.algorithmSha512')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className='mt-1.5' />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={secretForm.control}
              name='signerTruncate'
              render={({ field }) => (
                <FormItem>
                  <div className='space-y-2'>
                    <p className='text-sm font-medium'>
                      {t('pages.spaceSettings.imagor.signerTruncate')}
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      {t('pages.spaceSettings.imagor.secretDialogSignerTruncateDescription')}
                    </p>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        placeholder='0'
                        value={field.value ?? 0}
                        onChange={(e) =>
                          field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage className='mt-1.5' />
                  </div>
                </FormItem>
              )}
            />

            <ResponsiveDialogFooter className='sm:justify-end'>
              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setSecretDialogOpen(false)}
                  disabled={secretForm.formState.isSubmitting}
                >
                  {t('common.buttons.cancel')}
                </Button>
                <ButtonWithLoading type='submit' isLoading={secretForm.formState.isSubmitting}>
                  {t('common.buttons.save')}
                </ButtonWithLoading>
              </div>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialog>

      <ResponsiveDialog open={confirmResetDialogOpen} onOpenChange={setConfirmResetDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('pages.spaceSettings.imagor.resetConfirmTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaceSettings.imagor.resetConfirmDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setConfirmResetDialogOpen(false)}
            disabled={isResettingSecret}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            type='button'
            variant='destructive'
            isLoading={isResettingSecret}
            onClick={handleUseWorkspaceDefault}
            className='w-full sm:w-auto'
          >
            {t('pages.spaceSettings.imagor.useWorkspaceDefault')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </>
  )
}

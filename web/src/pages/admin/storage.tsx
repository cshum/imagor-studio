import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { configureFileStorage, configureS3Storage, testStorageConfig } from '@/api/storage-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SecretField } from '@/components/ui/secret-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
import type { StorageStatusQuery } from '@/types/generated-shared'

// ── Propagation countdown helper ───────────────────────────────────────────

const SYNC_INTERVAL_S = 60

function calcRemaining(lastUpdated: string | null | undefined): number {
  if (!lastUpdated) return 0
  const updatedMs = parseInt(lastUpdated, 10)
  if (isNaN(updatedMs)) return 0
  const elapsed = Math.floor((Date.now() - updatedMs) / 1000)
  return Math.max(0, SYNC_INTERVAL_S - elapsed)
}

// ── Schema ─────────────────────────────────────────────────────────────────

const storageSchema = z
  .object({
    storageType: z.enum(['file', 's3']),
    // File-specific
    fileBaseDir: z.string().optional(),
    dirPermissions: z.string().optional(),
    filePermissions: z.string().optional(),
    // S3-specific
    bucket: z.string().optional(),
    region: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    endpoint: z.string().optional(),
    forcePathStyle: z.boolean().optional(),
    s3BaseDir: z.string().optional(),
    sessionToken: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.storageType === 'file' && !data.fileBaseDir?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Base directory is required',
        path: ['fileBaseDir'],
      })
    }
    if (data.storageType === 's3' && !data.bucket?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Bucket name is required', path: ['bucket'] })
    }
  })

type StorageFormData = z.infer<typeof storageSchema>

// ── Props ──────────────────────────────────────────────────────────────────

interface AdminStorageSectionProps {
  storageStatus: StorageStatusQuery['storageStatus'] | null
}

// ── Component ──────────────────────────────────────────────────────────────

export function AdminStorageSection({ storageStatus }: AdminStorageSectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showSecretAccessKey, setShowSecretAccessKey] = useState(false)
  const [showSessionToken, setShowSessionToken] = useState(false)
  const [showFileAdvanced, setShowFileAdvanced] = useState(false)
  const [showS3Advanced, setShowS3Advanced] = useState(false)

  // Propagation countdown
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calcRemaining(storageStatus?.lastUpdated),
  )
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const initial = calcRemaining(storageStatus?.lastUpdated)
    setRemainingSeconds(initial)
    if (initial <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          routerRef.current.invalidate()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [storageStatus?.lastUpdated])

  const detectedType = storageStatus?.type?.toLowerCase() === 's3' ? 's3' : 'file'

  const form = useForm<StorageFormData>({
    resolver: zodResolver(storageSchema),
    defaultValues: {
      storageType: detectedType,
      // File
      fileBaseDir: storageStatus?.fileConfig?.baseDir ?? '/app/gallery',
      dirPermissions: storageStatus?.fileConfig?.mkdirPermissions ?? '0755',
      filePermissions: storageStatus?.fileConfig?.writePermissions ?? '0644',
      // S3
      bucket: storageStatus?.s3Config?.bucket ?? '',
      region: storageStatus?.s3Config?.region ?? '',
      accessKeyId: '',
      secretAccessKey: '',
      endpoint: storageStatus?.s3Config?.endpoint ?? '',
      forcePathStyle: storageStatus?.s3Config?.forcePathStyle ?? false,
      s3BaseDir: storageStatus?.s3Config?.baseDir ?? '',
      sessionToken: '',
    },
  })

  const storageType = form.watch('storageType')
  const isOverridden = storageStatus?.isOverriddenByConfig ?? false

  // Clear test result when form changes
  useEffect(() => {
    const subscription = form.watch(() => setTestResult(null))
    return () => subscription.unsubscribe()
  }, [form])

  const handleSave = async (values: StorageFormData) => {
    setIsSaving(true)
    setTestResult(null)
    try {
      let success = false
      let message = ''

      if (values.storageType === 'file') {
        const result = await configureFileStorage({
          input: {
            baseDir: values.fileBaseDir!,
            mkdirPermissions: values.dirPermissions || null,
            writePermissions: values.filePermissions || null,
          },
        })
        success = result.success
        message = result.message ?? ''
      } else {
        const result = await configureS3Storage({
          input: {
            bucket: values.bucket!,
            region: values.region || null,
            endpoint: values.endpoint || null,
            forcePathStyle: values.forcePathStyle ?? null,
            accessKeyId: values.accessKeyId || null,
            secretAccessKey: values.secretAccessKey || null,
            sessionToken: values.sessionToken || null,
            baseDir: values.s3BaseDir || null,
          },
        })
        success = result.success
        message = result.message ?? ''
      }

      if (!success) {
        throw new Error(message || t('pages.storage.configurationError', { storageType: '' }))
      }

      toast.success(t('pages.storage.configurationSuccess'))
      // Reset credential fields
      form.setValue('secretAccessKey', '')
      form.setValue('sessionToken', '')
      setShowSecretAccessKey(false)
      setShowSessionToken(false)
      // Restart propagation countdown
      setRemainingSeconds(SYNC_INTERVAL_S)
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const values = form.getValues()
      const testInput =
        values.storageType === 'file'
          ? {
              type: 'FILE' as const,
              fileConfig: {
                baseDir: values.fileBaseDir ?? '',
                mkdirPermissions: values.dirPermissions || null,
                writePermissions: values.filePermissions || null,
              },
              s3Config: null,
            }
          : {
              type: 'S3' as const,
              fileConfig: null,
              s3Config: {
                bucket: values.bucket ?? '',
                region: values.region || null,
                endpoint: values.endpoint || null,
                forcePathStyle: values.forcePathStyle ?? null,
                accessKeyId: values.accessKeyId || null,
                secretAccessKey: values.secretAccessKey || null,
                sessionToken: values.sessionToken || null,
                baseDir: values.s3BaseDir || null,
              },
            }

      const result = await testStorageConfig({ input: testInput })
      setTestResult({
        success: result.success,
        message:
          result.message ??
          (result.success ? t('pages.storage.testPassed') : t('pages.storage.testFailed')),
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : t('pages.storage.testError'),
      })
    } finally {
      setIsTesting(false)
    }
  }

  const isDisabled = isSaving || isTesting || isOverridden

  return (
    <div className='space-y-6'>
      {/* Override warning */}
      {isOverridden && (
        <p className='text-sm text-orange-600 dark:text-orange-400'>
          {t('pages.storage.configurationOverridden')}
        </p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className='space-y-2'>
          {/* ── Storage type selector ─────────────────────────────────── */}
          <SettingsSection>
            <FormField
              control={form.control}
              name='storageType'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.admin.storage.storageType')}
                    description={t('pages.storage.storageTypeDescription')}
                    last
                  >
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='file'>{t('pages.storage.fileStorage')}</SelectItem>
                        <SelectItem value='s3'>{t('pages.storage.s3Storage')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </FormItem>
              )}
            />
          </SettingsSection>

          {/* ── File storage fields ───────────────────────────────────── */}
          {storageType === 'file' && (
            <>
              <SettingsSection>
                <FormField
                  control={form.control}
                  name='fileBaseDir'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.storage.baseDir')}
                        description={t('pages.storage.baseDirDescription')}
                        last
                      >
                        <FormControl>
                          <Input placeholder='/app/gallery' {...field} disabled={isDisabled} />
                        </FormControl>
                        <FormMessage className='mt-1.5' />
                      </SettingRow>
                    </FormItem>
                  )}
                />
              </SettingsSection>

              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='-ml-2'
                onClick={() => setShowFileAdvanced((v) => !v)}
                disabled={isDisabled}
              >
                {showFileAdvanced ? (
                  <ChevronDown className='mr-2 h-3.5 w-3.5' />
                ) : (
                  <ChevronRight className='mr-2 h-3.5 w-3.5' />
                )}
                {t('pages.storage.advancedSettings')}
              </Button>

              {showFileAdvanced && (
                <SettingsSection>
                  <FormField
                    control={form.control}
                    name='dirPermissions'
                    render={({ field }) => (
                      <FormItem>
                        <SettingRow
                          label={t('pages.storage.directoryPermissions')}
                          description={t('pages.storage.dirPermissionsDescription')}
                        >
                          <FormControl>
                            <Input placeholder='0755' {...field} disabled={isDisabled} />
                          </FormControl>
                          <FormMessage className='mt-1.5' />
                        </SettingRow>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='filePermissions'
                    render={({ field }) => (
                      <FormItem>
                        <SettingRow
                          label={t('pages.storage.filePermissions')}
                          description={t('pages.storage.filePermissionsDescription')}
                          last
                        >
                          <FormControl>
                            <Input placeholder='0644' {...field} disabled={isDisabled} />
                          </FormControl>
                          <FormMessage className='mt-1.5' />
                        </SettingRow>
                      </FormItem>
                    )}
                  />
                </SettingsSection>
              )}
            </>
          )}

          {/* ── S3 storage fields ─────────────────────────────────────── */}
          {storageType === 's3' && (
            <>
              <SettingsSection>
                <FormField
                  control={form.control}
                  name='bucket'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={`${t('pages.storage.bucketName')} *`}
                        description={t('pages.storage.bucketDescription')}
                      >
                        <FormControl>
                          <Input {...field} disabled={isDisabled} />
                        </FormControl>
                        <FormMessage className='mt-1.5' />
                      </SettingRow>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='region'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.storage.region')}
                        description={t('pages.storage.regionDescription')}
                      >
                        <FormControl>
                          <Input {...field} disabled={isDisabled} />
                        </FormControl>
                        <FormMessage className='mt-1.5' />
                      </SettingRow>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='accessKeyId'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.storage.accessKeyId')}
                        description={t('pages.storage.accessKeyIdDescription')}
                      >
                        <FormControl>
                          <Input {...field} disabled={isDisabled} />
                        </FormControl>
                        <FormMessage className='mt-1.5' />
                      </SettingRow>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='secretAccessKey'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.storage.secretAccessKey')}
                        description={t('pages.storage.secretAccessKeyDescription')}
                        last
                      >
                        <SecretField
                          show={showSecretAccessKey}
                          onShow={() => setShowSecretAccessKey(true)}
                          onHide={() => {
                            setShowSecretAccessKey(false)
                            field.onChange('')
                          }}
                          updateLabel={t('common.buttons.update')}
                          cancelLabel={t('common.buttons.cancel')}
                          disabled={isDisabled}
                          renderInput={() => (
                            <Input type='password' autoFocus {...field} disabled={isDisabled} />
                          )}
                        />
                        <FormMessage className='mt-1.5' />
                      </SettingRow>
                    </FormItem>
                  )}
                />
              </SettingsSection>

              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='-ml-2'
                onClick={() => setShowS3Advanced((v) => !v)}
                disabled={isDisabled}
              >
                {showS3Advanced ? (
                  <ChevronDown className='h-3.5 w-3.5' />
                ) : (
                  <ChevronRight className='h-3.5 w-3.5' />
                )}
                {t('pages.storage.advancedSettings')}
              </Button>

              {showS3Advanced && (
                <SettingsSection>
                  <FormField
                    control={form.control}
                    name='endpoint'
                    render={({ field }) => (
                      <FormItem>
                        <SettingRow
                          label={t('pages.storage.customEndpoint')}
                          description={t('pages.storage.customEndpointDescription')}
                        >
                          <FormControl>
                            <Input
                              placeholder='https://s3.amazonaws.com'
                              {...field}
                              disabled={isDisabled}
                            />
                          </FormControl>
                          <FormMessage className='mt-1.5' />
                        </SettingRow>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='forcePathStyle'
                    render={({ field }) => (
                      <FormItem>
                        <SettingRow
                          label={t('pages.storage.forcePathStyle')}
                          description={t('pages.storage.forcePathStyleDescription')}
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isDisabled}
                            />
                          </FormControl>
                        </SettingRow>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='s3BaseDir'
                    render={({ field }) => (
                      <FormItem>
                        <SettingRow
                          label={t('pages.storage.baseDirectory')}
                          description={t('pages.storage.baseDirectoryDescription')}
                        >
                          <FormControl>
                            <Input {...field} disabled={isDisabled} />
                          </FormControl>
                          <FormMessage className='mt-1.5' />
                        </SettingRow>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='sessionToken'
                    render={({ field }) => (
                      <FormItem>
                        <SettingRow
                          label={t('pages.storage.sessionToken')}
                          description={t('pages.storage.sessionTokenDescription')}
                          last
                        >
                          <SecretField
                            show={showSessionToken}
                            onShow={() => setShowSessionToken(true)}
                            onHide={() => {
                              setShowSessionToken(false)
                              field.onChange('')
                            }}
                            updateLabel={t('common.buttons.update')}
                            cancelLabel={t('common.buttons.cancel')}
                            disabled={isDisabled}
                            renderInput={() => (
                              <Input type='password' autoFocus {...field} disabled={isDisabled} />
                            )}
                          />
                          <FormMessage className='mt-1.5' />
                        </SettingRow>
                      </FormItem>
                    )}
                  />
                </SettingsSection>
              )}
            </>
          )}

          {/* ── Test result ───────────────────────────────────────────── */}
          {testResult && (
            <div
              className={[
                'rounded-md p-3 text-sm',
                testResult.success
                  ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                  : 'bg-destructive/10 text-destructive',
              ].join(' ')}
            >
              {testResult.message}
            </div>
          )}

          {/* ── Action buttons ────────────────────────────────────────── */}
          <div className='mt-4 flex items-center justify-end gap-3'>
            {storageType === 's3' && (
              <ButtonWithLoading
                type='button'
                variant='outline'
                onClick={handleTest}
                isLoading={isTesting}
                disabled={isSaving || isOverridden}
              >
                {t('pages.storage.testConfiguration')}
              </ButtonWithLoading>
            )}
            <ButtonWithLoading
              type='submit'
              isLoading={isSaving}
              disabled={isTesting || isOverridden}
            >
              {t('pages.storage.configureStorage')}
            </ButtonWithLoading>
          </div>
        </form>
      </Form>

      {/* ── Propagation countdown ─────────────────────────────────────── */}
      {remainingSeconds > 0 && (
        <p className='text-muted-foreground text-sm'>
          {t('pages.storage.takingEffect')} ({remainingSeconds}s)
        </p>
      )}
    </div>
  )
}

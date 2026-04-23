import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { Cloud, Lock } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { updateSpace } from '@/api/org-api'
import { S3RequirementsNote } from '@/components/storage/s3-requirements-note'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
import { extractErrorInfo } from '@/lib/error-utils'
import { rememberSpacePropagationNotice } from '@/lib/space-propagation'
import { formatStorageValidationError } from '@/lib/storage-validation-errors'
import { SecretField, SpaceSettingsData } from '@/pages/space-settings/shared.tsx'

export { SecretField } from '@/components/ui/secret-field'

// ── Schema ─────────────────────────────────────────────────────────────────

const credentialsSchema = z.object({
  endpoint: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretKey: z.string().optional(),
})
type CredentialsFormData = z.infer<typeof credentialsSchema>

// ── Storage section (BYOB only) ────────────────────────────────────────────

interface StorageSectionProps {
  space: SpaceSettingsData
}

export function StorageSection({ space }: StorageSectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)

  const form = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      endpoint: space.endpoint ?? '',
      accessKeyId: '',
      secretKey: '',
    },
  })

  // Show read-only info panel for platform-managed spaces
  if (space.storageMode !== 'byob') {
    return (
      <div className='rounded-lg border p-6'>
        <div className='flex items-start gap-4'>
          <Cloud className='text-muted-foreground mt-0.5 h-8 w-8 shrink-0' />
          <div>
            <h3 className='font-semibold'>{t('pages.spaceSettings.storage.managedTitle')}</h3>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('pages.spaceSettings.storage.managedDescription')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleSave = async (values: CredentialsFormData) => {
    setIsSaving(true)
    try {
      const trimmedAccessKeyId = values.accessKeyId?.trim()
      const trimmedSecretKey = values.secretKey?.trim()

      await updateSpace({
        key: space.key,
        input: {
          key: space.key,
          name: space.name,
          storageMode: null,
          storageType: null,
          bucket: null,
          region: null,
          endpoint: values.endpoint ?? null,
          prefix: null,
          accessKeyId: trimmedAccessKeyId ? trimmedAccessKeyId : null,
          secretKey: trimmedSecretKey ? trimmedSecretKey : null,
          usePathStyle: null,
          customDomain: null,
          isShared: null,
          signerAlgorithm: null,
          signerTruncate: null,
          imagorSecret: null,
          imagorCORSOrigins: null,
        },
      })
      rememberSpacePropagationNotice({
        action: 'updated',
        savedAt: Date.now(),
        spaceKey: space.key,
      })
      toast.success(t('pages.spaceSettings.storage.saved'))
      form.setValue('accessKeyId', '')
      form.setValue('secretKey', '')
      setShowSecretKey(false)
      await router.invalidate()
    } catch (err) {
      const errorInfo = extractErrorInfo(err)
      toast.error(
        formatStorageValidationError(t, { message: errorInfo.message, code: errorInfo.code }),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsSection contentClassName='border-t-0'>
      <S3RequirementsNote className='mb-4' />

      <div>
        <SettingRow
          label={t('pages.spaceSettings.storage.bucket')}
          contentClassName='sm:max-w-md'
        >
          <div className='text-sm font-medium sm:text-right'>
            <code className='font-mono'>{space.bucket}</code>
          </div>
        </SettingRow>
        {space.region && (
          <SettingRow label={t('pages.spaceSettings.storage.region')} contentClassName='sm:max-w-md'>
            <div className='text-sm font-medium sm:text-right'>
              <code className='font-mono'>{space.region}</code>
            </div>
          </SettingRow>
        )}
        {space.prefix && (
          <SettingRow label={t('pages.spaceSettings.storage.prefix')} contentClassName='sm:max-w-md'>
            <div className='text-sm font-medium sm:text-right'>
              <code className='font-mono'>{space.prefix}</code>
            </div>
          </SettingRow>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <FormField
            control={form.control}
            name='endpoint'
            render={({ field }) => (
              <FormItem>
                <SettingRow
                  label={t('pages.spaceSettings.storage.endpoint')}
                  description={t('pages.spaceSettings.storage.endpointDescription')}
                  contentClassName='sm:max-w-md'
                >
                  <FormControl>
                    <Input placeholder='https://s3.amazonaws.com' {...field} disabled={isSaving} />
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
                  label={t('pages.spaceSettings.storage.accessKeyId')}
                  description={t('pages.spaceSettings.storage.accessKeyIdDescription')}
                  contentClassName='sm:max-w-md'
                >
                  <FormControl>
                    <Input
                      placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                      {...field}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage className='mt-1.5' />
                </SettingRow>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='secretKey'
            render={({ field }) => (
              <FormItem>
                <SettingRow
                  label={t('pages.spaceSettings.storage.secretKey')}
                  description={t('pages.spaceSettings.storage.secretKeyDescription')}
                  last
                  contentClassName='sm:max-w-md'
                >
                  <SecretField
                    show={showSecretKey}
                    onShow={() => setShowSecretKey(true)}
                    onHide={() => {
                      setShowSecretKey(false)
                      field.onChange('')
                    }}
                    updateLabel={t('common.buttons.update')}
                    cancelLabel={t('common.buttons.cancel')}
                    disabled={isSaving}
                    renderInput={() => (
                      <Input type='password' autoFocus {...field} disabled={isSaving} />
                    )}
                  />
                  <FormMessage className='mt-1.5' />
                </SettingRow>
              </FormItem>
            )}
          />

          <div className='space-y-4 py-4'>
            <div className='bg-muted/50 text-muted-foreground flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-xs'>
              <Lock className='mt-0.5 h-3.5 w-3.5 shrink-0' />
              <span>{t('pages.spaces.credentialsEncrypted')}</span>
            </div>

            <div className='flex justify-end'>
              <ButtonWithLoading type='submit' isLoading={isSaving}>
                {t('common.buttons.save')}
              </ButtonWithLoading>
            </div>
          </div>
        </form>
      </Form>
    </SettingsSection>
  )
}

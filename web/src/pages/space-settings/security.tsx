import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { setSpaceRegistryObject, updateSpace } from '@/api/org-api'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
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
import { rememberSpacePropagationNotice } from '@/lib/space-propagation'

import type { SpaceSettingsData } from './shared'

// ── Security section ───────────────────────────────────────────────────────

interface SecuritySectionProps {
  space: SpaceSettingsData
  initialValues: Record<string, string>
}

const corsSchema = z.object({
  imagorSecret: z.string().optional(),
  signerType: z.enum(['SHA1', 'SHA256', 'SHA512']),
  signerTruncate: z.number().int().min(0),
  imagorCORSOrigins: z.string().optional(),
})
type ImagorFormData = z.infer<typeof corsSchema>

export function SecuritySection({ space, initialValues }: SecuritySectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [showSecret, setShowSecret] = useState(false)
  const form = useForm<ImagorFormData>({
    resolver: zodResolver(corsSchema),
    defaultValues: {
      imagorSecret: '',
      signerType:
        space.signerAlgorithm === 'SHA1' ||
        space.signerAlgorithm === 'SHA256' ||
        space.signerAlgorithm === 'SHA512'
          ? space.signerAlgorithm
          : 'SHA256',
      signerTruncate: space.signerTruncate ?? 32,
      imagorCORSOrigins: space.imagorCORSOrigins ?? '',
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

  const handleSave = async (values: ImagorFormData) => {
    await updateSpace({
      key: space.key,
      input: {
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
        signerAlgorithm: values.signerType.toLowerCase(),
        signerTruncate: values.signerTruncate ?? null,
        imagorSecret: values.imagorSecret?.trim() || null,
        imagorCORSOrigins: values.imagorCORSOrigins?.trim() ?? '',
      },
    })

    rememberSpacePropagationNotice({
      action: 'updated',
      savedAt: Date.now(),
      spaceKey: space.key,
    })

    toast.success(t('pages.spaceSettings.imagor.saved'))
    form.setValue('imagorSecret', '')
    setShowSecret(false)
    await router.invalidate()
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <SettingsSection
            title={t('pages.spaceSettings.imagor.urlSigning')}
            description={t('pages.spaceSettings.imagor.urlSigningDescription')}
            className='mb-8'
          >
            <FormField
              control={form.control}
              name='imagorSecret'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.imagor.secret')}
                    description={t('pages.imagor.secretDescription')}
                  >
                    <SecretField
                      show={showSecret}
                      onShow={() => setShowSecret(true)}
                      onHide={() => {
                        setShowSecret(false)
                        field.onChange('')
                      }}
                      updateLabel={t('common.buttons.update')}
                      cancelLabel={t('common.buttons.cancel')}
                      renderInput={() => <Input type='password' autoFocus {...field} />}
                    />
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='signerType'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.imagor.signerType')}
                    description={t('pages.imagor.signerTypeDescription')}
                  >
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='SHA1'>{t('pages.imagor.algorithmSha1')}</SelectItem>
                        <SelectItem value='SHA256'>{t('pages.imagor.algorithmSha256')}</SelectItem>
                        <SelectItem value='SHA512'>{t('pages.imagor.algorithmSha512')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='signerTruncate'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.imagor.signerTruncate')}
                    description={t('pages.imagor.signerTruncateDescription')}
                    last
                  >
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
                  </SettingRow>
                </FormItem>
              )}
            />
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
    </>
  )
}

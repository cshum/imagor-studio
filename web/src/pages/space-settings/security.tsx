import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { updateSpace } from '@/api/org-api'
import { ImagorConfigForm, type ImagorConfigValues } from '@/components/imagor/imagor-config-form'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SettingRow } from '@/components/ui/setting-row'
import { rememberSpacePropagationNotice } from '@/lib/space-propagation'

import type { SpaceSettingsData } from './shared'

// ── Security section ───────────────────────────────────────────────────────

interface SecuritySectionProps {
  space: SpaceSettingsData
}

const corsSchema = z.object({
  imagorCORSOrigins: z.string().optional(),
})

export function SecuritySection({ space }: SecuritySectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const corsForm = useForm<z.infer<typeof corsSchema>>({
    resolver: zodResolver(corsSchema),
    defaultValues: {
      imagorCORSOrigins: space.imagorCORSOrigins ?? '',
    },
  })

  const handleSave = async (values: ImagorConfigValues) => {
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
        // Convert uppercase GraphQL enum → lowercase for updateSpace
        signerAlgorithm: values.signerType.toLowerCase() ?? null,
        signerTruncate: values.signerTruncate ?? null,
        imagorSecret: values.secret || null,
        imagorCORSOrigins: null,
      },
    })
    rememberSpacePropagationNotice({
      action: 'updated',
      savedAt: Date.now(),
      spaceKey: space.key,
    })
    toast.success(t('pages.spaceSettings.imagor.saved'), {
      description: t('pages.spacePropagation.description'),
    })
    await router.invalidate()
  }

  const handleSaveCORS = async (values: z.infer<typeof corsSchema>) => {
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
        signerAlgorithm: null,
        signerTruncate: null,
        imagorSecret: null,
        imagorCORSOrigins: values.imagorCORSOrigins?.trim() ?? '',
      },
    })
    rememberSpacePropagationNotice({
      action: 'updated',
      savedAt: Date.now(),
      spaceKey: space.key,
    })
    toast.success(t('pages.spaceSettings.imagor.saved'), {
      description: t('pages.spacePropagation.description'),
    })
    await router.invalidate()
  }

  return (
    <>
      {/* URL Signing sub-heading */}
      <div className='mb-4'>
        <h3 className='text-base font-semibold'>{t('pages.spaceSettings.imagor.urlSigning')}</h3>
        <p className='text-muted-foreground mt-1 text-sm'>
          {t('pages.spaceSettings.imagor.urlSigningDescription')}
        </p>
      </div>

      <ImagorConfigForm
        initialValues={{
          hasSecret: false,
          signerType: space.signerAlgorithm,
          signerTruncate: space.signerTruncate,
        }}
        onSave={handleSave}
      />

      <div className='mt-8 mb-4'>
        <h3 className='text-base font-semibold'>{t('pages.spaceSettings.imagor.corsOrigins')}</h3>
        <p className='text-muted-foreground mt-1 text-sm'>
          {t('pages.spaceSettings.imagor.corsOriginsDescription')}
        </p>
      </div>

      <Form {...corsForm}>
        <form onSubmit={corsForm.handleSubmit(handleSaveCORS)}>
          <FormField
            control={corsForm.control}
            name='imagorCORSOrigins'
            render={({ field }) => (
              <FormItem>
                <SettingRow
                  label={t('pages.spaceSettings.imagor.corsOrigins')}
                  description={t('pages.spaceSettings.imagor.corsOriginsHelp')}
                  last
                >
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

          <div className='mt-2 flex justify-end pt-2'>
            <ButtonWithLoading type='submit' isLoading={corsForm.formState.isSubmitting}>
              {t('common.buttons.save')}
            </ButtonWithLoading>
          </div>
        </form>
      </Form>
    </>
  )
}

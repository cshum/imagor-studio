import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { updateSpace } from '@/api/org-api'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'

import { SecretField, type SpaceSettingsData } from './shared'

// ── Schema ─────────────────────────────────────────────────────────────────

const securitySchema = z.object({
  imagorSecret: z.string().optional(),
  signerAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  signerTruncate: z.number().int().min(0).optional(),
})
type SecurityFormData = z.infer<typeof securitySchema>

// ── Security section ───────────────────────────────────────────────────────

interface SecuritySectionProps {
  space: SpaceSettingsData
}

export function SecuritySection({ space }: SecuritySectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [showImagorSecret, setShowImagorSecret] = useState(false)

  const form = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      imagorSecret: '',
      signerAlgorithm: (space.signerAlgorithm as 'sha1' | 'sha256' | 'sha512') || 'sha256',
      signerTruncate: space.signerTruncate ?? 0,
    },
  })

  const handleSave = async (values: SecurityFormData) => {
    setIsSaving(true)
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
          imagorSecret: values.imagorSecret || null,
        },
      })
      toast.success(t('pages.spaceSettings.security.saved'))
      form.setValue('imagorSecret', '')
      setShowImagorSecret(false)
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* URL Signing sub-heading */}
      <div className='mb-4'>
        <h3 className='text-base font-semibold'>{t('pages.spaceSettings.security.urlSigning')}</h3>
        <p className='text-muted-foreground mt-1 text-sm'>
          {t('pages.spaceSettings.security.urlSigningDescription')}
        </p>
      </div>

      <SettingsSection>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <FormField
              control={form.control}
              name='imagorSecret'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.spaceSettings.security.imagorSecret')}
                    description={t('pages.spaceSettings.security.imagorSecretDescription')}
                  >
                    <SecretField
                      show={showImagorSecret}
                      onShow={() => setShowImagorSecret(true)}
                      onHide={() => {
                        setShowImagorSecret(false)
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
            <FormField
              control={form.control}
              name='signerAlgorithm'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.spaceSettings.security.signerAlgorithm')}
                    description={t('pages.spaceSettings.security.signerAlgorithmDescription')}
                  >
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? 'sha256'}
                      disabled={isSaving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='sha1'>
                          {t('pages.spaceSettings.security.algorithmSha1')}
                        </SelectItem>
                        <SelectItem value='sha256'>
                          {t('pages.spaceSettings.security.algorithmSha256')}
                        </SelectItem>
                        <SelectItem value='sha512'>
                          {t('pages.spaceSettings.security.algorithmSha512')}
                        </SelectItem>
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
                    label={t('pages.spaceSettings.security.signerTruncate')}
                    description={t('pages.spaceSettings.security.signerTruncateDescription')}
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
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />

            <div className='mt-2 flex justify-end pt-2'>
              <ButtonWithLoading type='submit' isLoading={isSaving}>
                {t('common.buttons.save')}
              </ButtonWithLoading>
            </div>
          </form>
        </Form>
      </SettingsSection>
    </>
  )
}

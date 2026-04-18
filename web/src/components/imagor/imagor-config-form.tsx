import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import * as z from 'zod'

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

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  secret: z.string().optional(),
  signerType: z.enum(['SHA1', 'SHA256', 'SHA512']),
  signerTruncate: z.number().int().min(0),
})

type FormData = z.infer<typeof schema>

// ── Exported types ─────────────────────────────────────────────────────────

export interface ImagorConfigValues {
  secret?: string
  signerType: 'SHA1' | 'SHA256' | 'SHA512'
  signerTruncate: number
}

export interface ImagorConfigInitialValues {
  hasSecret: boolean
  signerType?: string | null
  signerTruncate?: number | null
}

// ── Component ──────────────────────────────────────────────────────────────

interface ImagorConfigFormProps {
  initialValues: ImagorConfigInitialValues
  /**
   * Called with the form values on save.
   * Should perform the API call and show the success toast.
   * Errors thrown here are caught by the form and shown as an error toast.
   */
  onSave: (values: ImagorConfigValues) => Promise<void>
  /** Externally-imposed disabled state (e.g. config is overridden) */
  disabled?: boolean
}

export function ImagorConfigForm({ initialValues, onSave, disabled }: ImagorConfigFormProps) {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const normalizedSignerType = (): FormData['signerType'] => {
    const raw = initialValues.signerType?.toUpperCase() ?? 'SHA256'
    if (raw === 'SHA1' || raw === 'SHA256' || raw === 'SHA512') return raw
    return 'SHA256'
  }

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      secret: '',
      signerType: normalizedSignerType(),
      signerTruncate: initialValues.signerTruncate ?? 32,
    },
  })

  const handleSave = async (values: FormData) => {
    setIsSaving(true)
    try {
      await onSave({
        secret: values.secret || undefined,
        signerType: values.signerType,
        signerTruncate: values.signerTruncate,
      })
      form.setValue('secret', '')
      setShowSecret(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const isDisabled = disabled || isSaving

  return (
    <SettingsSection>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          {/* HMAC Secret */}
          <FormField
            control={form.control}
            name='secret'
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

          {/* Signer Algorithm */}
          <FormField
            control={form.control}
            name='signerType'
            render={({ field }) => (
              <FormItem>
                <SettingRow
                  label={t('pages.imagor.signerType')}
                  description={t('pages.imagor.signerTypeDescription')}
                >
                  <Select onValueChange={field.onChange} value={field.value} disabled={isDisabled}>
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

          {/* Signer Truncate */}
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
                      disabled={isDisabled}
                    />
                  </FormControl>
                  <FormMessage className='mt-1.5' />
                </SettingRow>
              </FormItem>
            )}
          />

          <div className='mt-2 flex justify-end pt-2'>
            <ButtonWithLoading type='submit' isLoading={isSaving} disabled={disabled}>
              {t('common.buttons.save')}
            </ButtonWithLoading>
          </div>
        </form>
      </Form>
    </SettingsSection>
  )
}

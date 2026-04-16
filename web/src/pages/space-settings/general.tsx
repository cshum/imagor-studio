import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { deleteSpace, setSpaceRegistryObject, updateSpace } from '@/api/org-api'
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
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'

import { GallerySection } from './gallery'
import type { SpaceSettingsData } from './shared'

// ── Schema ─────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1).max(255),
  customDomain: z.string().optional(),
})
type GeneralFormData = z.infer<typeof generalSchema>

// ── Branding sub-section ───────────────────────────────────────────────────

interface BrandingSettingsSectionProps {
  spaceKey: string
  initialValues: Record<string, string>
}

function BrandingSettingsSection({ spaceKey, initialValues }: BrandingSettingsSectionProps) {
  const { t } = useTranslation()

  const BRANDING_SETTINGS: SystemSetting[] = [
    {
      key: 'config.app_title',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.appTitle.label'),
      description: t('pages.admin.systemSettings.fields.appTitle.description'),
      defaultValue: 'Imagor Studio',
    },
    {
      key: 'config.app_url',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.appUrl.label'),
      description: t('pages.admin.systemSettings.fields.appUrl.description'),
      defaultValue: 'https://imagor.net',
    },
  ]

  const handleSave = async (changedValues: Record<string, string>) => {
    await setSpaceRegistryObject(spaceKey, changedValues)
  }

  return (
    <SystemSettingsForm
      title={t('pages.spaceSettings.branding.title')}
      description={t('pages.spaceSettings.branding.description')}
      settings={BRANDING_SETTINGS}
      initialValues={initialValues}
      saveCallback={handleSave}
    />
  )
}

// ── General section ────────────────────────────────────────────────────────

interface GeneralSectionProps {
  space: SpaceSettingsData
  initialValues: Record<string, string>
}

export function GeneralSection({ space, initialValues }: GeneralSectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: space.name ?? '',
      customDomain: space.customDomain ?? '',
    },
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (values: GeneralFormData) => {
    setIsSaving(true)
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
      setIsSaving(false)
    }
  }

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
    <>
      {/* General form */}
      <SettingsSection>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <SettingRow label={t('pages.spaceSettings.general.name')}>
                    <FormControl>
                      <Input {...field} disabled={isSaving} />
                    </FormControl>
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='customDomain'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.spaceSettings.general.customDomain')}
                    description={t('pages.spaceSettings.general.customDomainDescription')}
                    last
                  >
                    <FormControl>
                      <Input placeholder='images.example.com' {...field} disabled={isSaving} />
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

      {/* Branding */}
      <div className='mt-8'>
        <BrandingSettingsSection spaceKey={space.key} initialValues={initialValues} />
      </div>

      {/* Gallery settings */}
      <div className='mt-8'>
        <GallerySection spaceKey={space.key} initialValues={initialValues} />
      </div>

      {/* Danger Zone */}
      <div className='border-destructive/20 mt-10 border-t pt-6'>
        <h3 className='text-destructive text-base font-semibold'>
          {t('pages.spaceSettings.sections.dangerZone')}
        </h3>
        <div className='mt-4 flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='font-medium'>{t('pages.spaceSettings.danger.deleteTitle')}</p>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('pages.spaceSettings.danger.deleteDescription')}
            </p>
          </div>
          <Button
            variant='destructive'
            className='shrink-0'
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            {t('pages.spaceSettings.danger.deleteButton')}
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.deleteSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.deleteSpaceDescription')}{' '}
            <strong className='text-foreground'>{space.key}</strong>?
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
    </>
  )
}

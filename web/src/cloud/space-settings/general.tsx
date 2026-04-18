import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@shared/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@shared/components/ui/form'
import { Input } from '@shared/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@shared/components/ui/responsive-dialog'
import { SettingRow } from '@shared/components/ui/setting-row'
import { SettingsSection } from '@shared/components/ui/settings-section'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { checkSpaceKey, deleteSpace, setSpaceRegistryObject, updateSpace } from '@/cloud/org-api'
import { GallerySection } from '@/cloud/space-settings/gallery'
import type { SpaceSettingsData } from '@/cloud/space-settings/shared'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { extractErrorInfo } from '@/lib/error-utils'

const generalSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  customDomain: z.string().optional(),
  appTitle: z.string().optional(),
  appUrl: z.string().optional(),
})
type GeneralFormData = z.infer<typeof generalSchema>

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
      key: space.key ?? '',
      name: space.name ?? '',
      customDomain: space.customDomain ?? '',
      appTitle: initialValues['config.app_title'] ?? '',
      appUrl: initialValues['config.app_url'] ?? '',
    },
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (values: GeneralFormData) => {
    setIsSaving(true)
    form.clearErrors('key')
    try {
      const nextKey = values.key.trim()
      if (!nextKey) {
        form.setError('key', { message: t('forms.validation.required') })
        return
      }
      if (!/^[a-z0-9-]+$/.test(nextKey)) {
        form.setError('key', { message: t('pages.spaces.validation.keyFormat') })
        return
      }
      if (nextKey !== space.key) {
        const isTaken = await checkSpaceKey(nextKey)
        if (isTaken) {
          form.setError('key', { message: t('pages.spaces.messages.keyAlreadyTaken') })
          return
        }
      }

      const updatedSpace = await updateSpace({
        key: space.key,
        input: {
          key: nextKey,
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

      const brandingChanges: Record<string, string> = {}
      if ((values.appTitle ?? '') !== (initialValues['config.app_title'] ?? '')) {
        brandingChanges['config.app_title'] = values.appTitle ?? ''
      }
      if ((values.appUrl ?? '') !== (initialValues['config.app_url'] ?? '')) {
        brandingChanges['config.app_url'] = values.appUrl ?? ''
      }
      if (Object.keys(brandingChanges).length > 0) {
        await setSpaceRegistryObject(updatedSpace.key, brandingChanges)
      }

      toast.success(t('pages.spaceSettings.general.saved'))
      if (updatedSpace.key !== space.key) {
        await navigate({
          to: '/spaces/$spaceKey/settings/general',
          params: { spaceKey: updatedSpace.key },
          replace: true,
        })
      }
      await router.invalidate()
    } catch (err) {
      const errorInfo = extractErrorInfo(err)
      if (errorInfo.field === 'key') {
        form.setError('key', { message: errorInfo.message })
        return
      }
      toast.error(errorInfo.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSpace = async () => {
    setIsDeleting(true)
    try {
      await deleteSpace({ key: space.key })
      toast.success(t('pages.spaces.messages.spaceDeletedSuccess'))
      await navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <SettingsSection>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.spaceSettings.general.name')}
                    description={t('pages.spaceSettings.general.nameDescription')}
                  >
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
              name='key'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.spaces.formLabels.key')}
                    description={t('pages.spaces.keyDescription')}
                  >
                    <FormControl>
                      <Input {...field} disabled={isSaving} className='font-mono' />
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
                    description={t('pages.spaceSettings.general.customDomainDescription', {
                      spaceKey: space.key,
                    })}
                  >
                    <FormControl>
                      <Input
                        placeholder={`${space.key}.imagor.app`}
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
              name='appTitle'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.spaceSettings.branding.appTitle')}
                    description={t('pages.spaceSettings.branding.appTitleDescription')}
                  >
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
              name='appUrl'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.spaceSettings.branding.appUrl')}
                    description={t('pages.spaceSettings.branding.appUrlDescription')}
                    last
                  >
                    <FormControl>
                      <Input {...field} disabled={isSaving} />
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

      <GallerySection spaceKey={space.key} initialValues={initialValues} />

      <SettingsSection>
        <SettingRow
          label={t('pages.spaceSettings.general.deleteSpaceTitle')}
          description={t('pages.spaceSettings.general.deleteSpaceDescription')}
          last
        >
          <Button variant='destructive' onClick={() => setIsDeleteDialogOpen(true)}>
            {t('pages.spaceSettings.general.deleteSpaceButton')}
          </Button>
        </SettingRow>
      </SettingsSection>

      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('pages.spaceSettings.general.deleteDialogTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaceSettings.general.deleteDialogDescription', { name: space.name })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => setIsDeleteDialogOpen(false)}>
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            isLoading={isDeleting}
            onClick={handleDeleteSpace}
          >
            {t('pages.spaceSettings.general.confirmDeleteSpaceButton')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </>
  )
}

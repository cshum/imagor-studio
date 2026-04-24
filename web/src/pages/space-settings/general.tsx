import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { checkSpaceKey, deleteSpace, updateSpace } from '@/api/org-api'
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
import { extractErrorInfo } from '@/lib/error-utils'
import { rememberSpacePropagationNotice } from '@/lib/space-propagation'

import { GallerySection } from './gallery'
import type { SpaceSettingsData } from './shared'

// ── Schema ─────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  customDomain: z.string().optional(),
})
type GeneralFormData = z.infer<typeof generalSchema>

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
      key: space.key ?? '',
      name: space.name ?? '',
      customDomain: space.customDomain ?? '',
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
          storageMode: null,
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
          imagorCORSOrigins: null,
        },
      })
      rememberSpacePropagationNotice({
        action: 'updated',
        savedAt: Date.now(),
        spaceKey: updatedSpace.key,
      })
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
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <>
      {/* General + Branding form */}
      <SettingsSection>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            {/* Display Name */}
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
            {/* Custom Domain */}
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
            <div className='mt-2 flex justify-end pt-2'>
              <ButtonWithLoading type='submit' isLoading={isSaving}>
                {t('common.buttons.save')}
              </ButtonWithLoading>
            </div>
          </form>
        </Form>
      </SettingsSection>

      {/* Gallery settings */}
      <div className='mt-8'>
        <GallerySection spaceKey={space.key} initialValues={initialValues} />
      </div>

      {space.canDelete ? (
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
      ) : null}

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

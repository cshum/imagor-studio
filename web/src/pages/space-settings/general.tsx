import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { checkSpaceKey, deleteSpace, setSpaceRegistryObject, updateSpace } from '@/api/org-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { getLanguageCodes, getLanguageLabels } from '@/i18n'
import { extractErrorInfo } from '@/lib/error-utils'
import { rememberSpacePropagationNotice } from '@/lib/space-propagation'

import type { SpaceSettingsData } from './shared'

// ── Schema ─────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  customDomain: z.string().optional(),
})

const experienceSchema = z.object({
  guestMode: z.boolean(),
  defaultLanguage: z.string().min(1),
  defaultSortBy: z.enum(['NAME', 'MODIFIED_TIME']),
  defaultSortOrder: z.enum(['ASC', 'DESC']),
  showFileNames: z.boolean(),
})
type IdentityFormData = z.infer<typeof generalSchema>
type ExperienceFormData = z.infer<typeof experienceSchema>

const FIELD_WIDTH_CLASS = 'sm:max-w-sm'
const BOOLEAN_FIELD_WIDTH_CLASS = 'sm:max-w-sm sm:flex sm:justify-end'
const LABEL_WIDTH_CLASS = 'sm:w-1/2'

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
  const languageCodes = getLanguageCodes()
  const languageLabels = getLanguageLabels()
  const registryInitialValues = useMemo<ExperienceFormData>(
    () => ({
      guestMode: (initialValues['config.allow_guest_mode'] ?? 'false') === 'true',
      defaultLanguage: initialValues['config.app_default_language'] ?? 'en',
      defaultSortBy:
        initialValues['config.app_default_sort_by'] === 'NAME' ? 'NAME' : 'MODIFIED_TIME',
      defaultSortOrder: initialValues['config.app_default_sort_order'] === 'ASC' ? 'ASC' : 'DESC',
      showFileNames: (initialValues['config.app_show_file_names'] ?? 'false') === 'true',
    }),
    [initialValues],
  )

  const identityForm = useForm<IdentityFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      key: space.key ?? '',
      name: space.name ?? '',
      customDomain: space.customDomain ?? '',
    },
  })
  const experienceForm = useForm<ExperienceFormData>({
    resolver: zodResolver(experienceSchema),
    defaultValues: registryInitialValues,
  })
  const [isSavingIdentity, setIsSavingIdentity] = useState(false)
  const [isSavingExperience, setIsSavingExperience] = useState(false)

  const handleIdentitySave = async (values: IdentityFormData) => {
    setIsSavingIdentity(true)
    identityForm.clearErrors('key')
    try {
      const nextKey = values.key.trim()

      if (!nextKey) {
        identityForm.setError('key', { message: t('forms.validation.required') })
        return
      }

      if (!/^[a-z0-9-]+$/.test(nextKey)) {
        identityForm.setError('key', { message: t('pages.spaces.validation.keyFormat') })
        return
      }

      if (nextKey !== space.key) {
        const isTaken = await checkSpaceKey(nextKey)
        if (isTaken) {
          identityForm.setError('key', { message: t('pages.spaces.messages.keyAlreadyTaken') })
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
        identityForm.setError('key', { message: errorInfo.message })
        return
      }
      toast.error(errorInfo.message)
    } finally {
      setIsSavingIdentity(false)
    }
  }

  const handleExperienceSave = async (values: ExperienceFormData) => {
    setIsSavingExperience(true)
    try {
      const registryChanges: Record<string, string> = {}
      const nextRegistryValues: Record<string, string> = {
        'config.allow_guest_mode': String(values.guestMode),
        'config.app_default_language': values.defaultLanguage,
        'config.app_default_sort_by': values.defaultSortBy,
        'config.app_default_sort_order': values.defaultSortOrder,
        'config.app_show_file_names': String(values.showFileNames),
      }

      Object.entries(nextRegistryValues).forEach(([key, value]) => {
        if ((initialValues[key] ?? '') !== value) {
          registryChanges[key] = value
        }
      })

      if (Object.keys(registryChanges).length === 0) {
        toast.success(t('pages.spaceSettings.general.saved'))
        return
      }

      await setSpaceRegistryObject(space.id, registryChanges)
      toast.success(t('pages.spaceSettings.general.saved'))
      await router.invalidate()
    } catch (err) {
      toast.error(extractErrorInfo(err).message)
    } finally {
      setIsSavingExperience(false)
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
      <SettingsSection contentClassName='border-t-0'>
        <Form {...identityForm}>
          <form onSubmit={identityForm.handleSubmit(handleIdentitySave)}>
            <SettingsSection
              title={t('pages.spaceSettings.general.identity', { defaultValue: 'Identity' })}
              contentClassName='border-t-0'
            >
              <FormField
                control={identityForm.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <SettingRow
                      label={t('pages.spaceSettings.general.name')}
                      description={t('pages.spaceSettings.general.nameDescription')}
                      labelClassName={LABEL_WIDTH_CLASS}
                      contentClassName={FIELD_WIDTH_CLASS}
                    >
                      <FormControl>
                        <Input {...field} disabled={isSavingIdentity} />
                      </FormControl>
                      <FormMessage className='mt-1.5' />
                    </SettingRow>
                  </FormItem>
                )}
              />
              <FormField
                control={identityForm.control}
                name='key'
                render={({ field }) => (
                  <FormItem>
                    <SettingRow
                      label={t('pages.spaces.formLabels.key')}
                      description={t('pages.spaces.keyDescription')}
                      labelClassName={LABEL_WIDTH_CLASS}
                      contentClassName={FIELD_WIDTH_CLASS}
                    >
                      <FormControl>
                        <Input {...field} disabled={isSavingIdentity} className='font-mono' />
                      </FormControl>
                      <FormMessage className='mt-1.5' />
                    </SettingRow>
                  </FormItem>
                )}
              />
              <FormField
                control={identityForm.control}
                name='customDomain'
                render={({ field }) => (
                  <FormItem>
                    <SettingRow
                      label={t('pages.spaceSettings.general.customDomain')}
                      description={t('pages.spaceSettings.general.customDomainDescription', {
                        spaceKey: space.key,
                      })}
                      labelClassName={LABEL_WIDTH_CLASS}
                      contentClassName={FIELD_WIDTH_CLASS}
                      last
                    >
                      <FormControl>
                        <Input
                          placeholder={`${space.key}.imagor.app`}
                          {...field}
                          disabled={isSavingIdentity}
                        />
                      </FormControl>
                      <FormMessage className='mt-1.5' />
                    </SettingRow>
                  </FormItem>
                )}
              />

              <div className='mt-2 flex justify-end pt-2'>
                <ButtonWithLoading type='submit' isLoading={isSavingIdentity}>
                  {t('common.buttons.save')}
                </ButtonWithLoading>
              </div>
            </SettingsSection>
          </form>
        </Form>
      </SettingsSection>

      <SettingsSection className='mt-8' contentClassName='border-t-0'>
        <Form {...experienceForm}>
          <form onSubmit={experienceForm.handleSubmit(handleExperienceSave)}>
            <SettingsSection
              title={t('pages.spaceSettings.general.access', { defaultValue: 'Access' })}
              className='mb-6'
              contentClassName='border-t-0'
            >
              <FormField
                control={experienceForm.control}
                name='guestMode'
                render={({ field }) => (
                  <FormItem>
                    <SettingRow
                      label={t('pages.admin.systemSettings.fields.guestMode.label')}
                      description={t('pages.admin.systemSettings.fields.guestMode.description')}
                      labelClassName={LABEL_WIDTH_CLASS}
                      contentClassName={BOOLEAN_FIELD_WIDTH_CLASS}
                      last
                    >
                      <FormControl>
                        <div className='flex justify-start sm:justify-end'>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                            disabled={isSavingExperience}
                          />
                        </div>
                      </FormControl>
                    </SettingRow>
                  </FormItem>
                )}
              />
            </SettingsSection>

            <SettingsSection
              title={t('pages.spaceSettings.general.experience', { defaultValue: 'Experience' })}
              contentClassName='border-t-0'
            >
              <FormField
                control={experienceForm.control}
                name='defaultLanguage'
                render={({ field }) => (
                  <FormItem>
                    <SettingRow
                      label={t('pages.admin.systemSettings.fields.defaultLanguage.label')}
                      description={t(
                        'pages.admin.systemSettings.fields.defaultLanguage.description',
                      )}
                      labelClassName={LABEL_WIDTH_CLASS}
                      contentClassName={FIELD_WIDTH_CLASS}
                    >
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSavingExperience}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {languageCodes.map((code) => (
                            <SelectItem key={code} value={code}>
                              {languageLabels[code] ?? code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className='mt-1.5' />
                    </SettingRow>
                  </FormItem>
                )}
              />
              <FormField
                control={experienceForm.control}
                name='defaultSortBy'
                render={({ field }) => (
                  <FormItem>
                    <SettingRow
                      label={t('pages.admin.systemSettings.fields.defaultSorting.label')}
                      description={t(
                        'pages.admin.systemSettings.fields.defaultSorting.description',
                      )}
                      labelClassName={LABEL_WIDTH_CLASS}
                      contentClassName={FIELD_WIDTH_CLASS}
                    >
                      <div className='grid gap-3 sm:grid-cols-2'>
                        <div className='space-y-1.5'>
                          <FormLabel>
                            {t('pages.admin.systemSettings.fields.defaultSorting.sortBy')}
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSavingExperience}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='NAME'>
                                {t('pages.admin.systemSettings.fields.defaultSorting.options.name')}
                              </SelectItem>
                              <SelectItem value='MODIFIED_TIME'>
                                {t(
                                  'pages.admin.systemSettings.fields.defaultSorting.options.modifiedTime',
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <FormField
                          control={experienceForm.control}
                          name='defaultSortOrder'
                          render={({ field: orderField }) => (
                            <div className='space-y-1.5'>
                              <FormLabel>
                                {t('pages.admin.systemSettings.fields.defaultSorting.order')}
                              </FormLabel>
                              <Select
                                onValueChange={orderField.onChange}
                                value={orderField.value}
                                disabled={isSavingExperience}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value='ASC'>
                                    {t(
                                      'pages.admin.systemSettings.fields.defaultSorting.options.ascending',
                                    )}
                                  </SelectItem>
                                  <SelectItem value='DESC'>
                                    {t(
                                      'pages.admin.systemSettings.fields.defaultSorting.options.descending',
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        />
                      </div>
                      <FormMessage className='mt-1.5' />
                    </SettingRow>
                  </FormItem>
                )}
              />
              <FormField
                control={experienceForm.control}
                name='showFileNames'
                render={({ field }) => (
                  <FormItem>
                    <SettingRow
                      label={t('pages.admin.systemSettings.fields.showFileNames.label')}
                      description={t('pages.admin.systemSettings.fields.showFileNames.description')}
                      labelClassName={LABEL_WIDTH_CLASS}
                      contentClassName={BOOLEAN_FIELD_WIDTH_CLASS}
                      last
                    >
                      <FormControl>
                        <div className='flex justify-start sm:justify-end'>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                            disabled={isSavingExperience}
                          />
                        </div>
                      </FormControl>
                    </SettingRow>
                  </FormItem>
                )}
              />

              <div className='mt-2 flex justify-end pt-2'>
                <ButtonWithLoading type='submit' isLoading={isSavingExperience}>
                  {t('common.buttons.save')}
                </ButtonWithLoading>
              </div>
            </SettingsSection>
          </form>
        </Form>
      </SettingsSection>

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

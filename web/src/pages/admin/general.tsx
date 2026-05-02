import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { setSystemRegistryObject } from '@/api/registry-api'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
import { getLanguageCodes, getLanguageLabels } from '@/i18n'
import { extractErrorMessage } from '@/lib/error-utils'
import { invalidateGalleryDisplayPreferencesCache } from '@/lib/gallery-display-preferences'
import type { AdminGeneralLoaderData } from '@/loaders/account-loader'
import { useAuth } from '@/stores/auth-store'
import { setHomeTitle } from '@/stores/folder-tree-store'

interface AdminGeneralSectionProps {
  loaderData: AdminGeneralLoaderData
}

const adminGeneralSchema = z.object({
  homeTitle: z.string().min(1),
  guestMode: z.boolean(),
  defaultLanguage: z.string().min(1),
  defaultSortBy: z.enum(['NAME', 'MODIFIED_TIME']),
  defaultSortOrder: z.enum(['ASC', 'DESC']),
  showFileNames: z.boolean(),
})

type AdminGeneralFormData = z.infer<typeof adminGeneralSchema>

const FIELD_WIDTH_CLASS = 'sm:max-w-sm'
const BOOLEAN_FIELD_WIDTH_CLASS = 'sm:max-w-sm sm:flex sm:justify-end'
const LABEL_WIDTH_CLASS = 'sm:w-1/2'

export function AdminGeneralSection({ loaderData }: AdminGeneralSectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { authState } = useAuth()
  const isMultiTenant = authState.multiTenant
  const [isSaving, setIsSaving] = useState(false)
  const languageCodes = getLanguageCodes()
  const languageLabels = getLanguageLabels()

  const form = useForm<AdminGeneralFormData>({
    resolver: zodResolver(adminGeneralSchema),
    defaultValues: {
      homeTitle: loaderData.registry['config.app_home_title'] ?? 'Home',
      guestMode: (loaderData.registry['config.allow_guest_mode'] ?? 'false') === 'true',
      defaultLanguage: loaderData.registry['config.app_default_language'] ?? 'en',
      defaultSortBy:
        loaderData.registry['config.app_default_sort_by'] === 'NAME' ? 'NAME' : 'MODIFIED_TIME',
      defaultSortOrder:
        loaderData.registry['config.app_default_sort_order'] === 'ASC' ? 'ASC' : 'DESC',
      showFileNames: (loaderData.registry['config.app_show_file_names'] ?? 'false') === 'true',
    },
  })

  const getOverrideEntry = (key: string) =>
    loaderData.systemRegistryList.find((item) => item.key === key && item.isOverriddenByConfig)

  const formatDescription = (description: string, key: string) => {
    const override = getOverrideEntry(key)
    return override ? `${description}\n${t('pages.systemSettings.settingOverridden')}` : description
  }

  const watchedHomeTitle = form.watch('homeTitle')
  const watchedGuestMode = form.watch('guestMode')
  const watchedDefaultLanguage = form.watch('defaultLanguage')
  const watchedDefaultSortBy = form.watch('defaultSortBy')
  const watchedDefaultSortOrder = form.watch('defaultSortOrder')
  const watchedShowFileNames = form.watch('showFileNames')

  const effectiveValue = {
    homeTitle: getOverrideEntry('config.app_home_title')?.value ?? watchedHomeTitle,
    guestMode:
      (getOverrideEntry('config.allow_guest_mode')?.value ?? String(watchedGuestMode)) === 'true',
    defaultLanguage:
      getOverrideEntry('config.app_default_language')?.value ?? watchedDefaultLanguage,
    defaultSortBy:
      (getOverrideEntry('config.app_default_sort_by')?.value as
        | AdminGeneralFormData['defaultSortBy']
        | undefined) ?? watchedDefaultSortBy,
    defaultSortOrder:
      (getOverrideEntry('config.app_default_sort_order')?.value as
        | AdminGeneralFormData['defaultSortOrder']
        | undefined) ?? watchedDefaultSortOrder,
    showFileNames:
      (getOverrideEntry('config.app_show_file_names')?.value ?? String(watchedShowFileNames)) ===
      'true',
  }

  const handleSave = async (values: AdminGeneralFormData) => {
    setIsSaving(true)
    try {
      const changedValues: Record<string, string> = {}
      const nextValues: Array<[string, string, boolean]> = [
        ['config.app_home_title', values.homeTitle, !isMultiTenant],
        ['config.allow_guest_mode', String(values.guestMode), !isMultiTenant],
        ['config.app_default_language', values.defaultLanguage, !isMultiTenant],
        ['config.app_default_sort_by', values.defaultSortBy, !isMultiTenant],
        ['config.app_default_sort_order', values.defaultSortOrder, !isMultiTenant],
        ['config.app_show_file_names', String(values.showFileNames), !isMultiTenant],
      ]

      nextValues.forEach(([key, value, include]) => {
        if (!include && key !== 'config.app_home_title') return
        if (getOverrideEntry(key)) return
        if ((loaderData.registry[key] ?? '') !== value) {
          changedValues[key] = value
        }
      })

      if (Object.keys(changedValues).length === 0) {
        toast.success('Settings updated successfully')
        return
      }

      await setSystemRegistryObject(changedValues)
      if (
        changedValues['config.app_default_sort_by'] ||
        changedValues['config.app_default_sort_order'] ||
        changedValues['config.app_show_file_names']
      ) {
        invalidateGalleryDisplayPreferencesCache()
      }
      if (changedValues['config.app_home_title']) {
        setHomeTitle(changedValues['config.app_home_title'])
      }
      toast.success('Settings updated successfully')
      await router.invalidate()
    } catch (err) {
      toast.error(`Failed to update settings: ${extractErrorMessage(err)}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsSection contentClassName='border-t-0'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <SettingsSection
            title={t('pages.spaceSettings.general.identity', { defaultValue: 'Identity' })}
            contentClassName='border-t-0'
            className='mb-8'
          >
            <FormField
              control={form.control}
              name='homeTitle'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.admin.systemSettings.fields.homeTitle.label')}
                    description={formatDescription(
                      t('pages.admin.systemSettings.fields.homeTitle.description'),
                      'config.app_home_title',
                    )}
                    labelClassName={LABEL_WIDTH_CLASS}
                    contentClassName={FIELD_WIDTH_CLASS}
                    last
                  >
                    <FormControl>
                      <Input
                        {...field}
                        value={effectiveValue.homeTitle}
                        onChange={(e) => {
                          if (!getOverrideEntry('config.app_home_title')) {
                            field.onChange(e.target.value)
                          }
                        }}
                        disabled={isSaving || Boolean(getOverrideEntry('config.app_home_title'))}
                      />
                    </FormControl>
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />
          </SettingsSection>

          {!isMultiTenant ? (
            <>
              <SettingsSection
                title={t('pages.spaceSettings.general.access', { defaultValue: 'Access' })}
                contentClassName='border-t-0'
                className='mb-6'
              >
                <FormField
                  control={form.control}
                  name='guestMode'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.admin.systemSettings.fields.guestMode.label')}
                        description={formatDescription(
                          t('pages.admin.systemSettings.fields.guestMode.description'),
                          'config.allow_guest_mode',
                        )}
                        labelClassName={LABEL_WIDTH_CLASS}
                        contentClassName={BOOLEAN_FIELD_WIDTH_CLASS}
                        last
                      >
                        <FormControl>
                          <div className='flex justify-start sm:justify-end'>
                            <Checkbox
                              checked={effectiveValue.guestMode}
                              onCheckedChange={(checked) => {
                                if (!getOverrideEntry('config.allow_guest_mode')) {
                                  field.onChange(Boolean(checked))
                                }
                              }}
                              disabled={
                                isSaving || Boolean(getOverrideEntry('config.allow_guest_mode'))
                              }
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
                  control={form.control}
                  name='defaultLanguage'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.admin.systemSettings.fields.defaultLanguage.label')}
                        description={formatDescription(
                          t('pages.admin.systemSettings.fields.defaultLanguage.description'),
                          'config.app_default_language',
                        )}
                        labelClassName={LABEL_WIDTH_CLASS}
                        contentClassName={FIELD_WIDTH_CLASS}
                      >
                        <Select
                          onValueChange={field.onChange}
                          value={effectiveValue.defaultLanguage}
                          disabled={
                            isSaving || Boolean(getOverrideEntry('config.app_default_language'))
                          }
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
                  control={form.control}
                  name='defaultSortBy'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.admin.systemSettings.fields.defaultSorting.label')}
                        description={formatDescription(
                          t('pages.admin.systemSettings.fields.defaultSorting.description'),
                          'config.app_default_sort_by',
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
                              value={effectiveValue.defaultSortBy}
                              disabled={
                                isSaving || Boolean(getOverrideEntry('config.app_default_sort_by'))
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='NAME'>
                                  {t(
                                    'pages.admin.systemSettings.fields.defaultSorting.options.name',
                                  )}
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
                            control={form.control}
                            name='defaultSortOrder'
                            render={({ field: orderField }) => (
                              <div className='space-y-1.5'>
                                <FormLabel>
                                  {t('pages.admin.systemSettings.fields.defaultSorting.order')}
                                </FormLabel>
                                <Select
                                  onValueChange={orderField.onChange}
                                  value={effectiveValue.defaultSortOrder}
                                  disabled={
                                    isSaving ||
                                    Boolean(getOverrideEntry('config.app_default_sort_order'))
                                  }
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
                  control={form.control}
                  name='showFileNames'
                  render={({ field }) => (
                    <FormItem>
                      <SettingRow
                        label={t('pages.admin.systemSettings.fields.showFileNames.label')}
                        description={formatDescription(
                          t('pages.admin.systemSettings.fields.showFileNames.description'),
                          'config.app_show_file_names',
                        )}
                        labelClassName={LABEL_WIDTH_CLASS}
                        contentClassName={BOOLEAN_FIELD_WIDTH_CLASS}
                        last
                      >
                        <FormControl>
                          <div className='flex justify-start sm:justify-end'>
                            <Checkbox
                              checked={effectiveValue.showFileNames}
                              onCheckedChange={(checked) => {
                                if (!getOverrideEntry('config.app_show_file_names')) {
                                  field.onChange(Boolean(checked))
                                }
                              }}
                              disabled={
                                isSaving || Boolean(getOverrideEntry('config.app_show_file_names'))
                              }
                            />
                          </div>
                        </FormControl>
                      </SettingRow>
                    </FormItem>
                  )}
                />
              </SettingsSection>
            </>
          ) : null}

          <div className='mt-2 flex justify-end pt-2'>
            <ButtonWithLoading type='submit' isLoading={isSaving}>
              {t('common.buttons.save')}
            </ButtonWithLoading>
          </div>
        </form>
      </Form>
    </SettingsSection>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getLanguageCodes, getLanguageLabels } from '@/i18n'
import type { AdminGeneralLoaderData } from '@/loaders/account-loader'
import { useAuth } from '@/stores/auth-store'

interface AdminGeneralSectionProps {
  loaderData: AdminGeneralLoaderData
}

export function AdminGeneralSection({ loaderData }: AdminGeneralSectionProps) {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const isMultiTenant = authState.multiTenant
  const [showAdvanced, setShowAdvanced] = useState(false)

  // In multi-tenant mode, gallery/UX settings move to per-space Settings.
  // Platform admin only shows settings that are genuinely platform-wide.
  const GALLERY_SETTING_KEYS = new Set([
    'config.app_default_language',
    'config.app_home_title',
    'config.allow_guest_mode',
    'config.app_default_sort_by',
    'config.app_show_file_names',
  ])

  const ALL_SYSTEM_SETTINGS: SystemSetting[] = [
    {
      key: 'config.app_home_title',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.homeTitle.label'),
      description: t('pages.admin.systemSettings.fields.homeTitle.description'),
      defaultValue: 'Home',
    },
    {
      key: 'config.app_default_language',
      type: 'select',
      label: t('pages.admin.systemSettings.fields.defaultLanguage.label'),
      description: t('pages.admin.systemSettings.fields.defaultLanguage.description'),
      defaultValue: 'en',
      options: getLanguageCodes(),
      optionLabels: getLanguageLabels(),
    },
    {
      key: 'config.allow_guest_mode',
      type: 'boolean',
      label: t('pages.admin.systemSettings.fields.guestMode.label'),
      description: t('pages.admin.systemSettings.fields.guestMode.description'),
      defaultValue: false,
    },
    {
      key: 'config.app_default_sort_by',
      type: 'dual-select',
      label: t('pages.admin.systemSettings.fields.defaultSorting.label'),
      description: t('pages.admin.systemSettings.fields.defaultSorting.description'),
      defaultValue: 'MODIFIED_TIME',
      options: ['NAME', 'MODIFIED_TIME'],
      optionLabels: {
        NAME: t('pages.admin.systemSettings.fields.defaultSorting.options.name'),
        MODIFIED_TIME: t('pages.admin.systemSettings.fields.defaultSorting.options.modifiedTime'),
      },
      primaryLabel: t('pages.admin.systemSettings.fields.defaultSorting.sortBy'),
      secondaryKey: 'config.app_default_sort_order',
      secondaryDefaultValue: 'DESC',
      secondaryOptions: ['ASC', 'DESC'],
      secondaryOptionLabels: {
        ASC: t('pages.admin.systemSettings.fields.defaultSorting.options.ascending'),
        DESC: t('pages.admin.systemSettings.fields.defaultSorting.options.descending'),
      },
      secondaryLabel: t('pages.admin.systemSettings.fields.defaultSorting.order'),
    },
    {
      key: 'config.app_show_file_names',
      type: 'boolean',
      label: t('pages.admin.systemSettings.fields.showFileNames.label'),
      description: t('pages.admin.systemSettings.fields.showFileNames.description'),
      defaultValue: false,
    },
  ]

  const ADVANCED_SYSTEM_SETTINGS: SystemSetting[] = [
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

  const SYSTEM_SETTINGS = isMultiTenant
    ? ALL_SYSTEM_SETTINGS.filter((s) => !GALLERY_SETTING_KEYS.has(s.key))
    : ALL_SYSTEM_SETTINGS

  return (
    <div className='space-y-6'>
      <SystemSettingsForm
        title=''
        description=''
        settings={SYSTEM_SETTINGS}
        initialValues={loaderData.registry}
        systemRegistryList={loaderData.systemRegistryList}
      />

      {!isMultiTenant ? (
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant='ghost' className='gap-2' size='sm' type='button'>
              {showAdvanced ? (
                <ChevronDown className='text-muted-foreground h-4 w-4' />
              ) : (
                <ChevronRight className='text-muted-foreground h-4 w-4' />
              )}
              {t('pages.storage.advancedSettings')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='pt-4'>
            <SystemSettingsForm
              title=''
              description=''
              settings={ADVANCED_SYSTEM_SETTINGS}
              initialValues={loaderData.registry}
              systemRegistryList={loaderData.systemRegistryList}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

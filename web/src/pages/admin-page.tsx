import { ImagorManagementSection } from '@/components/imagor/imagor-management-section.tsx'
import { LicenseManagementSection } from '@/components/license/license-management-section'
import { StorageManagementSection } from '@/components/storage/storage-management-section.tsx'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import type { AdminLoaderData } from '@/loaders/account-loader'

interface AdminPageProps {
  loaderData?: AdminLoaderData
}

// Define system settings configuration
const SYSTEM_SETTINGS: SystemSetting[] = [
  {
    key: 'config.app_home_title',
    type: 'text',
    label: 'Home Title',
    description: 'Customize the title shown for the home page in navigation and breadcrumbs',
    defaultValue: 'Home',
  },
  {
    key: 'config.allow_guest_mode',
    type: 'boolean',
    label: 'Guest Mode',
    description: 'Allow users to browse the gallery without creating an account',
    defaultValue: false,
  },
  {
    key: 'config.app_default_sort_by',
    type: 'dual-select',
    label: 'Default File Sorting',
    description: 'Choose how files and folders are sorted by default',
    defaultValue: 'MODIFIED_TIME',
    options: ['NAME', 'MODIFIED_TIME'],
    optionLabels: {
      NAME: 'Name',
      MODIFIED_TIME: 'Date Modified',
    },
    primaryLabel: 'Sort By',
    secondaryKey: 'config.app_default_sort_order',
    secondaryDefaultValue: 'DESC',
    secondaryOptions: ['ASC', 'DESC'],
    secondaryOptionLabels: {
      ASC: 'Ascending',
      DESC: 'Descending',
    },
    secondaryLabel: 'Order',
  },
  {
    key: 'config.app_image_extensions',
    type: 'text',
    label: 'Image File Extensions',
    description: 'Comma-separated list of image file extensions to show (e.g., .jpg,.png,.gif)',
    defaultValue: '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif',
  },
  {
    key: 'config.app_video_extensions',
    type: 'text',
    label: 'Video File Extensions',
    description: 'Comma-separated list of video file extensions to show (e.g., .mp4,.webm,.avi)',
    defaultValue: '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg',
  },
  {
    key: 'config.app_show_hidden',
    type: 'boolean',
    label: 'Show Hidden Files',
    description: 'Show files and folders that start with a dot (.)',
    defaultValue: false,
  },
]

export function AdminPage({ loaderData }: AdminPageProps) {
  return (
    <div className='space-y-6'>
      <SystemSettingsForm
        title='System Settings'
        description='Configure system-wide settings. These options are only available to administrators.'
        settings={SYSTEM_SETTINGS}
        initialValues={loaderData?.registry || {}}
        systemRegistryList={loaderData?.systemRegistryList || []}
      />

      <StorageManagementSection storageStatus={loaderData?.storageStatus || null} />

      <ImagorManagementSection imagorStatus={loaderData?.imagorStatus || null} />

      <LicenseManagementSection licenseStatus={loaderData?.licenseStatus || null} />
    </div>
  )
}

import { ImagorManagementSection } from '@/components/imagor'
import { StorageManagementSection } from '@/components/storage'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import type { AdminLoaderData } from '@/loaders/account-loader'

interface AdminPageProps {
  loaderData?: AdminLoaderData
}

// Define system settings configuration
const SYSTEM_SETTINGS: SystemSetting[] = [
  {
    key: 'config.home_title',
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
    key: 'config.gallery_file_extensions',
    type: 'text',
    label: 'Gallery File Extensions',
    description:
      'Comma-separated list of file extensions to show in gallery (e.g., .jpg,.png,.gif)',
    defaultValue: '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.psd,.heif',
  },
  {
    key: 'config.gallery_show_hidden',
    type: 'boolean',
    label: 'Show Hidden Files',
    description: 'Show files and folders that start with a dot (.) in the gallery',
    defaultValue: false,
  },
]

export function AdminPage({ loaderData }: AdminPageProps) {
  return (
    <div className='space-y-6'>
      <SystemSettingsForm
        title='System Settings'
        description='Configure system-wide settings and user account policies.'
        settings={SYSTEM_SETTINGS}
        initialValues={loaderData?.registry || {}}
        systemRegistryList={loaderData?.systemRegistryList || []}
      />

      <StorageManagementSection storageStatus={loaderData?.storageStatus || null} />

      <ImagorManagementSection imagorStatus={loaderData?.imagorStatus || null} />
    </div>
  )
}

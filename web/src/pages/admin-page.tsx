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
]

export function AdminPage({ loaderData }: AdminPageProps) {
  return (
    <div className='space-y-6'>
      <SystemSettingsForm
        settings={SYSTEM_SETTINGS}
        initialValues={loaderData?.registry || {}}
        systemRegistryList={loaderData?.systemRegistryList || []}
      />
    </div>
  )
}

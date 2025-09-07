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
    key: 'config.allow_user_registration',
    type: 'boolean',
    label: 'Allow User Registration',
    description: 'Allow new users to register accounts themselves',
    defaultValue: true,
  },
  {
    key: 'config.default_user_role',
    type: 'select',
    label: 'Default User Role',
    description: 'Default role assigned to new users',
    defaultValue: 'viewer',
    options: ['viewer', 'editor'],
  },
  {
    key: 'config.require_email_verification',
    type: 'boolean',
    label: 'Require Email Verification',
    description: 'Require new users to verify their email addresses',
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

      <StorageManagementSection />
    </div>
  )
}

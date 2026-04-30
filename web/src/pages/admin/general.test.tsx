import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInvalidate = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

const mockUseAuth = vi.fn(() => ({
  authState: {
    multiTenant: false,
    profile: {
      role: 'admin',
    },
  },
}))

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next')

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    }),
  }
})

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock('@/api/registry-api', () => ({
  setSystemRegistryObject: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/stores/folder-tree-store', () => ({
  setHomeTitle: vi.fn(),
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, isLoading: _isLoading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      {...props}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <select
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
}))

vi.mock('@/components/ui/setting-row', () => ({
  SettingRow: ({ label, description, children }: any) => (
    <div>
      <div>{label}</div>
      <div>{description}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('@/components/ui/settings-section', () => ({
  SettingsSection: ({ title, children }: any) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
}))

const loaderData = {
  breadcrumb: { translationKey: 'pages.admin.sections.general' },
  registry: {
    'config.app_home_title': 'Home',
    'config.allow_guest_mode': 'false',
    'config.app_default_language': 'en',
    'config.app_default_sort_by': 'MODIFIED_TIME',
    'config.app_default_sort_order': 'DESC',
    'config.app_show_file_names': 'false',
  },
  systemRegistryList: [
    {
      key: 'config.app_home_title',
      value: 'Home',
      isEncrypted: false,
      isOverriddenByConfig: false,
    },
    {
      key: 'config.allow_guest_mode',
      value: 'false',
      isEncrypted: false,
      isOverriddenByConfig: false,
    },
    {
      key: 'config.app_default_language',
      value: 'en',
      isEncrypted: false,
      isOverriddenByConfig: false,
    },
    {
      key: 'config.app_default_sort_by',
      value: 'MODIFIED_TIME',
      isEncrypted: false,
      isOverriddenByConfig: false,
    },
    {
      key: 'config.app_default_sort_order',
      value: 'DESC',
      isEncrypted: false,
      isOverriddenByConfig: false,
    },
    {
      key: 'config.app_show_file_names',
      value: 'false',
      isEncrypted: false,
      isOverriddenByConfig: false,
    },
  ],
}

describe('AdminGeneralSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvalidate.mockResolvedValue(undefined)
  })

  it('allows self-hosted admins to edit and save non-overridden settings', async () => {
    const { AdminGeneralSection } = await import('./general')

    render(<AdminGeneralSection loaderData={loaderData} />)

    const titleInput = screen.getByDisplayValue('Home') as HTMLInputElement
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Dashboard' } })
    })
    expect(titleInput.value).toBe('Dashboard')

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    await act(async () => {
      fireEvent.click(checkboxes[0])
    })
    expect(checkboxes[0].checked).toBe(true)
    expect(mockToastError).not.toHaveBeenCalled()
  })
})

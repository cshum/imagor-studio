import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SystemSettingsForm, type SystemSetting } from './system-settings-form'

const mockInvalidate = vi.fn()

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next')

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/api/registry-api', () => ({
  setSystemRegistryObject: vi.fn(),
}))

vi.mock('@/stores/folder-tree-store', () => ({
  setHomeTitle: vi.fn(),
}))

vi.mock('@/stores/license-store', () => ({
  licenseStore: {
    useStore: () => ({ isLicensed: true }),
  },
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

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
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
  SettingsSection: ({ title, description, children }: any) => (
    <section>
      <div>{title}</div>
      <div>{description}</div>
      {children}
    </section>
  ),
}))

const settings: SystemSetting[] = [
  {
    key: 'config.app_video_thumbnail_position',
    type: 'select',
    label: 'Video thumbnail position',
    description: 'Description',
    defaultValue: 'first_frame',
    options: ['first_frame', 'seek_1s'],
  },
  {
    key: 'config.app_home_title',
    type: 'text',
    label: 'Home title',
    description: 'Home title description',
    defaultValue: 'Home',
  },
]

describe('SystemSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resynchronizes field values when incoming initialValues change', async () => {
    const { rerender } = render(
      <SystemSettingsForm
        settings={settings}
        initialValues={{
          'config.app_video_thumbnail_position': 'first_frame',
          'config.app_home_title': 'Home',
        }}
      />,
    )

    const titleInput = screen.getByDisplayValue('Home') as HTMLInputElement

    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Draft title' } })
    })

    expect(titleInput.value).toBe('Draft title')
    expect((screen.getByText('common.buttons.updateSettings') as HTMLButtonElement).disabled).toBe(
      false,
    )

    rerender(
      <SystemSettingsForm
        settings={settings}
        initialValues={{
          'config.app_video_thumbnail_position': 'seek_1s',
          'config.app_home_title': 'Published title',
        }}
      />,
    )

    expect(screen.getByDisplayValue('Published title')).toBeTruthy()
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('seek_1s')
    expect((screen.getByText('common.buttons.updateSettings') as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
})

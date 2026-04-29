import { act } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()
const mockLogout = vi.fn()
const mockRefreshAuthSession = vi.fn()
const mockCreateOrganization = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockButton = vi.fn(({ children, ...props }: any) => <button {...props}>{children}</button>)

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock('@/api/org-api', () => ({
  createOrganization: () => mockCreateOrganization(),
}))

vi.mock('@/components/app-header', () => ({
  AppHeader: () => <div>app-header</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: (props: any) => mockButton(props),
}))

vi.mock('@/hooks/use-brand', () => ({
  useBrand: () => ({ title: 'Imagor Studio' }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => ({
    authState: {
      profile: {
        displayName: 'Alice',
        username: 'alice',
        avatarUrl: null,
      },
    },
    logout: mockLogout,
    refreshAuthSession: mockRefreshAuthSession,
  }),
}))

describe('WorkspaceRequiredPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an organization and restores the authenticated workspace session', async () => {
    const { WorkspaceRequiredPage } = await import('./workspace-required-page')

    mockCreateOrganization.mockResolvedValue({ id: 'org-1' })
    mockRefreshAuthSession.mockResolvedValue(undefined)
    mockInvalidate.mockResolvedValue(undefined)

    render(<WorkspaceRequiredPage />)

    await act(async () => {
      await mockButton.mock.calls[0][0].onClick()
    })

    expect(mockCreateOrganization).toHaveBeenCalled()
    expect(mockRefreshAuthSession).toHaveBeenCalled()
    expect(mockInvalidate).toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalledWith('pages.workspaceRequired.actions.createSuccess')
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })
})

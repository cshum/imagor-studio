import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockInvalidate = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => null,
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('@/components/app-header.tsx', () => ({
  AppHeader: vi.fn(({ accountLinks }: { accountLinks?: Array<{ label: string }> }) => (
    <div>
      <div>app-header</div>
      <div>{accountLinks?.map((link) => link.label).join(',') ?? ''}</div>
    </div>
  )),
}))

vi.mock('@/hooks/use-brand', () => ({
  useBrand: () => ({ title: 'Imagor Studio' }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => ({
    authState: {
      multiTenant: true,
      profile: {
        displayName: 'Alice',
        username: 'alice',
        avatarUrl: null,
        role: 'member',
      },
    },
    logout: mockLogout,
  }),
}))

describe('SpacesLayout', () => {
  it('hides the organization account link for no-org guests', async () => {
    const { SpacesLayout } = await import('./spaces-layout')

    render(<SpacesLayout title='Spaces' showOrganizationLink={false} />)

    expect(screen.queryByText('navigation.breadcrumbs.organization')).toBeNull()
  })

  it('shows the organization account link when the user has an organization', async () => {
    const { SpacesLayout } = await import('./spaces-layout')

    render(<SpacesLayout title='Spaces' showOrganizationLink />)

    expect(screen.getByText('navigation.breadcrumbs.organization')).toBeTruthy()
  })

  it('invalidates the router cache before navigating to login on logout', async () => {
    const { SpacesLayout } = await import('./spaces-layout')

    render(<SpacesLayout title='Spaces' showOrganizationLink />)

    const { AppHeader } = await import('@/components/app-header.tsx')
    const headerCalls = vi.mocked(AppHeader).mock.calls
    const headerCall = headerCalls[headerCalls.length - 1]
    expect(headerCall?.[0]).toBeTruthy()

    await headerCall?.[0].onLogout()

    expect(mockLogout).toHaveBeenCalled()
    expect(mockInvalidate).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })
})

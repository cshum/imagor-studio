import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => null,
  useNavigate: () => mockNavigate,
}))

vi.mock('@/components/app-header.tsx', () => ({
  AppHeader: ({ accountLinks }: { accountLinks?: Array<{ label: string }> }) => (
    <div>
      <div>app-header</div>
      <div>{accountLinks?.map((link) => link.label).join(',') ?? ''}</div>
    </div>
  ),
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
})

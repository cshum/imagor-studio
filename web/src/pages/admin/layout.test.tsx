import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseMatches = vi.fn()
const mockUseRouterState = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid='admin-outlet' />,
  useMatches: () => mockUseMatches(),
  useRouterState: () => mockUseRouterState(),
}))

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the heading from the committed matched route', async () => {
    const { AdminLayout } = await import('./layout')

    mockUseMatches.mockReturnValue([
      { pathname: '/account/admin' },
      { pathname: '/account/admin/storage' },
    ])
    mockUseRouterState.mockReturnValue({
      location: { pathname: '/account/admin' },
    })

    render(<AdminLayout />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'pages.admin.sections.storage',
    )
    expect(screen.getByTestId('admin-outlet')).toBeTruthy()
  })
})
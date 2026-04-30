import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useBreadcrumb } from './use-breadcrumb'

const { mockUseMatches } = vi.hoisted(() => ({
  mockUseMatches: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useMatches: () => mockUseMatches(),
}))

function BreadcrumbHarness() {
  const breadcrumbs = useBreadcrumb()

  return (
    <div>
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={`${breadcrumb.label}-${index}`}>{breadcrumb.label}</div>
      ))}
    </div>
  )
}

describe('useBreadcrumb', () => {
  it('prefers a route breadcrumb array over an inherited root breadcrumb when they share the same target', () => {
    mockUseMatches.mockReturnValue([
      {
        pathname: '/',
        loaderData: {
          breadcrumb: {
            label: 'Home',
            href: '/',
          },
        },
      },
      {
        pathname: '/',
        loaderData: {
          breadcrumbs: [
            {
              label: 'Home',
              path: '/',
            },
          ],
        },
      },
    ])

    render(<BreadcrumbHarness />)

    expect(screen.getAllByText('Home')).toHaveLength(1)
  })
})

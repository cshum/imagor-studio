import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseBrand = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/use-brand', () => ({
  useBrand: () => mockUseBrand(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('BrandBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBrand.mockReturnValue({
      title: 'Imagor Studio',
      url: 'https://imagor.net',
    })
    mockUseAuth.mockReturnValue({
      authState: {
        multiTenant: true,
      },
    })
  })

  it('uses an internal root link for multi-tenant default branding', async () => {
    const { BrandBar } = await import('./brand-bar')

    render(<BrandBar />)

    const link = screen.getByRole('link', { name: 'Imagor Studio' })
    expect(link.getAttribute('href')).toBe('/')
    expect(link.getAttribute('target')).toBeNull()
  })

  it('keeps the external brand URL for self-hosted branding', async () => {
    mockUseAuth.mockReturnValue({
      authState: {
        multiTenant: false,
      },
    })

    const { BrandBar } = await import('./brand-bar')

    render(<BrandBar />)

    const link = screen.getByRole('link', { name: 'Imagor Studio' })
    expect(link.getAttribute('href')).toBe('https://imagor.net')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTitle } from './use-title'

const { mockUseBrand, mockUseBreadcrumb } = vi.hoisted(() => ({
  mockUseBrand: vi.fn(),
  mockUseBreadcrumb: vi.fn(),
}))

vi.mock('./use-brand', () => ({
  useBrand: () => mockUseBrand(),
}))

vi.mock('./use-breadcrumb', () => ({
  useBreadcrumb: () => mockUseBreadcrumb(),
}))

function TitleHarness() {
  useTitle()
  return null
}

describe('useTitle', () => {
  beforeEach(() => {
    document.title = 'Initial Title'
    mockUseBrand.mockReturnValue({ title: 'Imagor Studio' })
  })

  it('keeps the space name in the browser title for a space home page', () => {
    mockUseBreadcrumb.mockReturnValue([{ label: 'Demo 3', preserveLabelInTitle: true }])

    render(<TitleHarness />)

    expect(document.title).toBe('Demo 3 | Imagor Studio')
  })

  it('keeps the app title for a non-space home breadcrumb', () => {
    mockUseBreadcrumb.mockReturnValue([{ label: 'Home' }])

    render(<TitleHarness />)

    expect(document.title).toBe('Imagor Studio')
  })
})

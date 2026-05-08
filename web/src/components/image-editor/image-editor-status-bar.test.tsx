import type { ComponentProps, ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageEditorStatusBar } from './image-editor-status-bar'

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next')

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const defaultRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 100,
  bottom: 20,
  width: 100,
  height: 20,
  toJSON: () => ({}),
} satisfies DOMRect

describe('ImageEditorStatusBar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('highlights only the active image() token for layer-driven keys', () => {
    render(
      <ImageEditorStatusBar
        imagorPath='/filters:image(/fit-in/100x200/cat.jpg,10,20):text(hello,20,30):quality(80)/'
        activeStatusBarKeys={['layer:0']}
      />,
    )

    const filtersToken = screen.getByRole('button', { name: 'filters' })
    const imageToken = screen.getByRole('button', {
      name: /image\(\/fit-in\/100x200\/cat\.jpg,10,20\)/,
    })
    const textToken = screen.getByRole('button', { name: /text\(hello,20,30\)/ })
    const qualityToken = screen.getByRole('button', { name: /quality\(80\)/ })

    expect(filtersToken.getAttribute('data-status-bar-highlighted')).toBeNull()
    expect(imageToken.getAttribute('data-status-bar-highlighted')).toBe('true')
    expect(textToken.getAttribute('data-status-bar-highlighted')).toBeNull()
    expect(qualityToken.getAttribute('data-status-bar-highlighted')).toBeNull()
  })

  it('auto-scrolls when the highlighted token is outside the visible area', () => {
    const rectMap = new WeakMap<Element, DOMRect>()
    const scrollIntoView = vi.fn()

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return rectMap.get(this) ?? defaultRect
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    const { container, rerender } = render(
      <ImageEditorStatusBar imagorPath='/filters:image(/fit-in/100x200/cat.jpg,10,20)/' />,
    )

    const scroller = container.querySelector('[data-status-bar-scroller="true"]')
    const imageToken = screen.getByRole('button', {
      name: /image\(\/fit-in\/100x200\/cat\.jpg,10,20\)/,
    })

    expect(scroller).not.toBeNull()

    rectMap.set(scroller!, { ...defaultRect, left: 0, right: 120 } as DOMRect)
    rectMap.set(imageToken, { ...defaultRect, left: 150, right: 240 } as DOMRect)

    rerender(
      <ImageEditorStatusBar
        imagorPath='/filters:image(/fit-in/100x200/cat.jpg,10,20)/'
        activeStatusBarKeys={['layer:0']}
      />,
    )

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('does not auto-scroll when the highlighted token is already visible', () => {
    const rectMap = new WeakMap<Element, DOMRect>()
    const scrollIntoView = vi.fn()

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return rectMap.get(this) ?? defaultRect
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    const { container, rerender } = render(
      <ImageEditorStatusBar imagorPath='/filters:text(hello,10,20,sans,ffffff,0,normal,0,low,false,word,0)/' />,
    )

    const scroller = container.querySelector('[data-status-bar-scroller="true"]')
    const textToken = screen.getByRole('button', {
      name: /text\(hello,10,20,sans,ffffff,0,normal,0,low,false,word,0\)/,
    })

    expect(scroller).not.toBeNull()

    rectMap.set(scroller!, { ...defaultRect, left: 0, right: 300 } as DOMRect)
    rectMap.set(textToken, { ...defaultRect, left: 60, right: 220 } as DOMRect)

    rerender(
      <ImageEditorStatusBar
        imagorPath='/filters:text(hello,10,20,sans,ffffff,0,normal,0,low,false,word,0)/'
        activeStatusBarKeys={['layer:0']}
      />,
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('emits layer token clicks with the token match keys', () => {
    const onTokenClick = vi.fn()

    render(
      <ImageEditorStatusBar
        imagorPath='/filters:image(/fit-in/100x200/cat.jpg,10,20):quality(80)/'
        sourceImagePath='base/photo.jpg'
        onTokenClick={onTokenClick}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /image\(\/fit-in\/100x200\/cat\.jpg,10,20\)/ }),
    )

    expect(onTokenClick).toHaveBeenCalledWith(['filters', 'image', 'layer:0'])
  })

  it('renders the raw outer source image path when provided', () => {
    render(<ImageEditorStatusBar imagorPath='/fit-in/1200x800/' sourceImagePath='base/photo.jpg' />)

    expect(screen.getByText('base/photo.jpg')).toBeTruthy()
  })
})

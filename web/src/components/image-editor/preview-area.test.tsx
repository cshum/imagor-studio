import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PreviewArea } from './preview-area'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => true,
}))

vi.mock('@/components/image-editor/crop-overlay', () => ({
  CropOverlay: () => null,
}))

vi.mock('@/components/image-editor/layer-breadcrumb', () => ({
  LayerBreadcrumb: () => null,
}))

vi.mock('@/components/image-editor/layer-overlay', () => ({
  LayerOverlay: () => null,
}))

vi.mock('@/components/image-editor/layer-regions-overlay', () => ({
  LayerRegionsOverlay: () => null,
}))

vi.mock('@/components/image-editor/text-edit-overlay', () => ({
  TextEditOverlay: () => null,
}))

vi.mock('@/components/license/license-badge.tsx', () => ({
  LicenseBadge: () => null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/preload-image', () => ({
  PreloadImage: React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
    (props, ref) => <img ref={ref} {...props} />,
  ),
}))

vi.mock('@/lib/api-utils', () => ({
  getFullImageUrl: (url: string) => url,
}))

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

let mockRectWidth = 600
let mockRectHeight = 400

describe('PreviewArea', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    mockRectWidth = 600
    mockRectHeight = 400
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: mockRectHeight,
      right: mockRectWidth,
      width: mockRectWidth,
      height: mockRectHeight,
      toJSON: () => ({}),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('recalculates preview dimensions after drag ends even when column emptiness is unchanged', () => {
    const onPreviewDimensionsChange = vi.fn()
    mockRectWidth = 540

    const { rerender } = render(
      <PreviewArea
        previewUrl='/preview.jpg'
        error={null}
        onCopyUrl={() => {}}
        onPreviewDimensionsChange={onPreviewDimensionsChange}
        isLeftColumnEmpty={true}
        isRightColumnEmpty={false}
        isSectionDragActive={true}
      />,
    )

    expect(onPreviewDimensionsChange).toHaveBeenCalledTimes(1)
    expect(onPreviewDimensionsChange).toHaveBeenLastCalledWith({ width: 508, height: 368 })

    onPreviewDimensionsChange.mockClear()
    mockRectWidth = 600

    rerender(
      <PreviewArea
        previewUrl='/preview.jpg'
        error={null}
        onCopyUrl={() => {}}
        onPreviewDimensionsChange={onPreviewDimensionsChange}
        isLeftColumnEmpty={true}
        isRightColumnEmpty={false}
        isSectionDragActive={false}
      />,
    )

    expect(onPreviewDimensionsChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onPreviewDimensionsChange).toHaveBeenCalledTimes(1)
    expect(onPreviewDimensionsChange).toHaveBeenLastCalledWith({ width: 568, height: 368 })
  })

  it('does not schedule the delayed recalculation while drag stays active', () => {
    const onPreviewDimensionsChange = vi.fn()

    const { rerender } = render(
      <PreviewArea
        previewUrl='/preview.jpg'
        error={null}
        onCopyUrl={() => {}}
        onPreviewDimensionsChange={onPreviewDimensionsChange}
        isLeftColumnEmpty={true}
        isRightColumnEmpty={false}
        isSectionDragActive={false}
      />,
    )

    expect(onPreviewDimensionsChange).toHaveBeenCalledTimes(1)
    onPreviewDimensionsChange.mockClear()

    rerender(
      <PreviewArea
        previewUrl='/preview.jpg'
        error={null}
        onCopyUrl={() => {}}
        onPreviewDimensionsChange={onPreviewDimensionsChange}
        isLeftColumnEmpty={true}
        isRightColumnEmpty={false}
        isSectionDragActive={true}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onPreviewDimensionsChange).not.toHaveBeenCalled()
  })

  it('hides the headerless undo redo overlay when both actions are unavailable', () => {
    render(
      <PreviewArea
        previewUrl='/preview.jpg'
        error={null}
        onCopyUrl={() => {}}
        showHeaderlessEditActions={true}
        canUndo={false}
        canRedo={false}
      />,
    )

    expect(screen.queryByTitle('imageEditor.page.undo')).toBeNull()
    expect(screen.queryByTitle('imageEditor.page.redo')).toBeNull()
  })

  it('shows a headerless back button and triggers the handler', () => {
    const onBack = vi.fn()

    render(
      <PreviewArea
        previewUrl='/preview.jpg'
        error={null}
        onCopyUrl={() => {}}
        showHeaderlessBackButton={true}
        onBack={onBack}
      />,
    )

    expect(screen.getByText('imageEditor.page.back')).toBeTruthy()
    screen.getByLabelText('imageEditor.page.back').click()

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

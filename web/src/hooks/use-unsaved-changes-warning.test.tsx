import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useUnsavedChangesWarning } from './use-unsaved-changes-warning'

const { mockUseBlocker } = vi.hoisted(() => ({
  mockUseBlocker: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useBlocker: (options: unknown) => mockUseBlocker(options),
}))

function HookHarness({
  enabled = true,
  hasUnsavedChanges = true,
}: {
  enabled?: boolean
  hasUnsavedChanges?: boolean
}) {
  const { showDialog } = useUnsavedChangesWarning(hasUnsavedChanges, { enabled })

  return <div>{showDialog ? 'blocked' : 'idle'}</div>
}

describe('useUnsavedChangesWarning', () => {
  it('does not register a beforeunload listener when disabled', () => {
    mockUseBlocker.mockReturnValue({
      status: 'idle',
      proceed: vi.fn(),
      reset: vi.fn(),
    })

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    render(<HookHarness enabled={false} hasUnsavedChanges />)

    expect(screen.getByText('idle')).toBeTruthy()
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function))

    const useBlockerArgs = mockUseBlocker.mock.calls[0]?.[0] as {
      shouldBlockFn: () => boolean
    }
    expect(useBlockerArgs.shouldBlockFn()).toBe(false)

    addEventListenerSpy.mockRestore()
  })
})
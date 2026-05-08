import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  beforeEach(() => {
    mockUseBlocker.mockReset()
  })

  it('enables navigation blocking and unload prompts when dirty and enabled', () => {
    const proceed = vi.fn()
    const reset = vi.fn()

    mockUseBlocker.mockReturnValue({
      status: 'blocked',
      proceed,
      reset,
    })

    render(<HookHarness enabled hasUnsavedChanges />)

    expect(screen.getByText('blocked')).toBeTruthy()

    const useBlockerArgs = mockUseBlocker.mock.calls[0]?.[0] as {
      shouldBlockFn: () => boolean
      enableBeforeUnload: () => boolean
      disabled: boolean
    }
    expect(useBlockerArgs.shouldBlockFn()).toBe(true)
    expect(useBlockerArgs.enableBeforeUnload()).toBe(true)
    expect(useBlockerArgs.disabled).toBe(false)
  })

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
      enableBeforeUnload: () => boolean
      disabled: boolean
    }
    expect(useBlockerArgs.shouldBlockFn()).toBe(false)
    expect(useBlockerArgs.enableBeforeUnload()).toBe(false)
    expect(useBlockerArgs.disabled).toBe(true)

    addEventListenerSpy.mockRestore()
  })
})

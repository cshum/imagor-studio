import { useCallback, useEffect, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'

/**
 * Hook to warn users about unsaved changes when navigating away.
 * Uses TanStack Router's blocker for both in-app navigation and browser unload prompts.
 *
 * @param hasUnsavedChanges - Whether there are unsaved changes (boolean or function returning boolean)
 * @returns Dialog state and handlers for the confirmation dialog
 *
 * @example
 * ```tsx
 * const { showDialog, handleConfirm, handleCancel } = useUnsavedChangesWarning(isDirty)
 *
 * return (
 *   <>
 *     <YourComponent />
 *     <ConfirmNavigationDialog
 *       open={showDialog}
 *       onOpenChange={handleCancel}
 *       onConfirm={handleConfirm}
 *     />
 *   </>
 * )
 * ```
 */
interface UseUnsavedChangesWarningOptions {
  enabled?: boolean
}

export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean | (() => boolean),
  options?: UseUnsavedChangesWarningOptions,
) {
  const enabled = options?.enabled ?? true
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  // Helper to get the current unsaved changes state
  const getHasUnsavedChanges = useCallback(() => {
    return typeof hasUnsavedChanges === 'function' ? hasUnsavedChanges() : hasUnsavedChanges
  }, [hasUnsavedChanges])

  // TanStack Router owns both route blocking and beforeunload handling here.
  const blocker = useBlocker({
    shouldBlockFn: () => enabled && getHasUnsavedChanges(),
    enableBeforeUnload: () => enabled && getHasUnsavedChanges(),
    disabled: !enabled,
    withResolver: true,
  })

  // Handle TanStack Router blocker (in-app navigation)
  useEffect(() => {
    if (!enabled) {
      setShowDialog(false)
      setPendingNavigation(null)
      return
    }

    if (blocker.status === 'blocked') {
      setShowDialog((current) => current || true)
      setPendingNavigation((current) => current ?? (() => blocker.proceed()))
    }
  }, [enabled, blocker.status, blocker.proceed])

  // Handle navigation confirmation (user clicks "Leave")
  const handleConfirm = useCallback(() => {
    setShowDialog(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }, [pendingNavigation])

  // Handle navigation cancellation (user clicks "Stay" or closes dialog)
  const handleCancel = useCallback(() => {
    setShowDialog(false)
    setPendingNavigation(null)
    if (enabled && blocker.status === 'blocked') {
      blocker.reset()
    }
  }, [enabled, blocker])

  return {
    showDialog,
    handleConfirm,
    handleCancel,
  }
}

import { useCallback, useEffect, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'

/**
 * Hook to warn users about unsaved changes when navigating away.
 * Handles both browser navigation (closing tab/window) and in-app navigation.
 *
 * @param hasUnsavedChanges - Whether there are unsaved changes
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
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  // Block in-app navigation when there are unsaved changes
  // Using new API with withResolver to get blocker object
  const blocker = useBlocker({
    shouldBlockFn: () => hasUnsavedChanges,
    withResolver: true,
  })

  // Handle browser beforeunload event (closing tab/window or external navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        // Modern browsers ignore custom messages and show their own
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle TanStack Router blocker (in-app navigation)
  useEffect(() => {
    if (blocker.status === 'blocked') {
      setShowDialog(true)
      setPendingNavigation(() => () => blocker.proceed())
    }
  }, [blocker.status, blocker])

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
    if (blocker.status === 'blocked') {
      blocker.reset()
    }
  }, [blocker])

  return {
    showDialog,
    handleConfirm,
    handleCancel,
  }
}

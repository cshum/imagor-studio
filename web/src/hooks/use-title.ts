import { useEffect } from 'react'

import { useBreadcrumb } from './use-breadcrumb'

/**
 * Hook to dynamically update the document title based on the current breadcrumb
 * Formats the title as "{Current Page} | Imagor Studio"
 */
export function useTitle(): void {
  const breadcrumbs = useBreadcrumb()

  useEffect(() => {
    if (!breadcrumbs?.length) {
      return
    }
    // Find the last breadcrumb in the chain)
    const activeBreadcrumb = breadcrumbs[breadcrumbs.length - 1]

    if (activeBreadcrumb?.label) {
      // Format as "Current Page | Imagor Studio"
      document.title = `${activeBreadcrumb.label} | Imagor Studio`
    } else {
      // Fallback to just "Imagor Studio" if no active breadcrumb
      document.title = 'Imagor Studio'
    }
  }, [breadcrumbs])
}

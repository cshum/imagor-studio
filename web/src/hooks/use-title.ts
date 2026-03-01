import { useEffect } from 'react'

import { useBrand } from './use-brand'
import { useBreadcrumb } from './use-breadcrumb'

/**
 * Hook to dynamically update the document title based on the current breadcrumb
 * Formats the title as "{Current Page} | Imagor Studio"
 */
export function useTitle(): void {
  const breadcrumbs = useBreadcrumb()
  const { title: appTitle } = useBrand()

  useEffect(() => {
    if (!breadcrumbs?.length) {
      return
    }
    // Find the last breadcrumb in the chain
    const activeBreadcrumb = breadcrumbs[breadcrumbs.length - 1]
    const homeTitle = breadcrumbs[0].label

    if (activeBreadcrumb?.label && activeBreadcrumb?.label !== homeTitle) {
      document.title = `${activeBreadcrumb.label} · ${homeTitle} | ${appTitle}`
    } else {
      document.title = `${homeTitle} | ${appTitle}`
    }
  }, [breadcrumbs, appTitle])
}

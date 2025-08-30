import { useMemo } from 'react'
import { useMatches } from '@tanstack/react-router'
import type { GalleryLoaderData } from '@/loaders/gallery-loader.ts'

export interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

interface BreadcrumbContext {
  label?: string | ((loaderData: unknown, params: unknown) => string)
  fromLoader?: boolean
  hidden?: boolean
}

interface RouteMatch {
  context: {
    breadcrumb?: BreadcrumbContext
  }
  loaderData?: unknown
  params?: Record<string, string>
  pathname: string
}

export function useBreadcrumb(): BreadcrumbItem[] {
  const matches = useMatches()

  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = []

    // Process matches that have breadcrumb context
    matches.forEach((match, index) => {
      const typedMatch = match as RouteMatch
      const breadcrumbInfo = typedMatch.context?.breadcrumb

      if (!breadcrumbInfo) return

      // Handle loader-based breadcrumbs (for gallery route)
      if (breadcrumbInfo.fromLoader) {
        const loaderData = typedMatch.loaderData as GalleryLoaderData
        if (loaderData?.breadcrumbs) {
          // Add all breadcrumbs from the loader
          loaderData.breadcrumbs.forEach((breadcrumb, breadcrumbIndex) => {
            const isActive = index === matches.length - 1 && breadcrumbIndex === loaderData.breadcrumbs.length - 1
            breadcrumbs.push({
              label: breadcrumb.label,
              href: isActive ? undefined : breadcrumb.href,
              isActive,
            })
          })
        }
        return
      }

      // Handle regular breadcrumb info (object with label)
      const label = typeof breadcrumbInfo.label === 'function'
        ? breadcrumbInfo.label(typedMatch.loaderData, typedMatch.params)
        : breadcrumbInfo.label

      // Skip if label is empty or hidden
      if (!label || breadcrumbInfo.hidden) return

      // Determine if this is the active (last) breadcrumb
      const isActive = index === matches.length - 1

      // Build href for navigation (exclude active breadcrumb)
      const href = !isActive ? typedMatch.pathname : undefined

      breadcrumbs.push({
        label,
        href,
        isActive,
      })
    })

    return breadcrumbs
  }, [matches])
}

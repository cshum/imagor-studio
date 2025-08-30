import { useMemo } from 'react'
import { useMatches } from '@tanstack/react-router'

export interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

interface RouteMatch {
  context: any
  loaderData?: any
  params?: Record<string, string>
  pathname: string
}

// Type guard functions
export function isBreadcrumbItem(obj: unknown): obj is BreadcrumbItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'label' in obj &&
    typeof (obj as any).label === 'string'
  )
}

export function isBreadcrumbItems(obj: unknown): obj is BreadcrumbItem[] {
  return Array.isArray(obj) && obj.every(isBreadcrumbItem)
}

export function useBreadcrumb(): BreadcrumbItem[] {
  const matches = useMatches()
  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = []

    // Process matches that have breadcrumb data
    matches.forEach((match, index) => {
      const typedMatch = match as RouteMatch
      const loaderData = typedMatch.loaderData

      // Check in priority order:
      // 1. loaderData.breadcrumbs (array)
      // 2. loaderData.breadcrumb (single)

      if (isBreadcrumbItems(loaderData?.breadcrumbs)) {
        // Handle breadcrumb array from loader data
        loaderData.breadcrumbs.forEach((breadcrumb: BreadcrumbItem, breadcrumbIndex: number) => {
          const isActive =
            index === matches.length - 1 && breadcrumbIndex === loaderData.breadcrumbs.length - 1
          breadcrumbs.push({
            ...breadcrumb,
            href: isActive ? undefined : breadcrumb.href,
            isActive,
          })
        })
        return
      }

      if (isBreadcrumbItem(loaderData?.breadcrumb)) {
        // Handle single breadcrumb from loader data
        const isActive = index === matches.length - 1
        breadcrumbs.push({
          ...loaderData.breadcrumb,
          href: isActive ? undefined : loaderData.breadcrumb.href || typedMatch.pathname,
          isActive,
        })
        return
      }
    })

    return breadcrumbs
  }, [matches])
}

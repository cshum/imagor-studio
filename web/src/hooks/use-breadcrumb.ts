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
      const context = typedMatch.context
      const loaderData = typedMatch.loaderData

      // Check in priority order:
      // 1. context.breadcrumbs (array) - highest priority
      // 2. loaderData.breadcrumbs (array)
      // 3. context.breadcrumb (single) - only if it's a direct BreadcrumbItem, not a context object
      // 4. loaderData.breadcrumb (single)
      // 5. fallback to existing label-based approach

      if (isBreadcrumbItems(context?.breadcrumbs)) {
        // Handle breadcrumb array from context
        context.breadcrumbs.forEach((breadcrumb: BreadcrumbItem, breadcrumbIndex: number) => {
          const isActive = index === matches.length - 1 && breadcrumbIndex === context.breadcrumbs.length - 1
          breadcrumbs.push({
            ...breadcrumb,
            href: isActive ? undefined : breadcrumb.href,
            isActive,
          })
        })
        return
      }

      if (isBreadcrumbItems(loaderData?.breadcrumbs)) {
        // Handle breadcrumb array from loader data
        loaderData.breadcrumbs.forEach((breadcrumb: BreadcrumbItem, breadcrumbIndex: number) => {
          const isActive = index === matches.length - 1 && breadcrumbIndex === loaderData.breadcrumbs.length - 1
          breadcrumbs.push({
            ...breadcrumb,
            href: isActive ? undefined : breadcrumb.href,
            isActive,
          })
        })
        return
      }

      // Check if context.breadcrumb is a direct BreadcrumbItem (not a context object with label property)
      if (isBreadcrumbItem(context?.breadcrumb) && !('label' in context.breadcrumb && typeof context.breadcrumb.label === 'function')) {
        // Handle single breadcrumb from context
        const isActive = index === matches.length - 1
        breadcrumbs.push({
          ...context.breadcrumb,
          href: isActive ? undefined : context.breadcrumb.href || typedMatch.pathname,
          isActive,
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

      // Fallback to existing label-based approach
      const breadcrumbInfo = context?.breadcrumb
      if (!breadcrumbInfo) return

      // Handle regular breadcrumb info (object with label)
      const label = typeof breadcrumbInfo.label === 'function'
        ? breadcrumbInfo.label(loaderData, typedMatch.params)
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

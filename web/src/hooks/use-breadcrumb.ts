import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMatches } from '@tanstack/react-router'

export interface BreadcrumbItem {
  label?: string
  translationKey?: string
  href?: string
  path?: string
  isActive?: boolean
}

interface RouteMatch {
  context: unknown
  loaderData?: {
    breadcrumb?: BreadcrumbItem
    breadcrumbs?: BreadcrumbItem[]
    [key: string]: unknown
  }
  params?: Record<string, string>
  pathname: string
}

// Type guard functions
export function isBreadcrumbItem(obj: unknown): obj is BreadcrumbItem {
  return typeof obj === 'object' && obj !== null && ('label' in obj || 'translationKey' in obj)
}

export function isBreadcrumbItems(obj: unknown): obj is BreadcrumbItem[] {
  return Array.isArray(obj) && obj.every(isBreadcrumbItem)
}

export function useBreadcrumb(): BreadcrumbItem[] {
  const { t } = useTranslation()
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
            index === matches.length - 1 && breadcrumbIndex === loaderData.breadcrumbs!.length - 1

          // Translate label if translationKey exists, otherwise use provided label
          const translatedLabel = breadcrumb.translationKey
            ? t(breadcrumb.translationKey)
            : breadcrumb.label || ''

          breadcrumbs.push({
            ...breadcrumb,
            label: translatedLabel,
            href: isActive ? undefined : breadcrumb.href,
            isActive,
          })
        })
      } else if (isBreadcrumbItem(loaderData?.breadcrumb)) {
        // Handle single breadcrumb from loader data
        const isActive = index === matches.length - 1
        const breadcrumb = loaderData.breadcrumb

        // Translate label if translationKey exists, otherwise use provided label
        const translatedLabel = breadcrumb.translationKey
          ? t(breadcrumb.translationKey)
          : breadcrumb.label || ''

        breadcrumbs.push({
          ...breadcrumb,
          label: translatedLabel,
          href: isActive ? undefined : breadcrumb.href || typedMatch.pathname,
          isActive,
        })
      }
    })

    return breadcrumbs
  }, [matches, t])
}

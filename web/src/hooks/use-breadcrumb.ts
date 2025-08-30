import { useMemo } from 'react'
import { useMatches, useRouterState } from '@tanstack/react-router'

export interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

export function useBreadcrumb(): BreadcrumbItem[] {
  const matches = useMatches()
  const routerState = useRouterState()

  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with Home
    breadcrumbs.push({
      label: 'Home',
      href: '/',
    })

    // Find the current route match
    const currentMatch = matches[matches.length - 1]
    if (!currentMatch) return breadcrumbs

    const pathname = routerState.location.pathname

    // Handle account pages
    if (pathname.startsWith('/account')) {
      breadcrumbs.push({
        label: 'Account Settings',
        href: '/account/profile',
      })

      // Add specific account page
      if (pathname.includes('/admin')) {
        breadcrumbs.push({
          label: 'Admin',
          isActive: true,
        })
      } else if (pathname.includes('/users')) {
        breadcrumbs.push({
          label: 'Users',
          isActive: true,
        })
      } else if (pathname.includes('/profile')) {
        breadcrumbs.push({
          label: 'Profile',
          isActive: true,
        })
      }

      return breadcrumbs
    }

    // Handle gallery pages
    if (pathname.startsWith('/gallery')) {
      // Extract gallery key and image key from the current match
      const params = currentMatch.params as any
      const galleryKey = params?.galleryKey as string
      const imageKey = params?.imageKey as string

      if (galleryKey) {
        // Get gallery name from loader data if available
        const galleryLoaderData = currentMatch.loaderData as any

        // Always add Gallery as the base level
        breadcrumbs.push({
          label: 'Gallery',
          href: imageKey || galleryKey !== 'default' ? '/gallery/default' : undefined,
          isActive: galleryKey === 'default' && !imageKey,
        })

        // Build gallery path breadcrumbs for nested folders
        if (galleryKey !== 'default') {
          const pathSegments = galleryKey.split('/')
          let currentPath = ''

          pathSegments.forEach((segment, index) => {
            currentPath = currentPath ? `${currentPath}/${segment}` : segment
            const isLast = index === pathSegments.length - 1
            const segmentName = segment.charAt(0).toUpperCase() + segment.slice(1)

            breadcrumbs.push({
              label: isLast && galleryLoaderData?.galleryName ? galleryLoaderData.galleryName : segmentName,
              href: imageKey || !isLast ? `/gallery/${currentPath}` : undefined,
              isActive: !imageKey && isLast,
            })
          })
        }

        // Add image breadcrumb if viewing an image
        if (imageKey) {
          breadcrumbs.push({
            label: imageKey,
            isActive: true,
          })
        }
      }

      return breadcrumbs
    }

    // Default fallback
    return breadcrumbs
  }, [matches, routerState.location.pathname])
}

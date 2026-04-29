import { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'

import { AppHeader } from '@/components/app-header.tsx'
import { useBrand } from '@/hooks/use-brand'
import { useAuth } from '@/stores/auth-store'

// ── Layout ────────────────────────────────────────────────────────────────────
// Generic page-shell layout (no collapsible sidebar) used for flat account
// pages such as Spaces, Profile, etc.  `title` drives both the page heading
// and the breadcrumb segment shown after the app logo.

interface SpacesLayoutProps extends PropsWithChildren {
  title?: string
  description?: string
  primaryAction?: React.ReactNode
  showOrganizationLink?: boolean
}

export function SpacesLayout({
  children,
  title,
  description,
  primaryAction,
  showOrganizationLink = false,
}: SpacesLayoutProps) {
  const { t } = useTranslation()
  const { authState, logout } = useAuth()
  const navigate = useNavigate()
  const { title: appTitle } = useBrand()
  const accountLinks =
    authState.multiTenant && showOrganizationLink
      ? [
          {
            label: t('navigation.breadcrumbs.organization'),
            href: '/account/organization',
            icon: <Building2 className='text-muted-foreground mr-3 h-4 w-4' />,
          },
        ]
      : []

  const getUserDisplayName = () =>
    authState.profile?.displayName || authState.profile?.username || t('common.status.user')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div>
      <AppHeader
        profileLabel={getUserDisplayName()}
        roleLabel={authState.profile?.role}
        avatarUrl={authState.profile?.avatarUrl}
        onLogout={handleLogout}
        appTitle={appTitle}
        breadcrumbs={title ? [{ label: title }] : undefined}
        accountLinks={accountLinks}
      />

      {/* Content area — pt-14 clears the fixed header */}
      <main className='relative min-h-screen pt-14'>
        <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
          {(title || description || primaryAction) && (
            <div className='mb-6 flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between'>
              <div className='min-w-0 space-y-1'>
                {title && <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>}
                {description && <p className='text-muted-foreground text-sm'>{description}</p>}
              </div>
              {primaryAction && <div className='shrink-0'>{primaryAction}</div>}
            </div>
          )}
          {children || <Outlet />}
        </div>
      </main>
    </div>
  )
}

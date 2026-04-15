import { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'

import { AppShellHeader } from '@/components/app-shell-header'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
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
}

export function SpacesLayout({ children, title, description, primaryAction }: SpacesLayoutProps) {
  const { t } = useTranslation()
  const { authState, logout } = useAuth()
  const navigate = useNavigate()
  const { title: appTitle } = useBrand()

  const getUserDisplayName = () =>
    authState.profile?.displayName || authState.profile?.username || t('common.status.user')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div>
      <AppShellHeader
        profileLabel={getUserDisplayName()}
        roleLabel={authState.profile?.role}
        onLogout={handleLogout}
        profileText={t('layouts.account.tabs.profile')}
        signOutText={t('common.navigation.signOut')}
        moreText={t('common.buttons.more')}
        leftSlot={
          <div className='flex min-w-0 items-center'>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to='/' className='text-sm font-semibold'>
                      {appTitle}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {title && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        }
        mobileTitle={
          title ? (
            <span className='truncate text-sm font-medium'>{title}</span>
          ) : (
            <span className='text-sm font-semibold'>{appTitle}</span>
          )
        }
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

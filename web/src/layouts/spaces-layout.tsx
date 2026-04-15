import { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LayoutGrid } from 'lucide-react'

import { AppShellHeader } from '@/components/app-shell-header'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { useBrand } from '@/hooks/use-brand'
import { useAuth } from '@/stores/auth-store'

// ── Standalone layout for the Spaces list page ────────────────────────────────
// Used in multi-tenant (SaaS) mode where the spaces list is the primary
// landing page for admin users, not a nested section under AccountLayout.

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
          <div className='flex min-w-0 items-center gap-2'>
            <Link
              to='/'
              className='hidden text-base font-semibold transition-opacity hover:opacity-80 sm:block'
            >
              {appTitle}
            </Link>
            <div className='hidden sm:block'>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{t('layouts.account.tabs.spaces')}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className='flex items-center gap-2 sm:hidden'>
              <div className='bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md'>
                <LayoutGrid className='h-4 w-4' />
              </div>
              <span className='text-sm font-medium'>{t('layouts.account.tabs.spaces')}</span>
            </div>
          </div>
        }
        mobileTitle={
          <div className='flex items-center gap-2'>
            <div className='bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md'>
              <LayoutGrid className='h-4 w-4' />
            </div>
            <span className='text-sm font-medium'>{title || t('layouts.account.tabs.spaces')}</span>
          </div>
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

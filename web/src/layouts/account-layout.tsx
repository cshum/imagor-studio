import { PropsWithChildren, useEffect } from 'react'
import { Link, Outlet, useLocation } from '@tanstack/react-router'

import { HeaderBar } from '@/components/header-bar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { restoreScrollPosition, useScrollHandler } from '@/hooks/use-scroll-handler'
import { ContentLayout } from '@/layouts/content-layout'
import { useAuth } from '@/stores/auth-store'

export function AccountLayout({ children }: PropsWithChildren) {
  const { authState } = useAuth()
  const location = useLocation()
  const isAdmin = authState.profile?.role == 'admin'

  useScrollHandler(location.pathname)

  // Restore scroll position when pathname changes
  useEffect(() => {
    requestAnimationFrame(() => restoreScrollPosition(location.pathname))
  }, [location.pathname])

  // Determine current tab based on pathname
  const currentTab = location.pathname.includes('/admin')
    ? 'admin'
    : location.pathname.includes('/users')
      ? 'users'
      : 'profile'

  return (
    <ContentLayout title='Account Settings' isBounded={true}>
      <div className='mx-4 my-2 grid'>
        <h1 className='text-3xl md:text-4xl'>Account Settings</h1>
      </div>
      <HeaderBar />
      {/* Tab Navigation - Only show for admins */}
      {isAdmin && (
        <Tabs value={currentTab} className='w-full'>
          <TabsList className='mb-4 grid w-full grid-cols-3'>
            <TabsTrigger value='profile' asChild>
              <Link to='/account/profile'>Profile</Link>
            </TabsTrigger>
            <TabsTrigger value='admin' asChild>
              <Link to='/account/admin'>System</Link>
            </TabsTrigger>
            <TabsTrigger value='users' asChild>
              <Link to='/account/users'>Users</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <div className='mt-0'>{children || <Outlet />}</div>
    </ContentLayout>
  )
}

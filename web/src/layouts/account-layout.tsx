import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useRef } from 'react'

import { HeaderBar } from '@/components/header-bar'
import { LoadingBar } from '@/components/loading-bar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useScrollHandler } from '@/hooks/use-scroll-handler'
import { ContentLayout } from '@/layouts/content-layout'
import { useAuth } from '@/stores/auth-store'

interface AccountLayoutProps {
  children?: React.ReactNode
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const { authState } = useAuth()
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  const isAdmin = authState.profile?.role === 'admin'
  const isDesktop = useBreakpoint('md')
  
  // Determine current tab based on pathname
  const currentTab = location.pathname.includes('/admin') 
    ? 'admin' 
    : location.pathname.includes('/users') 
    ? 'users' 
    : 'profile'

  return (
    <>
      <LoadingBar isLoading={false} />
      <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <ContentLayout title="Account Settings" isBounded={true}>
          <div className='mx-4 my-2 grid'>
            <h1 className='text-3xl md:text-4xl'>Account Settings</h1>
          </div>
          <HeaderBar />
              {/* Tab Navigation */}
              <Tabs value={currentTab} className='w-full'>
                <TabsList className={`grid w-full mb-4 ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
                  <TabsTrigger value='profile' asChild>
                    <Link to='/account/profile'>Profile</Link>
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value='admin' asChild>
                      <Link to='/account/admin'>System</Link>
                    </TabsTrigger>
                  )}
                  {isAdmin && (
                    <TabsTrigger value='users' asChild>
                      <Link to='/account/users'>Users</Link>
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Tab Content */}
                <div className='mt-0'>
                  {children || <Outlet />}
                </div>
              </Tabs>
        </ContentLayout>
      </div>
    </>
  )
}

import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { FixedHeaderBar } from '@/components/demo/fixed-header-bar'
import { LoadingBar } from '@/components/loading-bar'
import { Card, CardContent } from '@/components/ui/card'
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
  const currentTab = location.pathname.includes('/admin') ? 'admin' : 'profile'

  const { scrollPosition } = useScrollHandler(containerRef, 'account')
  const isScrolledDown = scrollPosition > 22 + 8 + (isDesktop ? 40 : 30)

  return (
    <>
      <LoadingBar isLoading={false} />
      <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <ContentLayout title="Account Settings" isBounded={false}>
          <div className='mx-4 my-2 grid'>
            <h1 className='text-3xl md:text-4xl'>Account Settings</h1>
          </div>
          <FixedHeaderBar isScrolled={isScrolledDown} />
          <Card className='rounded-lg border-none'>
            <CardContent className='p-2 md:p-4'>
              {/* Tab Navigation */}
              <Tabs value={currentTab} className='w-full'>
                <TabsList className={`grid w-full mb-6 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <TabsTrigger value='profile' asChild>
                    <Link to='/account/profile'>Profile</Link>
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value='admin' asChild>
                      <Link to='/account/admin'>Admin</Link>
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Tab Content */}
                <div className='mt-0'>
                  {children || <Outlet />}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </ContentLayout>
      </div>
    </>
  )
}

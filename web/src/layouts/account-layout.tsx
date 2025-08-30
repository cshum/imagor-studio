import { Link, Outlet, useLocation } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContentLayout } from '@/layouts/content-layout'
import { useAuth } from '@/stores/auth-store'

interface AccountLayoutProps {
  children?: React.ReactNode
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const { authState } = useAuth()
  const location = useLocation()
  
  const isAdmin = authState.profile?.role === 'admin'
  
  // Determine current tab based on pathname
  const currentTab = location.pathname.includes('/admin') ? 'admin' : 'profile'

  return (
    <ContentLayout title='Account Settings'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to='/'>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Account Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='mt-4'>
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

          <div className='mt-0'>
            {children || <Outlet />}
          </div>
        </Tabs>
      </div>
    </ContentLayout>
  )
}

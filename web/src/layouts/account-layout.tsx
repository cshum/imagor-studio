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
    <div className='container px-0 pt-4 pb-8 sm:px-6 sm:pt-6'>
      {/* Page Title */}
      <div className='flex items-center gap-4 mb-4'>
        <h1 className='flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0'>
          Account Settings
        </h1>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb className='mb-6'>
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
    </div>
  )
}

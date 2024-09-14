import { cn } from '@/lib/utils'
import { Footer } from '@/components/admin-panel/footer'
import { Sidebar } from '@/components/admin-panel/sidebar'
import { PropsWithChildren } from 'react'
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx'

interface AdminPanelLayoutProps extends PropsWithChildren {
  hideFooter?: boolean; // New prop to control footer visibility
}

export function AdminPanelLayout({ children, hideFooter }: AdminPanelLayoutProps) {
  const { isOpen } = useSidebarToggle()

  return (
    <>
      <Sidebar/>
      <main
        className={cn(
          'min-h-[calc(100vh_-_56px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300',
          !isOpen ? 'lg:ml-[90px]' : 'lg:ml-72',
        )}
      >
        {children}
      </main>
      {!hideFooter && (
        <footer
          className={cn(
            'transition-[margin-left] ease-in-out duration-300',
            !isOpen ? 'lg:ml-[90px]' : 'lg:ml-72',
          )}
        >
          <Footer/>
        </footer>
      )}
    </>
  )
}

import { cn } from '@/lib/utils'
import { Footer } from '@/components/admin-panel/footer'
import { PropsWithChildren } from 'react'

interface AdminPanelLayoutProps extends PropsWithChildren {
  hideFooter?: boolean; // New prop to control footer visibility
}

export function AdminPanelLayout({ children, hideFooter }: AdminPanelLayoutProps) {
  return (
    <>
      <main
        className={cn(
          'min-h-[calc(100vh_-_56px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300',
        )}
      >
        {children}
      </main>
      {!hideFooter && (
        <footer
          className={cn(
            'transition-[margin-left] ease-in-out duration-300',
          )}
        >
          <Footer/>
        </footer>
      )}
    </>
  )
}

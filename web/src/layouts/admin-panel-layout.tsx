import { PropsWithChildren } from 'react'

import { Footer } from '@/components/admin-panel/footer'
import { cn } from '@/lib/utils'

interface AdminPanelLayoutProps extends PropsWithChildren {
  hideFooter?: boolean // New prop to control footer visibility
}

export function AdminPanelLayout({ children, hideFooter }: AdminPanelLayoutProps) {
  return (
    <>
      <main
        className={cn(
          'min-h-[calc(100vh_-_56px)] bg-zinc-50 transition-[margin-left] duration-300 ease-in-out dark:bg-zinc-900',
        )}
      >
        {children}
      </main>
      {!hideFooter && (
        <footer className={cn('transition-[margin-left] duration-300 ease-in-out')}>
          <Footer />
        </footer>
      )}
    </>
  )
}

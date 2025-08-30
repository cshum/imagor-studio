import { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

interface BasePanelLayoutProps extends PropsWithChildren {
}

export function BasePanelLayout({ children }: BasePanelLayoutProps) {
  return (
    <>
      <main
        className={cn(
          'min-h-[calc(100vh_-_56px)] bg-zinc-50 transition-[margin-left] duration-300 ease-in-out dark:bg-zinc-900',
        )}
      >
        {children}
      </main>
    </>
  )
}

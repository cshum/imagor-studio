import { PropsWithChildren } from 'react'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { FolderTreeSidebar } from '@/components/folder-tree/folder-tree-sidebar'
import { cn } from '@/lib/utils'

interface BasePanelLayoutProps extends PropsWithChildren {
}

export function BasePanelLayout({ children }: BasePanelLayoutProps) {
  return (
    <SidebarProvider>
      <FolderTreeSidebar />
      <SidebarInset>
        <main
          className={cn(
            'min-h-[calc(100vh_-_56px)] bg-zinc-50 transition-[margin-left] duration-300 ease-in-out dark:bg-zinc-900',
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

import { PropsWithChildren } from 'react'

import { FolderTreeSidebar } from '@/components/folder-tree/folder-tree-sidebar'
import { SidebarInset, SidebarWrapper } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type BasePanelLayoutProps = PropsWithChildren

export function BasePanelLayout({ children }: BasePanelLayoutProps) {
  return (
    <SidebarWrapper>
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
    </SidebarWrapper>
  )
}

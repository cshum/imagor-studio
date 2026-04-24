import { PropsWithChildren } from 'react'

import { FolderTreeSidebar } from '@/components/folder-tree/folder-tree-sidebar'
import { SidebarInset, SidebarWrapper } from '@/components/ui/sidebar'
import type { SpaceIdentity } from '@/lib/space'
import { cn } from '@/lib/utils'

type BasePanelLayoutProps = PropsWithChildren<{ space?: SpaceIdentity }>

export function SidebarLayout({ children, space }: BasePanelLayoutProps) {
  return (
    <SidebarWrapper>
      <FolderTreeSidebar space={space} />
      <SidebarInset>
        <main
          className={cn(
            'relative min-h-[calc(100vh_-_56px)] bg-zinc-50 transition-[margin-left] duration-200 ease-in-out dark:bg-zinc-900',
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarWrapper>
  )
}

import { PropsWithChildren } from 'react'

import { FolderTreeSidebar } from '@/components/folder-tree/folder-tree-sidebar'
import { LicenseBadge } from '@/components/license-badge'
import { SidebarInset, SidebarWrapper } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type BasePanelLayoutProps = PropsWithChildren

export function SidebarLayout({ children }: BasePanelLayoutProps) {
  return (
    <SidebarWrapper>
      <FolderTreeSidebar />
      <SidebarInset>
        <div className="relative">
          <div className="absolute top-4 right-4 z-10">
            <LicenseBadge variant="relative" />
          </div>
          <main
            className={cn(
              'min-h-[calc(100vh_-_56px)] bg-zinc-50 transition-[margin-left] duration-300 ease-in-out dark:bg-zinc-900',
            )}
          >
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarWrapper>
  )
}

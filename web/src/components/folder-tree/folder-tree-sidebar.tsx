import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useFolderTree } from '@/stores/folder-tree-store'

import { FolderTreeNode } from './folder-tree-node'

export function FolderTreeSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { rootFolders, loadingPaths, homeTitle } = useFolderTree()
  const routerState = useRouterState()

  const isLoadingRoot = loadingPaths.has('')
  const isOnHomePage = routerState.location.pathname === '/'

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home Link as first item */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isOnHomePage}>
                  <Link to='/'>
                    <Home className='h-4 w-4' />
                    <span>{homeTitle}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isLoadingRoot ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className='flex h-8 items-center gap-2 rounded-md px-2'>
                    <Skeleton className='h-4 w-4 rounded-md' />
                    <Skeleton className='h-4 flex-1' />
                  </div>
                ))
              ) : rootFolders.length === 0 ? (
                // Empty state (but still show Home link above)
                <div className='text-muted-foreground p-4 text-center text-sm'>
                  No folders found
                </div>
              ) : (
                // Render folder tree
                rootFolders.map((folder, index) => (
                  <FolderTreeNode key={`${folder.path}-${index}`} folder={folder} />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

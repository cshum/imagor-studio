import React, { useEffect } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useFolderTree } from '@/stores/folder-tree-store'
import { FolderTreeNode } from './folder-tree-node'

export function FolderTreeSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { rootFolders, loadingPaths, loadRootFolders } = useFolderTree()
  
  const isLoadingRoot = loadingPaths.has('')

  // Load root folders on mount
  useEffect(() => {
    if (rootFolders.length === 0 && !isLoadingRoot) {
      loadRootFolders()
    }
  }, [rootFolders.length, isLoadingRoot, loadRootFolders])

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoadingRoot ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex h-8 items-center gap-2 rounded-md px-2">
                    <Skeleton className="h-4 w-4 rounded-md" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))
              ) : rootFolders.length === 0 ? (
                // Empty state
                <div className="p-4 text-center text-sm text-muted-foreground">
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

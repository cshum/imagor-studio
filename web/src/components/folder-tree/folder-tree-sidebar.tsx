import React, { useEffect } from 'react'
import { FolderOpen } from 'lucide-react'

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
          <SidebarGroupLabel className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Folders
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoadingRoot ? (
                // Loading skeleton
                <div className="space-y-2 p-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
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

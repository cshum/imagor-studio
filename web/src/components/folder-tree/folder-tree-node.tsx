import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Folder, Loader2 } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { FolderNode, useFolderTree } from '@/stores/folder-tree-store'

interface FolderTreeNodeProps {
  folder: FolderNode
  level?: number
}

export function FolderTreeNode({ folder, level = 0 }: FolderTreeNodeProps) {
  const navigate = useNavigate()
  const { currentPath, loadingPaths, dispatch, loadFolderChildren } = useFolderTree()
  
  const isLoading = loadingPaths.has(folder.path)
  const isActive = currentPath === folder.path
  const hasChildren = folder.children && folder.children.length > 0
  const canExpand = folder.isDirectory && (!folder.isLoaded || hasChildren)

  const handleFolderClick = async () => {
    // Navigate to the folder
    if (folder.path === '') {
      navigate({ to: '/' })
    } else {
      navigate({ to: '/gallery/$galleryKey', params: { galleryKey: folder.path } })
    }
    
    // Update current path
    dispatch({ type: 'SET_CURRENT_PATH', path: folder.path })
  }

  const handleExpandClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!folder.isLoaded && folder.isDirectory) {
      // Load children if not loaded yet
      await loadFolderChildren(folder.path)
    } else if (folder.isExpanded) {
      // Collapse if already expanded
      dispatch({ type: 'COLLAPSE_FOLDER', path: folder.path })
    } else {
      // Expand if collapsed
      dispatch({ type: 'EXPAND_FOLDER', path: folder.path })
    }
  }

  // If this is a leaf folder (no children), render as a simple button
  if (!canExpand) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleFolderClick}
          isActive={isActive}
          className={cn(
            'data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
            level > 0 && 'ml-4'
          )}
        >
          <Folder className="h-4 w-4" />
          <span className="truncate">{folder.name || 'Root'}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  // Render expandable folder
  return (
    <SidebarMenuItem>
      <Collapsible open={folder.isExpanded}>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              onClick={handleExpandClick}
              className={cn(
                'flex-none w-auto px-2',
                level > 0 && 'ml-4'
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    folder.isExpanded && "rotate-90"
                  )} 
                />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          
          <SidebarMenuButton
            onClick={handleFolderClick}
            isActive={isActive}
            className={cn(
              'flex-1 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground'
            )}
          >
            <Folder className="h-4 w-4" />
            <span className="truncate">{folder.name || 'Root'}</span>
          </SidebarMenuButton>
        </div>

        <CollapsibleContent>
          <SidebarMenuSub>
            {folder.children?.map((child, index) => (
              <FolderTreeNode 
                key={`${child.path}-${index}`} 
                folder={child} 
                level={level + 1}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

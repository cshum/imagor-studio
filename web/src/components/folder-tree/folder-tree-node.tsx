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
import { FolderNode, useFolderTree } from '@/stores/folder-tree-store'

interface FolderTreeNodeProps {
  folder: FolderNode
}

export function FolderTreeNode({ folder }: FolderTreeNodeProps) {
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
    if (folder.isDirectory) {
      if (!folder.isLoaded) {
        await loadFolderChildren(folder.path)
      } else if (!folder.isExpanded) {
        dispatch({ type: 'EXPAND_FOLDER', path: folder.path })
      }
    }
  }

  const handleExpandClick = async (evt?: React.MouseEvent) => {
    evt?.stopPropagation()
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
      <SidebarMenuButton
        onClick={handleFolderClick}
      >
        <Folder className="h-4 w-4 ml-6" />
        <span className="truncate">{folder.name || 'Root'}</span>
      </SidebarMenuButton>
    )
  }

  // Render expandable folder
  return (
    <SidebarMenuItem>
      <Collapsible
        open={folder.isExpanded}
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton onClick={handleFolderClick}>
            <ChevronRight onClick={handleExpandClick} className="transition-transform" />
            <Folder className="h-4 w-4" />
            <span className="truncate">{folder.name || 'Root'}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <SidebarMenuSub>
            {folder.children?.map((child, index) => (
              <FolderTreeNode 
                key={`${child.path}-${index}`} 
                folder={child} 
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

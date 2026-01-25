import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Folder, MoreVertical } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from '@/components/ui/sidebar'
import { FolderNode, useFolderTree } from '@/stores/folder-tree-store'
import { useAuth } from '@/stores/auth-store'
import { useSidebar } from '@/stores/sidebar-store'

interface FolderTreeNodeProps {
  folder: FolderNode
  renderMenuItems?: (folderKey: string, folderName: string) => React.ReactNode
}

export function FolderTreeNode({ folder, renderMenuItems }: FolderTreeNodeProps) {
  const navigate = useNavigate()
  const { currentPath, dispatch, loadFolderChildren } = useFolderTree()
  const { isMobile, setOpenMobile } = useSidebar()
  const { authState } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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

    // Close mobile sidebar when navigating on mobile
    if (isMobile) {
      setOpenMobile(false)
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

  // Check if user is authenticated to show dropdown
  const showDropdown = renderMenuItems && authState.state === 'authenticated' && folder.path

  // If this is a leaf folder (no children), render as a simple button
  if (!canExpand) {
    return (
      <SidebarMenuItem>
        <div className='group/folder relative'>
          <SidebarMenuButton
            onClick={handleFolderClick}
            isActive={isActive}
            data-folder-key={folder.path}
            data-folder-name={folder.name || 'Root'}
          >
            <span className='-m-2 p-4 md:p-2'>
              <div className='size-4' />
            </span>
            <Folder className='h-4 w-4' />
            <span className='truncate'>{folder.name || 'Root'}</span>
          </SidebarMenuButton>
          {showDropdown && (
            <DropdownMenu onOpenChange={setIsDropdownOpen} modal={false}>
              <div
                className={`pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/folder:pointer-events-auto group-hover/folder:opacity-100 ${isDropdownOpen ? 'opacity-100 pointer-events-auto' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className='hover:bg-accent flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors'
                    aria-label='More options'
                  >
                    <MoreVertical className='h-3.5 w-3.5' />
                  </button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align='end' className='w-56' onClick={(e) => e.stopPropagation()}>
                {renderMenuItems(folder.path, folder.name || 'Root')}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarMenuItem>
    )
  }

  // Render expandable folder
  return (
    <SidebarMenuItem>
      <Collapsible
        open={folder.isExpanded}
        className='group/collapsible [&[data-state=open]>div>button>span>svg:first-child]:rotate-90'
      >
        <div className='group/folder relative'>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              onClick={handleFolderClick}
              isActive={isActive}
              data-folder-key={folder.path}
              data-folder-name={folder.name || 'Root'}
            >
              <span onClick={handleExpandClick} className='-m-2 p-4 md:p-2'>
                <ChevronRight className='size-4 transition-transform' />
              </span>
              <Folder className='h-4 w-4' />
              <span className='truncate'>{folder.name || 'Root'}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {showDropdown && (
            <DropdownMenu onOpenChange={setIsDropdownOpen} modal={false}>
              <div
                className={`pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/folder:pointer-events-auto group-hover/folder:opacity-100 ${isDropdownOpen ? 'opacity-100 pointer-events-auto' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className='hover:bg-accent flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors'
                    aria-label='More options'
                  >
                    <MoreVertical className='h-3.5 w-3.5' />
                  </button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align='end' className='w-56' onClick={(e) => e.stopPropagation()}>
                {renderMenuItems(folder.path, folder.name || 'Root')}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CollapsibleContent>
          <SidebarMenuSub>
            {folder.children?.map((child, index) => (
              <FolderTreeNode
                key={`${child.path}-${index}`}
                folder={child}
                renderMenuItems={renderMenuItems}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

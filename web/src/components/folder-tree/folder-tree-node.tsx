import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Folder, MoreVertical } from 'lucide-react'

import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from '@/components/ui/sidebar'
import { normalizeScopedDirectoryPath } from '@/lib/path-utils'
import type { SpaceIdentity } from '@/lib/space'
import { useAuth } from '@/stores/auth-store'
import { FolderNode, useFolderTree } from '@/stores/folder-tree-store'
import { useSidebar } from '@/stores/sidebar-store'

interface FolderTreeNodeProps {
  folder: FolderNode
  space?: SpaceIdentity
  renderMenuItems?: (folderKey: string, folderName: string) => React.ReactNode
  // Drag and drop props
  onDragOver?: (e: React.DragEvent, targetFolderKey: string) => void
  onDragEnter?: (e: React.DragEvent, targetFolderKey: string) => void
  onDragLeave?: (e: React.DragEvent, targetFolderKey: string) => void
  onDrop?: (e: React.DragEvent, targetFolderKey: string) => void
  dragOverTarget?: string | null
}

export function FolderTreeNode({
  folder,
  space,
  renderMenuItems,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  dragOverTarget,
}: FolderTreeNodeProps) {
  const navigate = useNavigate()
  const { currentPath, dispatch, loadFolderChildren } = useFolderTree()
  const { isMobile, setOpenMobile } = useSidebar()
  const { authState } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const folderPath = normalizeScopedDirectoryPath(folder.path, space?.spaceID)

  const isActive = currentPath === folderPath
  const hasChildren = folder.children && folder.children.length > 0
  const canExpand = folder.isDirectory && (!folder.isLoaded || hasChildren)
  const isDragOver = dragOverTarget === folderPath
  const spaceKey = space?.spaceKey

  const handleFolderClick = async () => {
    // Navigate to the folder
    if (folderPath === '') {
      navigate({
        to: spaceKey ? '/spaces/$spaceKey' : '/',
        params: spaceKey ? { spaceKey } : undefined,
      })
    } else {
      navigate({
        to: spaceKey ? '/spaces/$spaceKey/f/$galleryKey' : '/f/$galleryKey',
        params: spaceKey ? { spaceKey, galleryKey: folderPath } : { galleryKey: folderPath },
      })
    }

    // Close mobile sidebar when navigating on mobile
    if (isMobile) {
      setOpenMobile(false)
    }

    // Update current path
    dispatch({ type: 'SET_CURRENT_PATH', path: folderPath })
    if (folder.isDirectory) {
      if (!folder.isLoaded) {
        await loadFolderChildren(folderPath, true, space)
      } else if (!folder.isExpanded) {
        dispatch({ type: 'EXPAND_FOLDER', path: folderPath })
      }
    }
  }

  const handleExpandClick = async (evt?: React.MouseEvent) => {
    evt?.stopPropagation()
    if (!folder.isLoaded && folder.isDirectory) {
      // Load children if not loaded yet
      await loadFolderChildren(folderPath, true, space)
    } else if (folder.isExpanded) {
      // Collapse if already expanded
      dispatch({ type: 'COLLAPSE_FOLDER', path: folderPath })
    } else {
      // Expand if collapsed
      dispatch({ type: 'EXPAND_FOLDER', path: folderPath })
    }
  }

  // Check if user is authenticated to show dropdown
  const showDropdown = renderMenuItems && authState.state === 'authenticated' && folderPath

  // If this is a leaf folder (no children), render as a simple button
  if (!canExpand) {
    return (
      <SidebarMenuItem>
        <div
          className={`group/folder relative ${isDragOver ? 'z-10' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDragOver={(e) => onDragOver?.(e, folderPath)}
          onDragEnter={(e) => onDragEnter?.(e, folderPath)}
          onDragLeave={(e) => onDragLeave?.(e, folderPath)}
          onDrop={(e) => onDrop?.(e, folderPath)}
        >
          <SidebarMenuButton
            onClick={handleFolderClick}
            isActive={isActive}
            data-folder-key={folderPath}
            data-folder-name={folder.name || 'Root'}
            className={isDragOver ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-950' : ''}
          >
            <span className='-m-2 p-4 md:p-2'>
              <div className='size-4' />
            </span>
            <Folder className='h-4 w-4' />
            <span className='truncate'>{folder.name || 'Root'}</span>
          </SidebarMenuButton>
          {showDropdown && (isHovered || isDropdownOpen) && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
              <div
                className={`pointer-events-none absolute top-1/2 right-1 hidden -translate-y-1/2 opacity-0 transition-opacity group-hover/folder:pointer-events-auto group-hover/folder:opacity-100 md:block ${isDropdownOpen ? 'pointer-events-auto opacity-100' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className='bg-accent flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors'
                    aria-label='More options'
                    tabIndex={-1}
                  >
                    <MoreVertical className='h-3.5 w-3.5' />
                  </button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align='start' className='w-56'>
                {renderMenuItems(folderPath, folder.name || 'Root')}
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
        <div
          className={`group/folder relative ${isDragOver ? 'z-10' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDragOver={(e) => onDragOver?.(e, folderPath)}
          onDragEnter={(e) => onDragEnter?.(e, folderPath)}
          onDragLeave={(e) => onDragLeave?.(e, folderPath)}
          onDrop={(e) => onDrop?.(e, folderPath)}
        >
          <SidebarMenuButton
            onClick={handleFolderClick}
            isActive={isActive}
            data-folder-key={folderPath}
            data-folder-name={folder.name || 'Root'}
            className={isDragOver ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-950' : ''}
          >
            <span onClick={handleExpandClick} className='-m-2 p-4 md:p-2'>
              <ChevronRight className='size-4 transition-transform' />
            </span>
            <Folder className='h-4 w-4' />
            <span className='truncate'>{folder.name || 'Root'}</span>
          </SidebarMenuButton>
          {showDropdown && (isHovered || isDropdownOpen) && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
              <div
                className={`pointer-events-none absolute top-1/2 right-1 hidden -translate-y-1/2 opacity-0 transition-opacity group-hover/folder:pointer-events-auto group-hover/folder:opacity-100 md:block ${isDropdownOpen ? 'pointer-events-auto opacity-100' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className='bg-accent flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors'
                    aria-label='More options'
                    tabIndex={-1}
                  >
                    <MoreVertical className='h-3.5 w-3.5' />
                  </button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align='start' className='w-56'>
                {renderMenuItems(folderPath, folder.name || 'Root')}
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
                space={space}
                renderMenuItems={renderMenuItems}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                dragOverTarget={dragOverTarget}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

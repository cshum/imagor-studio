import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Home } from 'lucide-react'

import { CreateFolderDialog } from '@/components/image-gallery/create-folder-dialog'
import { DeleteItemDialog } from '@/components/image-gallery/delete-item-dialog'
import { FolderContextMenu } from '@/components/image-gallery/folder-context-menu'
import { MoveItem, MoveItemsDialog } from '@/components/image-gallery/move-items-dialog'
import { RenameItemDialog } from '@/components/image-gallery/rename-item-dialog'
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
import { useFolderContextMenu } from '@/hooks/use-folder-context-menu'
import { useItemDragDrop } from '@/hooks/use-item-drag-drop'
import { useAuth } from '@/stores/auth-store'
import { useDragDrop } from '@/stores/drag-drop-store'
import {
  folderTreeStore,
  invalidateFolderCache,
  loadFolderChildren,
  useFolderTree,
} from '@/stores/folder-tree-store'
import { useSidebar } from '@/stores/sidebar-store'

import { FolderTreeNode } from './folder-tree-node'

export type FolderTreeSidebarProps = Omit<
  React.ComponentProps<typeof Sidebar>,
  'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'
>

/**
 * Check if a folder path affects the current viewing path.
 * Returns true if folderPath is the current path or a parent of it.
 */
function isPathAffected(folderPath: string, currentPath: string): boolean {
  if (!currentPath) return false // Not viewing any folder
  if (currentPath === folderPath) return true // Exact match
  return currentPath.startsWith(`${folderPath}/`) // Parent folder
}

export function FolderTreeSidebar(props: FolderTreeSidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authState } = useAuth()
  const { rootFolders, loadingPaths, homeTitle } = useFolderTree()
  const { isMobile, setOpenMobile } = useSidebar()
  const routerState = useRouterState()
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)
  const [createFolderPath, setCreateFolderPath] = useState<string>('')

  const [deleteItemDialog, setDeleteItemDialog] = useState<{
    open: boolean
    itemKey: string | null
    itemName: string | null
    itemType: 'file' | 'folder'
    isDeleting: boolean
  }>({
    open: false,
    itemKey: null,
    itemName: null,
    itemType: 'folder',
    isDeleting: false,
  })

  const [renameDialog, setRenameDialog] = useState<{
    open: boolean
    folderPath: string | null
    folderName: string | null
    isRenaming: boolean
  }>({
    open: false,
    folderPath: null,
    folderName: null,
    isRenaming: false,
  })

  const [moveDialog, setMoveDialog] = useState<{
    open: boolean
    items: MoveItem[]
    currentPath: string
  }>({
    open: false,
    items: [],
    currentPath: '',
  })

  // Get drag state and drop handler from global store
  const { dragOverTarget, onDropHandler } = useDragDrop()

  // Get drag handlers from hook, using the handler from store
  const { handleDragOver, handleDragEnter, handleDragLeave, handleContainerDragLeave, handleDrop } =
    useItemDragDrop({
      onDrop: onDropHandler || undefined,
      isAuthenticated: authState.state === 'authenticated',
    })

  const isLoadingRoot = loadingPaths.has('')
  const isOnHomePage = routerState.location.pathname === '/'

  const handleHomeClick = () => {
    // Close mobile sidebar when navigating to home on mobile
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Trigger rename dialog from context menu
  const handleRenameFromMenu = (folderKey: string, folderName: string) => {
    setRenameDialog({
      open: true,
      folderPath: folderKey,
      folderName,
      isRenaming: false,
    })
  }

  // Trigger delete dialog from context menu
  const handleDeleteFromMenu = (folderKey: string, folderName: string) => {
    setDeleteItemDialog({
      open: true,
      itemKey: folderKey,
      itemName: folderName,
      itemType: 'folder',
      isDeleting: false,
    })
  }

  // Trigger move dialog from context menu
  const handleMoveFromMenu = (folderKey: string, folderName: string) => {
    // Calculate parent path to focus on in the folder picker
    const pathParts = folderKey.split('/').filter(Boolean)
    pathParts.pop() // Remove the folder name itself
    const parentPath = pathParts.join('/')

    setMoveDialog({
      open: true,
      items: [{ key: folderKey, name: folderName, type: 'folder' }],
      currentPath: parentPath,
    })
  }

  const {
    renderMenuItems: renderContextMenuItems,
    handleRename: handleRenameFolderOperation,
    handleDelete: handleDeleteFolderOperation,
  } = useFolderContextMenu({
    isAuthenticated: () => authState.state === 'authenticated',
    onOpen: () => {
      // Close mobile sidebar when navigating on mobile
      if (isMobile) {
        setOpenMobile(false)
      }
    },
    onRename: handleRenameFromMenu,
    onDelete: handleDeleteFromMenu,
    onMove: handleMoveFromMenu,
  })

  // Use the shared folder context menu hook for dropdown menus (three-dots)
  const { renderMenuItems: renderDropdownMenuItemsFromHook } = useFolderContextMenu({
    isAuthenticated: () => authState.state === 'authenticated',
    onOpen: () => {
      // Close mobile sidebar when navigating on mobile
      if (isMobile) {
        setOpenMobile(false)
      }
    },
    onRename: handleRenameFromMenu,
    onDelete: handleDeleteFromMenu,
    onMove: handleMoveFromMenu,
    useDropdownItems: true,
  })

  // Adapter function to match FolderTreeNode's expected signature
  const renderDropdownMenuItems = (folderKey: string, folderName: string) => {
    return renderDropdownMenuItemsFromHook({ folderKey, folderName })
  }

  const handleRename = async (newName: string) => {
    if (!renameDialog.folderPath) return

    setRenameDialog((prev) => ({ ...prev, isRenaming: true }))

    try {
      await handleRenameFolderOperation(renameDialog.folderPath, newName)

      setRenameDialog({
        open: false,
        folderPath: null,
        folderName: null,
        isRenaming: false,
      })
    } catch {
      setRenameDialog((prev) => ({ ...prev, isRenaming: false }))
    }
  }

  const handleRenameDialogClose = (open: boolean) => {
    if (!renameDialog.isRenaming) {
      setRenameDialog({
        open,
        folderPath: null,
        folderName: null,
        isRenaming: false,
      })
    }
  }

  const handleDeleteItem = async () => {
    if (!deleteItemDialog.itemKey || !deleteItemDialog.itemName) return

    setDeleteItemDialog((prev) => ({ ...prev, isDeleting: true }))

    try {
      await handleDeleteFolderOperation(deleteItemDialog.itemKey, deleteItemDialog.itemName)
      setDeleteItemDialog({
        open: false,
        itemKey: null,
        itemName: null,
        itemType: 'folder',
        isDeleting: false,
      })
    } catch {
      setDeleteItemDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteItemDialogClose = (open: boolean) => {
    if (!deleteItemDialog.isDeleting) {
      setDeleteItemDialog({
        open,
        itemKey: null,
        itemName: null,
        itemType: 'folder',
        isDeleting: false,
      })
    }
  }

  // Handle folder creation - reload parent folder in tree
  const handleFolderCreated = async (folderPath: string) => {
    // Get parent path
    const pathParts = folderPath.split('/').filter(Boolean)
    pathParts.pop() // Remove the new folder name
    const parentPath = pathParts.join('/')

    // Invalidate and reload the parent folder's children in the store
    invalidateFolderCache(parentPath)
    await loadFolderChildren(parentPath, true) // Auto-expand to show new folder
  }

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('components.folderTree.folders')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu onDragLeave={handleContainerDragLeave}>
              {/* Home Link as first item - droppable for moving items to root */}
              <SidebarMenuItem
                onDragOver={(e) => handleDragOver(e, '')}
                onDragEnter={(e) => handleDragEnter(e, '')}
                onDragLeave={(e) => handleDragLeave(e, '')}
                onDrop={(e) => handleDrop(e, '')}
              >
                <SidebarMenuButton
                  asChild
                  isActive={isOnHomePage}
                  className={
                    dragOverTarget === '' ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-950' : ''
                  }
                >
                  <Link to='/' onClick={handleHomeClick}>
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
                  {t('components.folderTree.noFoldersFound')}
                </div>
              ) : (
                // Render folder tree with context menu
                <FolderContextMenu renderMenuItems={renderContextMenuItems}>
                  {rootFolders.map((folder, index) => (
                    <FolderTreeNode
                      key={`${folder.path}-${index}`}
                      folder={folder}
                      renderMenuItems={renderDropdownMenuItems}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      dragOverTarget={dragOverTarget}
                    />
                  ))}
                </FolderContextMenu>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />

      {/* Rename Dialog */}
      <RenameItemDialog
        open={renameDialog.open}
        onOpenChange={handleRenameDialogClose}
        itemName={renameDialog.folderName || ''}
        itemType='folder'
        isRenaming={renameDialog.isRenaming}
        onConfirm={handleRename}
      />

      {/* Delete Item Dialog */}
      <DeleteItemDialog
        open={deleteItemDialog.open}
        onOpenChange={handleDeleteItemDialogClose}
        itemName={deleteItemDialog.itemName || ''}
        itemType={deleteItemDialog.itemType}
        isDeleting={deleteItemDialog.isDeleting}
        onConfirm={handleDeleteItem}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        currentPath={createFolderPath}
        onFolderCreated={handleFolderCreated}
      />

      {/* Move Items Dialog */}
      <MoveItemsDialog
        open={moveDialog.open}
        onOpenChange={(open) => setMoveDialog({ open, items: [], currentPath: '' })}
        items={moveDialog.items}
        currentPath={moveDialog.currentPath}
        onMoveComplete={() => {
          // Check if current path is affected by the move
          if (moveDialog.items.length > 0) {
            const movedFolderKey = moveDialog.items[0].key

            // Get current path from folder tree store
            const { currentPath } = folderTreeStore.getState()

            // Check if operation affects current view
            if (isPathAffected(movedFolderKey, currentPath)) {
              // Current route is affected - redirect to home
              navigate({ to: '/' })
            }
          }
        }}
        onCreateFolder={(selectedPath) => {
          setCreateFolderPath(selectedPath || '')
          setIsCreateFolderDialogOpen(true)
        }}
      />
    </Sidebar>
  )
}

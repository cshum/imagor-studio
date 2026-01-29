import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { FolderOpen, Home, Trash2, Type } from 'lucide-react'

import { DeleteFolderDialog } from '@/components/image-gallery/delete-folder-dialog'
import { FolderContextMenu } from '@/components/image-gallery/folder-context-menu'
import { RenameItemDialog } from '@/components/image-gallery/rename-item-dialog'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import { useFolderTree } from '@/stores/folder-tree-store'
import { useSidebar } from '@/stores/sidebar-store'

import { FolderTreeNode } from './folder-tree-node'

export type FolderTreeSidebarProps = Omit<
  React.ComponentProps<typeof Sidebar>,
  'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'
>

export function FolderTreeSidebar(props: FolderTreeSidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authState } = useAuth()
  const { rootFolders, loadingPaths, homeTitle } = useFolderTree()
  const { isMobile, setOpenMobile } = useSidebar()
  const routerState = useRouterState()

  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{
    open: boolean
    folderKey: string | null
    folderName: string | null
    isDeleting: boolean
  }>({
    open: false,
    folderKey: null,
    folderName: null,
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
    setDeleteFolderDialog({
      open: true,
      folderKey,
      folderName,
      isDeleting: false,
    })
  }

  // Use the shared folder context menu hook with centralized logic
  const {
    renderMenuItems: renderContextMenuItems,
    handleRename: handleRenameFolderOperation,
    handleDelete: handleDeleteFolderOperation,
    isRenaming,
    isDeleting,
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
  })

  // Render dropdown menu items (separate from context menu items)
  const renderDropdownMenuItems = (folderKey: string, folderName: string) => {
    const handleOpen = () => {
      if (folderKey) {
        // Navigate to the folder
        navigate({ to: '/gallery/$galleryKey', params: { galleryKey: folderKey } })

        // Close mobile sidebar when navigating on mobile
        if (isMobile) {
          setOpenMobile(false)
        }
      }
    }

    return (
      <>
        <DropdownMenuLabel className='break-all'>{folderName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpen}>
          <FolderOpen className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTimeout(() => handleRenameFromMenu(folderKey, folderName), 0)
          }}
          disabled={isRenaming || isDeleting}
        >
          <Type className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.rename')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setTimeout(() => handleDeleteFromMenu(folderKey, folderName), 0)
          }}
          className='text-destructive focus:text-destructive'
          disabled={isRenaming || isDeleting}
        >
          <Trash2 className='mr-2 h-4 w-4' />
          {t('pages.gallery.folderContextMenu.delete')}
        </DropdownMenuItem>
      </>
    )
  }

  const handleRename = async (newName: string) => {
    if (!renameDialog.folderPath) return

    setRenameDialog((prev) => ({ ...prev, isRenaming: true }))

    try {
      // Use centralized handler from hook
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

  const handleDeleteFolder = async () => {
    if (!deleteFolderDialog.folderKey || !deleteFolderDialog.folderName) return

    setDeleteFolderDialog((prev) => ({ ...prev, isDeleting: true }))

    try {
      await handleDeleteFolderOperation(deleteFolderDialog.folderKey, deleteFolderDialog.folderName)
      setDeleteFolderDialog({
        open: false,
        folderKey: null,
        folderName: null,
        isDeleting: false,
      })
    } catch {
      setDeleteFolderDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteFolderDialogClose = (open: boolean) => {
    if (!deleteFolderDialog.isDeleting) {
      setDeleteFolderDialog({
        open,
        folderKey: null,
        folderName: null,
        isDeleting: false,
      })
    }
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

      {/* Delete Folder Dialog */}
      <DeleteFolderDialog
        open={deleteFolderDialog.open}
        onOpenChange={handleDeleteFolderDialogClose}
        folderName={deleteFolderDialog.folderName || ''}
        isDeleting={deleteFolderDialog.isDeleting}
        onConfirm={handleDeleteFolder}
      />
    </Sidebar>
  )
}

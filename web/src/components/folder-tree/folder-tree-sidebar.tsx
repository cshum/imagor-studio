import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { FolderOpen, Home, Trash2, Type } from 'lucide-react'

import { DeleteFolderDialog } from '@/components/image-gallery/delete-folder-dialog'
import { FolderContextMenu } from '@/components/image-gallery/folder-context-menu'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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

export interface FolderTreeSidebarProps
  extends Omit<
    React.ComponentProps<typeof Sidebar>,
    'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'
  > {
  // Drag and drop handler from gallery page
  onDrop?: (items: any[], targetFolderKey: string) => void | Promise<void>
}

export function FolderTreeSidebar({ onDrop, ...props }: FolderTreeSidebarProps) {
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

  const [renameInput, setRenameInput] = useState('')

  // Get drag state and drop handler from global store
  const { dragOverTarget, onDropHandler } = useDragDrop()

  // Get drag handlers from hook, using the handler from store
  const { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } = useItemDragDrop({
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
    setRenameInput(folderName)
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

  const handleRename = async () => {
    if (!renameDialog.folderPath || !renameInput.trim()) return

    setRenameDialog((prev) => ({ ...prev, isRenaming: true }))

    try {
      // Use centralized handler from hook
      await handleRenameFolderOperation(renameDialog.folderPath, renameInput.trim())

      setRenameDialog({
        open: false,
        folderPath: null,
        folderName: null,
        isRenaming: false,
      })
      setRenameInput('')
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
      setRenameInput('')
    }
  }

  const handleDeleteFolder = async () => {
    if (!deleteFolderDialog.folderKey || !deleteFolderDialog.folderName) return

    setDeleteFolderDialog((prev) => ({ ...prev, isDeleting: true }))

    try {
      // Use centralized handler from hook
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
            <SidebarMenu>
              {/* Home Link as first item */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isOnHomePage}>
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
      <Dialog open={renameDialog.open} onOpenChange={handleRenameDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pages.gallery.renameItem.title', { type: 'folder' })}</DialogTitle>
            <DialogDescription>
              {t('pages.gallery.renameItem.description', { type: 'folder' })}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder={t('pages.gallery.renameItem.placeholder')}
              disabled={renameDialog.isRenaming}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameInput.trim()) {
                  handleRename()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => handleRenameDialogClose(false)}
              disabled={renameDialog.isRenaming}
            >
              {t('common.buttons.cancel')}
            </Button>
            <ButtonWithLoading
              onClick={handleRename}
              disabled={!renameInput.trim()}
              isLoading={renameDialog.isRenaming}
            >
              {t('pages.gallery.renameItem.rename')}
            </ButtonWithLoading>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { File, Folder, FolderOpen, MoveRight } from 'lucide-react'

import { CreateFolderDialog } from '@/components/image-gallery/create-folder-dialog'
import { FolderSelectionDialog } from '@/components/image-gallery/folder-selection-dialog'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFolderTree } from '@/stores/folder-tree-store'
import { isFolderKey } from '@/stores/selection-store'

export interface BulkMoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: string[]
  currentPath: string
  isMoving: boolean
  onConfirm: (destinationPath: string) => void
  onCreateFolder?: () => void
}

export const BulkMoveDialog: React.FC<BulkMoveDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  currentPath,
  isMoving,
  onConfirm,
}) => {
  const { t } = useTranslation()
  const { homeTitle } = useFolderTree()
  const [destinationPath, setDestinationPath] = useState<string>(currentPath || '')
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false)
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)
  const [folderCreatedCallback, setFolderCreatedCallback] = useState<
    ((path: string) => void) | null
  >(null)

  // Split items into folders and files
  const folders = selectedItems.filter((key) => isFolderKey(key))
  const files = selectedItems.filter((key) => !isFolderKey(key))

  const totalCount = selectedItems.length

  // Extract display names from keys
  const getFolderName = (key: string) => {
    const parts = key.split('/').filter(Boolean)
    return parts[parts.length - 1] || key
  }

  const getFileName = (key: string) => {
    const parts = key.split('/')
    return parts[parts.length - 1] || key
  }

  // Get folder paths to exclude (selected folders and their subfolders)
  const excludePaths = folders.map((key) => {
    // Ensure folder keys end with /
    return key.endsWith('/') ? key : `${key}/`
  })

  const handleConfirm = () => {
    onConfirm(destinationPath)
  }

  const handleBrowse = () => {
    setIsFolderPickerOpen(true)
  }

  const handleFolderSelect = (path: string) => {
    setDestinationPath(path)
  }

  const handleCreateFolder = () => {
    setIsCreateFolderDialogOpen(true)
  }

  const handleFolderCreated = (folderPath: string) => {
    // Call the callback from FolderSelectionDialog to refresh its tree
    if (folderCreatedCallback) {
      folderCreatedCallback(folderPath)
    }
  }

  // Reset destination when dialog opens
  React.useEffect(() => {
    if (open) {
      setDestinationPath(currentPath || '')
    }
  }, [open, currentPath])

  // Get display name for destination path
  const getDestinationDisplay = () => {
    if (destinationPath === '') return homeTitle
    return destinationPath
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <MoveRight className='h-5 w-5' />
              {t('pages.gallery.moveItems.title')}
            </DialogTitle>
            <DialogDescription>
              {t('pages.gallery.moveItems.description', { count: totalCount })}
            </DialogDescription>
          </DialogHeader>

          <div className='my-4 overflow-x-hidden'>
            {/* Items to move list */}
            <div className='mb-4'>
              <div className='text-muted-foreground mb-2 text-sm font-medium'>
                {t('pages.gallery.moveItems.itemsToMove')}:
              </div>
              <ScrollArea className='border-muted h-48 rounded-md border'>
                <div className='space-y-1 p-2'>
                  {folders.map((folderKey) => (
                    <div
                      key={folderKey}
                      className='flex min-w-0 items-center gap-2 px-2 py-1.5 text-sm'
                    >
                      <Folder className='text-primary h-4 w-4 flex-shrink-0' />
                      <span className='min-w-0 flex-1 truncate' title={getFolderName(folderKey)}>
                        {getFolderName(folderKey)}
                      </span>
                    </div>
                  ))}
                  {files.map((fileKey) => (
                    <div
                      key={fileKey}
                      className='flex min-w-0 items-center gap-2 px-2 py-1.5 text-sm'
                    >
                      <File className='text-muted-foreground h-4 w-4 flex-shrink-0' />
                      <span className='min-w-0 flex-1 truncate' title={getFileName(fileKey)}>
                        {getFileName(fileKey)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Destination folder picker */}
            <div>
              <div className='text-muted-foreground mb-2 text-sm font-medium'>
                {t('pages.gallery.moveItems.destinationFolder')}:
              </div>
              <div className='flex gap-2'>
                <div className='relative flex-1'>
                  <FolderOpen className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                  <Input
                    value={getDestinationDisplay()}
                    readOnly
                    className='cursor-pointer pl-9'
                    onClick={handleBrowse}
                    title={getDestinationDisplay()}
                  />
                </div>
                <Button variant='outline' onClick={handleBrowse} disabled={isMoving}>
                  {t('pages.gallery.moveItems.browse')}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isMoving}>
              {t('common.buttons.cancel')}
            </Button>
            <ButtonWithLoading onClick={handleConfirm} isLoading={isMoving} disabled={isMoving}>
              {t('pages.gallery.moveItems.confirmButton', { count: totalCount })}
            </ButtonWithLoading>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Selection Dialog */}
      <FolderSelectionDialog
        open={isFolderPickerOpen}
        onOpenChange={setIsFolderPickerOpen}
        selectedPath={destinationPath}
        onSelect={handleFolderSelect}
        excludePaths={excludePaths}
        currentPath={currentPath}
        showNewFolderButton={true}
        onCreateFolder={handleCreateFolder}
        onFolderCreated={(callback) => setFolderCreatedCallback(() => callback)}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        currentPath={destinationPath}
        onFolderCreated={handleFolderCreated}
      />
    </>
  )
}

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FilePickerContent } from '@/components/file-picker/file-picker-content'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { loadRootFolders } from '@/stores/folder-tree-store'

export interface FilePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (paths: string[]) => void

  // Configuration
  selectionMode?: 'single' | 'multiple'
  mode?: 'file' | 'folder' | 'both'
  currentPath?: string
  fileExtensions?: string[]
  maxItemWidth?: number // Default: 170 (for 3 columns)

  // Customization
  title?: string
  description?: string
  confirmButtonText?: string
}

export const FilePickerDialog: React.FC<FilePickerDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
  selectionMode = 'single',
  mode = 'file',
  currentPath: initialPath,
  fileExtensions,
  maxItemWidth = 250,
  title,
  description,
  confirmButtonText,
}) => {
  const { t } = useTranslation()
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '')
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  const dialogTitle = title || t('components.filePicker.title')
  const dialogDescription = description || t('components.filePicker.description')
  const buttonText =
    confirmButtonText ||
    (selectionMode === 'multiple' && selectedPaths.size > 1
      ? t('components.filePicker.selectMultiple', { count: selectedPaths.size })
      : t('components.filePicker.select'))

  // Load root folders when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentPath(initialPath || '')
      setSelectedPaths(new Set())
      loadRootFolders()
    }
  }, [open, initialPath])

  const handlePathChange = useCallback((path: string) => {
    setCurrentPath(path)
  }, [])

  const handleSelectionChange = useCallback(
    (path: string, type: 'file' | 'folder') => {
      // Check if this type is allowed
      if (mode === 'file' && type === 'folder') return
      if (mode === 'folder' && type === 'file') return

      setSelectedPaths((prev) => {
        const newSet = new Set(prev)

        if (selectionMode === 'single') {
          // Single selection: replace with new selection
          newSet.clear()
          newSet.add(path)
        } else {
          // Multiple selection: toggle
          if (newSet.has(path)) {
            newSet.delete(path)
          } else {
            newSet.add(path)
          }
        }

        return newSet
      })
    },
    [selectionMode, mode],
  )

  const handleConfirm = () => {
    if (selectedPaths.size > 0) {
      onSelect(Array.from(selectedPaths))
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setSelectedPaths(new Set())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[80vh] max-w-7xl flex-col gap-0 p-0'>
        <DialogHeader className='p-6'>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1'>
          <FilePickerContent
            currentPath={currentPath}
            selectedPaths={selectedPaths}
            mode={mode}
            fileExtensions={fileExtensions}
            maxItemWidth={maxItemWidth}
            onPathChange={handlePathChange}
            onSelectionChange={handleSelectionChange}
          />
        </div>

        <DialogFooter className='p-6'>
          <Button variant='outline' onClick={handleCancel}>
            {t('common.buttons.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={selectedPaths.size === 0}>
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FilePickerContent } from '@/components/file-picker/file-picker-content'
import { LoadingBar } from '@/components/loading-bar'
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
  currentPath: initialPath,
  fileExtensions,
  maxItemWidth = 230,
  title,
  description,
  confirmButtonText,
}) => {
  const { t } = useTranslation()
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '')
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const dialogTitle = title || t('components.filePicker.title')
  const dialogDescription = description || t('components.filePicker.description')
  const buttonText = confirmButtonText || t('components.filePicker.select')

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
    (path: string) => {
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
    [selectionMode],
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
    <>
      <LoadingBar isLoading={isLoading} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='bg-sidebar flex h-[80vh] max-w-7xl flex-col gap-0 p-0'>
          <DialogHeader className='p-6'>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className='min-h-0 flex-1 overflow-hidden'>
            <FilePickerContent
              currentPath={currentPath}
              selectedPaths={selectedPaths}
              fileExtensions={fileExtensions}
              maxItemWidth={maxItemWidth}
              onPathChange={handlePathChange}
              onSelectionChange={handleSelectionChange}
              onLoadingChange={setIsLoading}
            />
          </div>

          <DialogFooter className='flex-row justify-between p-4 sm:justify-between'>
            {/* Left side - Selection info */}
            <div className='flex items-center gap-2'>
              {selectedPaths.size === 1 ? (
                // Single selection: show filename
                <span className='text-muted-foreground max-w-[200px] truncate text-sm'>
                  {Array.from(selectedPaths)[0].split('/').pop()}
                </span>
              ) : selectedPaths.size > 1 ? (
                // Multiple selection: reset button + counter
                <>
                  <Button variant='outline' onClick={() => setSelectedPaths(new Set())}>
                    {t('components.filePicker.resetSelection')}
                  </Button>
                  <span className='text-muted-foreground text-sm'>
                    {t('components.filePicker.selectedCount', { count: selectedPaths.size })}
                  </span>
                </>
              ) : null}
            </div>

            {/* Right side - Action buttons */}
            <div className='flex gap-2'>
              <Button variant='outline' onClick={handleCancel}>
                {t('common.buttons.cancel')}
              </Button>
              <Button onClick={handleConfirm} disabled={selectedPaths.size === 0}>
                {buttonText}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

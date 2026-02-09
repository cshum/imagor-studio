import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getUserRegistryMultiple, setUserRegistry } from '@/api/registry-api'
import { statFile } from '@/api/storage-api'
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
import { useAuth } from '@/stores/auth-store'
import { loadRootFolders } from '@/stores/folder-tree-store'

export interface FilePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (paths: string[]) => void

  // Configuration
  selectionMode?: 'single' | 'multiple'
  currentPath?: string
  fileType?: 'images' | 'videos' | 'both' // Filter by file type (uses system config)
  fileExtensions?: string[] // Custom extensions (overrides fileType)
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
  fileType = 'both',
  fileExtensions,
  maxItemWidth = 230,
  title,
  description,
  confirmButtonText,
}) => {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '')
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  const dialogTitle = title || t('components.filePicker.title')
  const dialogDescription = description || t('components.filePicker.description')
  const buttonText = confirmButtonText || t('components.filePicker.select')

  // Track if we've already loaded the initial path for this dialog session
  const hasLoadedInitialPath = useRef(false)

  // Load last folder path and validate it exists
  useEffect(() => {
    if (open && !hasLoadedInitialPath.current) {
      const loadLastFolderPath = async () => {
        let pathToUse = initialPath || ''

        // Only load saved path if no initialPath was provided
        if (!initialPath && authState.profile?.id && authState.state === 'authenticated') {
          try {
            const result = await getUserRegistryMultiple(
              ['config.file_picker_last_folder_path'],
              authState.profile.id,
            )
            const savedPath = result.find(
              (r) => r.key === 'config.file_picker_last_folder_path',
            )?.value

            if (savedPath) {
              // Validate that the folder still exists
              try {
                const stat = await statFile(savedPath)
                if (stat && stat.isDirectory) {
                  pathToUse = savedPath
                }
                // If not a directory or doesn't exist, fall back to root
              } catch {
                // Folder doesn't exist, use root directory
                pathToUse = ''
              }
            }
          } catch {
            // Failed to load registry, use root directory
            pathToUse = ''
          }
        }

        setCurrentPath(pathToUse)
        setSelectedPaths(new Set())
        loadRootFolders()
        hasLoadedInitialPath.current = true
      }

      loadLastFolderPath()
    }

    // Reset the flag when dialog closes
    if (!open) {
      hasLoadedInitialPath.current = false
    }
  }, [open, initialPath, authState.profile?.id, authState.state])

  const handlePathChange = useCallback(
    (path: string) => {
      setCurrentPath(path)

      // Save the path to user registry
      if (authState.profile?.id && authState.state === 'authenticated') {
        setUserRegistry(
          'config.file_picker_last_folder_path',
          path,
          false,
          authState.profile.id,
        ).catch(() => {
          // Silently fail if we can't save the preference
        })
      }
    },
    [authState.profile?.id, authState.state],
  )

  const handleSelectionChange = useCallback(
    (path: string) => {
      setSelectedPaths((prev) => {
        const newSet = new Set(prev)

        if (selectionMode === 'single') {
          // Single selection: replace with new selection
          if (newSet.has(path)) {
            newSet.delete(path)
          } else {
            newSet.clear()
            newSet.add(path)
          }
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='bg-sidebar flex h-[80vh] max-w-7xl flex-col gap-0 p-0'>
          <DialogHeader className='relative p-6'>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className='min-h-0 flex-1 overflow-hidden'>
            <FilePickerContent
              currentPath={currentPath}
              selectedPaths={selectedPaths}
              fileType={fileType}
              fileExtensions={fileExtensions}
              maxItemWidth={maxItemWidth}
              onPathChange={handlePathChange}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          <DialogFooter className='flex-row justify-between p-4 sm:justify-between'>
            {/* Left side - Selection info */}
            <div className='flex items-center gap-4'>
              {selectionMode === 'single' ? (
                // Single selection: show filename
                <span className='text-muted-foreground max-w-sm truncate text-sm md:inline'>
                  {Array.from(selectedPaths)[0]?.split('/').pop()}
                </span>
              ) : selectionMode === 'multiple' ? (
                // Multiple selection: reset button + counter
                <>
                  <Button
                    variant='outline'
                    disabled={selectedPaths.size === 0}
                    onClick={() => setSelectedPaths(new Set())}
                  >
                    {t('components.filePicker.resetSelection')}
                  </Button>
                  <span className='text-muted-foreground hidden text-sm md:inline'>
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

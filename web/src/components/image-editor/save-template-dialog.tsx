import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown, Folder, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { FolderSelectionDialog } from '@/components/folder-picker/folder-selection-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageEditor } from '@/lib/image-editor'
import { splitImagePath } from '@/lib/path-utils'
import { useFolderTree } from '@/stores/folder-tree-store'

// Validate filename - only block filesystem-unsafe characters
function isValidFilename(name: string): boolean {
  // Disallow filesystem-unsafe characters: / \ : * ? " < > |
  const invalidChars = /[/\\:*?"<>|]/
  return !invalidChars.test(name)
}

interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageEditor: ImageEditor
  imagePath: string
  templateMetadata?: {
    name: string
    description?: string
    dimensionMode: 'adaptive' | 'predefined'
    templatePath: string
  }
  onSaveSuccess?: (templatePath: string) => void
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  imageEditor,
  imagePath,
  templateMetadata,
  onSaveSuccess,
}: SaveTemplateDialogProps) {
  const { t } = useTranslation()
  const { homeTitle } = useFolderTree()
  const [name, setName] = useState('')
  const [savePath, setSavePath] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)

  const dimensions = imageEditor.getOriginalDimensions()
  const currentState = imageEditor.getState()

  // Auto-detect dimension mode based on current state
  const dimensionMode: 'adaptive' | 'predefined' = (() => {
    // If width/height are set and differ from original, use predefined
    if (currentState.width && currentState.height) {
      if (currentState.width !== dimensions.width || currentState.height !== dimensions.height) {
        return 'predefined'
      }
    }
    // Otherwise use adaptive (works with any image size)
    return 'adaptive'
  })()

  // Generate filename preview - use original name
  const filename = name.trim() ? `${name.trim()}.imagor.json` : ''
  const hasInvalidChars = name.trim() ? !isValidFilename(name.trim()) : false

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (open) {
      if (templateMetadata) {
        // Editing existing template - pre-fill with metadata
        setName(templateMetadata.name)
        const { galleryKey } = splitImagePath(templateMetadata.templatePath)
        setSavePath(galleryKey || '')
      } else {
        // Creating new template - use defaults
        const { galleryKey } = splitImagePath(imagePath)
        setSavePath(galleryKey || '')
      }
    }
  }, [open, imagePath, templateMetadata])

  const handleSave = async (overwrite = false) => {
    // Validate name
    if (!name.trim()) {
      toast.error(t('imageEditor.template.nameRequired'))
      return
    }

    setIsSaving(true)

    try {
      await imageEditor.exportTemplate(name.trim(), undefined, dimensionMode, savePath, overwrite)

      // Build template path for navigation
      const templatePath = savePath
        ? `${savePath}/${name.trim()}.imagor.json`
        : `${name.trim()}.imagor.json`

      // Success - template saved
      toast.success(t('imageEditor.template.saveSuccess', { name: name.trim() }))
      onOpenChange(false)

      // Reset form
      setName('')

      // Notify parent with template path (parent handles navigation and marking as saved)
      onSaveSuccess?.(templatePath)
    } catch (error) {
      // Check if it's a conflict error (template already exists)
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage.includes('Template already exists')) {
        setIsSaving(false)
        // Show custom confirmation dialog
        setShowOverwriteConfirm(true)
        return
      }

      // Other errors
      console.error('Failed to save template:', error)
      toast.error(t('imageEditor.template.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{t('imageEditor.template.saveTemplate')}</DialogTitle>
          <DialogDescription>{t('imageEditor.template.saveDescription')}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Template Name */}
          <div className='grid gap-2'>
            <Label htmlFor='template-name'>
              {t('imageEditor.template.templateName')} <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='template-name'
              placeholder={t('imageEditor.template.templateNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
            {/* Filename Preview or Error */}
            {hasInvalidChars ? (
              <p className='text-destructive text-sm'>
                Invalid characters: / \ : * ? " &lt; &gt; |
              </p>
            ) : (
              filename && (
                <p className='text-muted-foreground text-sm'>
                  {t('imageEditor.template.filenamePreview')}:{' '}
                  <code className='bg-muted rounded px-1.5 py-0.5'>{filename}</code>
                </p>
              )
            )}
          </div>

          {/* Save Location */}
          <div className='grid gap-2'>
            <Label>{t('imageEditor.template.saveLocation')}</Label>
            <Button
              type='button'
              variant='outline'
              className='justify-start'
              onClick={() => setFolderDialogOpen(true)}
            >
              <Folder className='mr-2 h-4 w-4' />
              <span className='flex-1 truncate text-left'>{savePath || homeTitle}</span>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('common.buttons.cancel')}
          </Button>
          <Button
            onClick={() => handleSave()}
            disabled={isSaving || !name.trim() || hasInvalidChars}
          >
            {isSaving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                {t('imageEditor.template.saving')}
              </>
            ) : (
              <>
                <FileDown className='mr-2 h-4 w-4' />
                {t('imageEditor.template.saveTemplate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Folder Selection Dialog */}
      <FolderSelectionDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        selectedPath={savePath}
        onSelect={(path) => {
          setSavePath(path)
          setFolderDialogOpen(false)
        }}
        currentPath={savePath}
        title={t('imageEditor.template.selectFolder')}
        description={t('imageEditor.template.selectFolderDescription')}
        confirmButtonText={t('common.buttons.select')}
      />

      {/* Overwrite Confirmation Dialog */}
      <Dialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('imageEditor.template.overwriteTitle')}</DialogTitle>
            <DialogDescription>
              {t('imageEditor.template.overwriteConfirm', { name: name.trim() })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowOverwriteConfirm(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                setShowOverwriteConfirm(false)
                handleSave(true)
              }}
            >
              {t('imageEditor.template.overwrite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

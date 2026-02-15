import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { ImageEditor } from '@/lib/image-editor'
import { splitImagePath } from '@/lib/path-utils'

interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageEditor: ImageEditor
  imagePath: string
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  imageEditor,
  imagePath,
}: SaveTemplateDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dimensionMode, setDimensionMode] = useState<'adaptive' | 'predefined'>('adaptive')
  const [savePath, setSavePath] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const dimensions = imageEditor.getOriginalDimensions()

  // Set default save path to current image's folder when dialog opens
  useEffect(() => {
    if (open) {
      const { galleryKey } = splitImagePath(imagePath)
      setSavePath(galleryKey || '')
    }
  }, [open, imagePath])

  const handleSave = async () => {
    // Validate name
    if (!name.trim()) {
      toast.error(t('imageEditor.template.nameRequired'))
      return
    }

    setIsSaving(true)

    try {
      await imageEditor.exportTemplate(
        name.trim(),
        description.trim() || undefined,
        dimensionMode,
        savePath,
      )

      toast.success(t('imageEditor.template.saveSuccess'))
      onOpenChange(false)

      // Reset form
      setName('')
      setDescription('')
      setDimensionMode('adaptive')
    } catch (error) {
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
          </div>

          {/* Description */}
          <div className='grid gap-2'>
            <Label htmlFor='template-description'>
              {t('imageEditor.template.description')} {t('common.optional')}
            </Label>
            <Textarea
              id='template-description'
              placeholder={t('imageEditor.template.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Dimension Mode */}
          <div className='grid gap-2'>
            <Label>{t('imageEditor.template.dimensionMode')}</Label>
            <RadioGroup value={dimensionMode} onValueChange={(v) => setDimensionMode(v as any)}>
              <div className='flex items-start space-x-2'>
                <RadioGroupItem value='adaptive' id='adaptive' className='mt-1' />
                <div className='grid gap-1'>
                  <Label htmlFor='adaptive' className='cursor-pointer font-normal'>
                    {t('imageEditor.template.flexible')}
                  </Label>
                  <p className='text-muted-foreground text-sm'>
                    {t('imageEditor.template.flexibleDescription')}
                  </p>
                </div>
              </div>
              <div className='flex items-start space-x-2'>
                <RadioGroupItem value='predefined' id='predefined' className='mt-1' />
                <div className='grid gap-1'>
                  <Label htmlFor='predefined' className='cursor-pointer font-normal'>
                    {t('imageEditor.template.fixed', {
                      width: dimensions.width,
                      height: dimensions.height,
                    })}
                  </Label>
                  <p className='text-muted-foreground text-sm'>
                    {t('imageEditor.template.fixedDescription', {
                      width: dimensions.width,
                      height: dimensions.height,
                    })}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('common.buttons.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
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
    </Dialog>
  )
}

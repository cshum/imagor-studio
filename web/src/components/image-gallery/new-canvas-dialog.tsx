import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Paintbrush } from 'lucide-react'

import { ColorPickerInput } from '@/components/image-editor/controls/color-picker-input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NewCanvasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  galleryKey: string
}

const CANVAS_PRESETS = [
  { label: '1920 × 1080 (HD)', w: 1920, h: 1080 },
  { label: '1080 × 1080 (Square)', w: 1080, h: 1080 },
  { label: '1080 × 1350 (Portrait 4:5)', w: 1080, h: 1350 },
  { label: '1080 × 1920 (Story / Reel)', w: 1080, h: 1920 },
  { label: '1200 × 630 (Social Share)', w: 1200, h: 630 },
  { label: '1500 × 500 (Banner)', w: 1500, h: 500 },
  { label: '2560 × 1440 (QHD)', w: 2560, h: 1440 },
  { label: '3840 × 2160 (4K)', w: 3840, h: 2160 },
] as const

export function NewCanvasDialog({ open, onOpenChange, galleryKey }: NewCanvasDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [width, setWidth] = useState(1080)
  const [height, setHeight] = useState(1080)
  // Color value with alpha support: 'none' = transparent, '000000' = solid black, 'ff660080' = semi-transparent
  const [colorValue, setColorValue] = useState('ffffff')

  const handlePresetChange = (value: string) => {
    if (value === 'custom') return
    const preset = CANVAS_PRESETS.find((p) => `${p.w}x${p.h}` === value)
    if (preset) {
      setWidth(preset.w)
      setHeight(preset.h)
    }
  }

  const handleCreate = () => {
    if (galleryKey) {
      navigate({
        to: '/gallery/$galleryKey/editor/new',
        params: { galleryKey },
        search: { color: colorValue, w: width, h: height },
      })
    } else {
      navigate({
        to: '/editor/new',
        search: { color: colorValue, w: width, h: height },
      })
    }
    onOpenChange(false)
  }

  const currentPreset = CANVAS_PRESETS.find((p) => p.w === width && p.h === height)
  const presetValue = currentPreset ? `${currentPreset.w}x${currentPreset.h}` : 'custom'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Paintbrush className='h-5 w-5' />
            {t('pages.gallery.newCanvas.title')}
          </DialogTitle>
          <DialogDescription>{t('pages.gallery.newCanvas.description')}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Canvas Size Preset */}
          <div className='grid gap-2'>
            <Label>{t('pages.gallery.newCanvas.preset')}</Label>
            <Select value={presetValue} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANVAS_PRESETS.map((preset) => (
                  <SelectItem key={`${preset.w}x${preset.h}`} value={`${preset.w}x${preset.h}`}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value='custom'>{t('pages.gallery.newCanvas.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Width × Height */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-2'>
              <Label htmlFor='canvas-width'>{t('pages.gallery.newCanvas.width')}</Label>
              <Input
                id='canvas-width'
                type='number'
                min={1}
                max={10000}
                value={width}
                onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='canvas-height'>{t('pages.gallery.newCanvas.height')}</Label>
              <Input
                id='canvas-height'
                type='number'
                min={1}
                max={10000}
                value={height}
                onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {/* Background Color with Opacity */}
          <div className='grid gap-2'>
            <Label>{t('pages.gallery.newCanvas.background')}</Label>
            <ColorPickerInput
              value={colorValue}
              onChange={setColorValue}
              swatchSize='md'
              showOpacity
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate}>{t('pages.gallery.newCanvas.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

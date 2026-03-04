import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Type } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericControl } from '@/components/ui/numeric-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { BlendMode, ImageEditor, TextAlign, TextLayer, TextWrap } from '@/lib/image-editor'

interface TextLayerControlsProps {
  layer: TextLayer
  imageEditor: ImageEditor
  isTextEditing: boolean
  onUpdate: (updates: Partial<TextLayer>) => void
  onEditText: () => void
}

const FONTS = [
  'sans',
  'serif',
  'monospace',
  'Noto Sans',
  'DejaVu Sans',
  'Liberation Sans',
  'Ubuntu',
]

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'darken',
  'lighten',
  'mask',
]

const WRAP_MODES: TextWrap[] = ['word', 'char', 'wordchar', 'none']

export function TextLayerControls({
  layer,
  isTextEditing,
  onUpdate,
  onEditText,
}: TextLayerControlsProps) {
  const { t } = useTranslation()

  // ── Typography handlers ──────────────────────────────────────────────────

  const handleFontChange = useCallback(
    (value: string) => {
      onUpdate({ font: value })
    },
    [onUpdate],
  )

  const handleBoldToggle = useCallback(() => {
    const hasBold = layer.fontStyle.includes('bold')
    const hasItalic = layer.fontStyle.includes('italic')
    if (hasBold) {
      onUpdate({ fontStyle: hasItalic ? 'italic' : '' })
    } else {
      onUpdate({ fontStyle: hasItalic ? 'bold italic' : 'bold' })
    }
  }, [layer.fontStyle, onUpdate])

  const handleItalicToggle = useCallback(() => {
    const hasBold = layer.fontStyle.includes('bold')
    const hasItalic = layer.fontStyle.includes('italic')
    if (hasItalic) {
      onUpdate({ fontStyle: hasBold ? 'bold' : '' })
    } else {
      onUpdate({ fontStyle: hasBold ? 'bold italic' : 'italic' })
    }
  }, [layer.fontStyle, onUpdate])

  const handleFontSizeChange = useCallback(
    (value: number) => {
      onUpdate({ fontSize: value })
    },
    [onUpdate],
  )

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Input value is #RRGGBB — strip the '#'
      onUpdate({ color: e.target.value.replace('#', '') })
    },
    [onUpdate],
  )

  // ── Alignment & wrap handlers ────────────────────────────────────────────

  const handleAlignChange = useCallback(
    (value: string) => {
      if (value) {
        onUpdate({ align: value as TextAlign })
      }
    },
    [onUpdate],
  )

  const handleJustifyChange = useCallback(
    (checked: boolean) => {
      onUpdate({ justify: checked })
    },
    [onUpdate],
  )

  const handleWrapWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim()
      if (raw === '' || raw === '0') {
        onUpdate({ width: 0 })
      } else if (raw === 'f') {
        onUpdate({ width: 'f' })
      } else if (raw.endsWith('p')) {
        onUpdate({ width: raw })
      } else {
        const n = parseInt(raw)
        if (!isNaN(n) && n >= 0) onUpdate({ width: n })
      }
    },
    [onUpdate],
  )

  const handleWrapModeChange = useCallback(
    (value: string) => {
      onUpdate({ wrap: value as TextWrap })
    },
    [onUpdate],
  )

  const handleLineSpacingChange = useCallback(
    (value: number) => {
      onUpdate({ spacing: value })
    },
    [onUpdate],
  )

  // ── Compositing handlers ─────────────────────────────────────────────────

  const handleAlphaChange = useCallback(
    (value: number) => {
      // UI shows 0=transparent…100=opaque; imagor uses 0=opaque…100=transparent
      onUpdate({ alpha: 100 - value })
    },
    [onUpdate],
  )

  const handleBlendModeChange = useCallback(
    (value: string) => {
      onUpdate({ blendMode: value as BlendMode })
    },
    [onUpdate],
  )

  // ── Derived values ───────────────────────────────────────────────────────

  const hasBold = layer.fontStyle.includes('bold')
  const hasItalic = layer.fontStyle.includes('italic')
  const colorHex = `#${layer.color.padStart(6, '0')}`
  const wrapWidthDisplay = String(layer.width)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
      {/* Edit Text Button */}
      <Button
        variant={isTextEditing ? 'default' : 'outline'}
        size='default'
        onClick={onEditText}
        className='w-full'
      >
        <Type className='mr-2 h-4 w-4' />
        {isTextEditing ? t('imageEditor.layers.editText') + '…' : t('imageEditor.layers.editText')}
      </Button>

      {/* Font Family */}
      <div className='space-y-1.5'>
        <Label className='text-sm font-medium'>{t('imageEditor.layers.fontFamily')}</Label>
        <Select value={layer.font} onValueChange={handleFontChange}>
          <SelectTrigger className='h-8'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Style + Size row */}
      <div className='flex items-end gap-2'>
        {/* Bold / Italic toggles */}
        <div className='space-y-1.5'>
          <Label className='text-sm font-medium'>{t('imageEditor.layers.fontStyle')}</Label>
          <div className='flex gap-1'>
            <Button
              variant={hasBold ? 'default' : 'outline'}
              size='icon'
              className='h-8 w-8'
              onClick={handleBoldToggle}
              title='Bold'
            >
              <Bold className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant={hasItalic ? 'default' : 'outline'}
              size='icon'
              className='h-8 w-8'
              onClick={handleItalicToggle}
              title='Italic'
            >
              <Italic className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>

        {/* Font Size */}
        <div className='flex-1 space-y-1.5'>
          <Label className='text-sm font-medium'>{t('imageEditor.layers.fontSize')}</Label>
          <Input
            type='number'
            value={layer.fontSize}
            min={1}
            max={999}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (!isNaN(v) && v > 0) handleFontSizeChange(v)
            }}
            className='h-8'
          />
        </div>

        {/* Color picker */}
        <div className='space-y-1.5'>
          <Label className='text-sm font-medium'>{t('imageEditor.layers.textColor')}</Label>
          <div className='flex h-8 w-8 overflow-hidden rounded border'>
            <input
              type='color'
              value={colorHex}
              onChange={handleColorChange}
              className='h-10 w-10 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent p-0'
              title={t('imageEditor.layers.textColor')}
            />
          </div>
        </div>
      </div>

      {/* Alignment */}
      <div className='space-y-1.5'>
        <Label className='text-sm font-medium'>{t('imageEditor.layers.textAlignment')}</Label>
        <ToggleGroup
          type='single'
          value={layer.align}
          onValueChange={handleAlignChange}
          className='justify-start'
        >
          <ToggleGroupItem value='low' size='sm' title='Left'>
            <AlignLeft className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='centre' size='sm' title='Center'>
            <AlignCenter className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='high' size='sm' title='Right'>
            <AlignRight className='h-4 w-4' />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Justify */}
      <div className='flex items-center justify-between'>
        <Label className='text-sm font-medium'>{t('imageEditor.layers.justifyText')}</Label>
        <Button
          variant={layer.justify ? 'default' : 'outline'}
          size='sm'
          className='h-7 px-2 text-xs'
          onClick={() => handleJustifyChange(!layer.justify)}
        >
          {t('imageEditor.layers.justifyText')}
        </Button>
      </div>

      {/* Wrap Width */}
      <div className='space-y-1.5'>
        <Label className='text-sm font-medium'>{t('imageEditor.layers.wrapWidth')}</Label>
        <Input
          type='text'
          value={wrapWidthDisplay}
          onChange={handleWrapWidthChange}
          placeholder='0 / px / 80p / f'
          className='h-8'
        />
      </div>

      {/* Wrap Mode */}
      <div className='space-y-1.5'>
        <Label className='text-sm font-medium'>{t('imageEditor.layers.wrapMode')}</Label>
        <Select value={layer.wrap} onValueChange={handleWrapModeChange}>
          <SelectTrigger className='h-8'>
            <SelectValue>{t(`imageEditor.layers.wrapModes.${layer.wrap}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WRAP_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {t(`imageEditor.layers.wrapModes.${mode}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Line Spacing */}
      <NumericControl
        label={t('imageEditor.layers.lineSpacing')}
        value={layer.spacing}
        min={-100}
        max={200}
        step={1}
        unit='px'
        onChange={handleLineSpacingChange}
      />

      {/* Opacity */}
      <NumericControl
        label={t('imageEditor.layers.transparency')}
        value={100 - layer.alpha}
        min={0}
        max={100}
        step={1}
        unit='%'
        onChange={handleAlphaChange}
      />

      {/* Blend Mode */}
      <div className='space-y-1.5'>
        <Label className='text-sm font-medium'>{t('imageEditor.layers.blendMode')}</Label>
        <Select value={layer.blendMode} onValueChange={handleBlendModeChange}>
          <SelectTrigger className='h-8'>
            <SelectValue>{t(`imageEditor.layers.blendModes.${layer.blendMode}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {BLEND_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>{t(`imageEditor.layers.blendModes.${mode}`)}</span>
                  <span className='text-muted-foreground'>-</span>
                  <span className='text-muted-foreground text-sm'>
                    {t(`imageEditor.layers.blendModeDescriptions.${mode}`)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Copy, Edit, Eye, EyeOff, Pencil, Trash2, Type } from 'lucide-react'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { ImageEditor, Layer } from '@/lib/image-editor'

interface LayerContextMenuProps {
  layer: Layer
  imageEditor: ImageEditor
  onTextEdit?: (layerId: string) => void
  children: React.ReactNode
}

/**
 * Reusable right-click context menu for a layer.
 * Accepts an `imageEditor` instance and handles all actions internally.
 * isFirst/isLast are computed lazily when the menu opens — always fresh.
 * Used in the layer panel list and the canvas overlays.
 */
export function LayerContextMenu({
  layer,
  imageEditor,
  onTextEdit,
  children,
}: LayerContextMenuProps) {
  const { t } = useTranslation()
  const isText = layer.type === 'text'
  const [isFirst, setIsFirst] = useState(false)
  const [isLast, setIsLast] = useState(false)

  // Compute isFirst/isLast fresh each time the menu opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      const layers = imageEditor.getContextLayers()
      const idx = layers.findIndex((l) => l.id === layer.id)
      setIsFirst(idx === layers.length - 1) // topmost visually
      setIsLast(idx === 0) // bottommost visually
    }
  }

  const handleEdit = () => imageEditor.switchContext(layer.id)

  const handleTextEdit = () => onTextEdit?.(layer.id)

  const handleRename = () => {
    imageEditor.setSelectedLayerId(layer.id)
    window.dispatchEvent(new CustomEvent('layer:rename', { detail: { layerId: layer.id } }))
  }

  const handleDuplicate = () => imageEditor.duplicateLayer(layer.id)

  const handleMoveUp = () => {
    const layers = imageEditor.getContextLayers()
    const idx = layers.findIndex((l) => l.id === layer.id)
    if (idx < layers.length - 1) {
      const newOrder = [...layers]
      ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
      imageEditor.reorderLayers(newOrder)
    }
  }

  const handleMoveDown = () => {
    const layers = imageEditor.getContextLayers()
    const idx = layers.findIndex((l) => l.id === layer.id)
    if (idx > 0) {
      const newOrder = [...layers]
      ;[newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]]
      imageEditor.reorderLayers(newOrder)
    }
  }

  const handleToggleVisibility = () => {
    imageEditor.updateLayer(layer.id, { visible: !layer.visible })
  }

  const handleDelete = () => imageEditor.removeLayer(layer.id)

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className='min-w-[180px]'>
        {isText ? (
          <ContextMenuItem onClick={handleTextEdit}>
            <Type className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editText')}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={handleEdit}>
            <Edit className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editLayer')}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleRename}>
          <Pencil className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.renameLayer')}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicate}>
          <div className='flex flex-1 items-center'>
            <Copy className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.duplicateLayer')}
          </div>
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleMoveUp} disabled={isFirst}>
          <ArrowUp className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.moveUp')}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleMoveDown} disabled={isLast}>
          <ArrowDown className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.moveDown')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleToggleVisibility}>
          <div className='flex flex-1 items-center'>
            {layer.visible ? (
              <>
                <EyeOff className='mr-2 h-4 w-4' />
                {t('imageEditor.layers.hideLayer')}
              </>
            ) : (
              <>
                <Eye className='mr-2 h-4 w-4' />
                {t('imageEditor.layers.showLayer')}
              </>
            )}
          </div>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDelete} className='text-destructive'>
          <div className='flex flex-1 items-center'>
            <Trash2 className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.deleteLayer')}
          </div>
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Trash2,
  Type,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ImageEditor, Layer } from '@/lib/image-editor'

interface LayerMenuProps {
  layer: Layer
  imageEditor: ImageEditor
  onTextEdit?: (layerId: string) => void
}

/** Shared action handlers for both context menu and dropdown menu. */
function useLayerMenuHandlers(
  layer: Layer,
  imageEditor: ImageEditor,
  onTextEdit?: (layerId: string) => void,
) {
  const isText = layer.type === 'text'

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
  const handleToggleVisibility = () =>
    imageEditor.updateLayer(layer.id, { visible: !layer.visible })
  const handleDelete = () => imageEditor.removeLayer(layer.id)

  return {
    isText,
    onEdit: handleEdit,
    onTextEdit: handleTextEdit,
    onRename: handleRename,
    onDuplicate: handleDuplicate,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
    onToggleVisibility: handleToggleVisibility,
    onDelete: handleDelete,
  }
}

/** Compute isFirst/isLast from the live layer list. */
function getLayerPosition(layer: Layer, imageEditor: ImageEditor) {
  const layers = imageEditor.getContextLayers()
  const idx = layers.findIndex((l) => l.id === layer.id)
  return {
    isFirst: idx === layers.length - 1, // topmost visually
    isLast: idx === 0, // bottommost visually
  }
}

// ---------------------------------------------------------------------------
// Shared menu item content (used by both ContextMenu and DropdownMenu)
// ---------------------------------------------------------------------------

interface LayerMenuItemsProps {
  layer: Layer
  isFirst: boolean
  isLast: boolean
  isText: boolean
  onEdit: () => void
  onTextEdit: () => void
  onRename: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleVisibility: () => void
  onDelete: () => void
  variant: 'context' | 'dropdown'
}

function LayerMenuItems({
  layer,
  isFirst,
  isLast,
  isText,
  onEdit,
  onTextEdit,
  onRename,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDelete,
  variant,
}: LayerMenuItemsProps) {
  const { t } = useTranslation()

  const Item = variant === 'context' ? ContextMenuItem : DropdownMenuItem
  const Separator = variant === 'context' ? ContextMenuSeparator : DropdownMenuSeparator
  const Shortcut = variant === 'context' ? ContextMenuShortcut : DropdownMenuShortcut

  return (
    <>
      {isText ? (
        <Item onClick={onTextEdit}>
          <Type className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.editText')}
        </Item>
      ) : (
        <Item onClick={onEdit}>
          <Edit className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.editLayer')}
        </Item>
      )}
      <Item onClick={onRename}>
        <Pencil className='mr-2 h-4 w-4' />
        {t('imageEditor.layers.renameLayer')}
      </Item>
      <Item onClick={onDuplicate}>
        <div className='flex flex-1 items-center'>
          <Copy className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.duplicateLayer')}
        </div>
        <Shortcut>⌘D</Shortcut>
      </Item>
      <Separator />
      <Item onClick={onMoveUp} disabled={isFirst}>
        <div className='flex flex-1 items-center'>
          <ArrowUp className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.moveUp')}
        </div>
        <Shortcut>⌘]</Shortcut>
      </Item>
      <Item onClick={onMoveDown} disabled={isLast}>
        <div className='flex flex-1 items-center'>
          <ArrowDown className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.moveDown')}
        </div>
        <Shortcut>⌘[</Shortcut>
      </Item>
      <Separator />
      <Item onClick={onToggleVisibility}>
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
      </Item>
      <Item onClick={onDelete} className='text-destructive'>
        <div className='flex flex-1 items-center'>
          <Trash2 className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.deleteLayer')}
        </div>
        <Shortcut>⌫</Shortcut>
      </Item>
    </>
  )
}

// ---------------------------------------------------------------------------
// LayerContextMenu — right-click context menu wrapper
// ---------------------------------------------------------------------------

interface LayerContextMenuProps extends LayerMenuProps {
  children: React.ReactNode
}

/**
 * Reusable right-click context menu for a layer.
 * isFirst/isLast are computed lazily when the menu opens — always fresh.
 */
export function LayerContextMenu({
  layer,
  imageEditor,
  onTextEdit,
  children,
}: LayerContextMenuProps) {
  const [isFirst, setIsFirst] = useState(false)
  const [isLast, setIsLast] = useState(false)

  const handlers = useLayerMenuHandlers(layer, imageEditor, onTextEdit)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      const pos = getLayerPosition(layer, imageEditor)
      setIsFirst(pos.isFirst)
      setIsLast(pos.isLast)
    }
  }

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className='min-w-[180px]'>
        <LayerMenuItems
          layer={layer}
          isFirst={isFirst}
          isLast={isLast}
          variant='context'
          {...handlers}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ---------------------------------------------------------------------------
// LayerDropdownMenu — MoreVertical button + dropdown menu
// ---------------------------------------------------------------------------

/**
 * Reusable dropdown menu (⋮ button) for a layer.
 * isFirst/isLast are computed lazily when the menu opens — always fresh.
 * Used in the layer panel list item.
 */
export function LayerDropdownMenu({ layer, imageEditor, onTextEdit }: LayerMenuProps) {
  const { t } = useTranslation()
  const [isFirst, setIsFirst] = useState(false)
  const [isLast, setIsLast] = useState(false)

  const handlers = useLayerMenuHandlers(layer, imageEditor, onTextEdit)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      const pos = getLayerPosition(layer, imageEditor)
      setIsFirst(pos.isFirst)
      setIsLast(pos.isLast)
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7'
          onClick={(e) => e.stopPropagation()}
          title={t('imageEditor.layers.layerActions')}
        >
          <MoreVertical className='h-3.5 w-3.5' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-[180px]'>
        <LayerMenuItems
          layer={layer}
          isFirst={isFirst}
          isLast={isLast}
          variant='dropdown'
          {...handlers}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

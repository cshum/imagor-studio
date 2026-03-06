import { useTranslation } from 'react-i18next'
import { Copy, Edit, Eye, EyeOff, Pencil, Trash2, Type } from 'lucide-react'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { Layer } from '@/lib/image-editor'

export interface LayerContextMenuCallbacks {
  onEdit: (layerId: string) => void
  onTextEdit: (layerId: string) => void
  onRename: (layerId: string) => void
  onDuplicate: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onDelete: (layerId: string) => void
}

interface LayerContextMenuProps extends LayerContextMenuCallbacks {
  layer: Layer
  children: React.ReactNode
}

/**
 * Reusable right-click context menu for a layer.
 * Used in both the layer panel list and the canvas overlays.
 */
export function LayerContextMenu({
  layer,
  children,
  onEdit,
  onTextEdit,
  onRename,
  onDuplicate,
  onToggleVisibility,
  onDelete,
}: LayerContextMenuProps) {
  const { t } = useTranslation()
  const isText = layer.type === 'text'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className='min-w-[180px]'>
        {isText ? (
          <ContextMenuItem onClick={() => onTextEdit(layer.id)}>
            <Type className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editText')}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={() => onEdit(layer.id)}>
            <Edit className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editLayer')}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onRename(layer.id)}>
          <Pencil className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.renameLayer')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(layer.id)}>
          <div className='flex flex-1 items-center'>
            <Copy className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.duplicateLayer')}
          </div>
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onToggleVisibility(layer.id)}>
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
        <ContextMenuItem onClick={() => onDelete(layer.id)} className='text-destructive'>
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

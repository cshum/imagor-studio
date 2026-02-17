import React, { useState } from 'react'

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'

export interface TemplateContextData {
  templateKey: string | null
  templateName: string
}

interface TemplateContextMenuProps {
  children: React.ReactNode
  renderMenuItems?: (contextData: TemplateContextData) => React.ReactNode
  renderBulkMenuItems?: () => React.ReactNode
  selectedItems?: Set<string>
  selectedCount?: number
  galleryKey?: string
}

export const TemplateContextMenu: React.FC<TemplateContextMenuProps> = ({
  children,
  renderMenuItems,
  renderBulkMenuItems,
  selectedItems,
  selectedCount = 0,
  galleryKey = '',
}) => {
  const [contextTemplateKey, setContextTemplateKey] = useState<string | null>(null)
  const [contextTemplateName, setContextTemplateName] = useState<string>('')
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    // Find the closest template element using event delegation
    const templateElement = (e.target as Element).closest('[data-template-key]')
    if (templateElement) {
      const templateKey = templateElement.getAttribute('data-template-key')
      const templateName = templateElement.getAttribute('data-template-name') || ''

      // If this template is in the selection AND multiple items are selected, show bulk menu
      if (selectedItems && templateKey && selectedCount > 1) {
        // Construct full template path for comparison with selectedItems
        const fullTemplatePath = galleryKey ? `${galleryKey}/${templateKey}` : templateKey

        if (selectedItems.has(fullTemplatePath)) {
          setShowBulkMenu(true)
          setContextTemplateKey(null)
          return
        }
      }

      // Show individual menu
      setShowBulkMenu(false)
      setContextTemplateKey(templateKey)
      setContextTemplateName(templateName)
    } else {
      // Not a template - let it pass through to parent context menu
      setContextTemplateKey(null)
      setShowBulkMenu(false)
    }
  }

  const contextData: TemplateContextData = {
    templateKey: contextTemplateKey,
    templateName: contextTemplateName,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenuOpen}>{children}</div>
      </ContextMenuTrigger>
      {showBulkMenu && renderBulkMenuItems && (
        <ContextMenuContent className='w-56'>{renderBulkMenuItems()}</ContextMenuContent>
      )}
      {!showBulkMenu && contextTemplateKey && renderMenuItems && (
        <ContextMenuContent className='w-56'>{renderMenuItems(contextData)}</ContextMenuContent>
      )}
    </ContextMenu>
  )
}

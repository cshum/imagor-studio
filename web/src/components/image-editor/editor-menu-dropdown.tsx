import { useTranslation } from 'react-i18next'
import { Check, Copy, Download, Eye, FileDown, Languages, Redo2, Undo2 } from 'lucide-react'

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { availableLanguages } from '@/i18n'
import {
  SECTION_KEYS,
  type EditorOpenSections,
  type SectionKey,
} from '@/lib/editor-open-sections-storage'

interface EditorMenuDropdownProps {
  onDownload: () => void
  onCopyUrl: () => void
  onSaveTemplate: () => void
  onLanguageChange: (languageCode: string) => void
  onToggleSectionVisibility: (sectionKey: SectionKey) => void
  editorOpenSections: EditorOpenSections
  iconMap: Record<string, React.ComponentType<{ className?: string }>>
  titleKeyMap: Record<string, string>
  includeUndoRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export function EditorMenuDropdown({
  onDownload,
  onCopyUrl,
  onSaveTemplate,
  onLanguageChange,
  onToggleSectionVisibility,
  editorOpenSections,
  iconMap,
  titleKeyMap,
  includeUndoRedo = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: EditorMenuDropdownProps) {
  const { t, i18n } = useTranslation()

  return (
    <DropdownMenuContent align='end' className='w-56'>
      {/* Mobile menu - includes Undo/Redo + all actions */}
      {includeUndoRedo && onUndo && onRedo && (
        <>
          <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>
            <Undo2 className='mr-3 h-4 w-4' />
            {t('imageEditor.page.undo')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRedo} disabled={!canRedo}>
            <Redo2 className='mr-3 h-4 w-4' />
            {t('imageEditor.page.redo')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownload}>
            <Download className='mr-3 h-4 w-4' />
            {t('imageEditor.page.download')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyUrl}>
            <Copy className='mr-3 h-4 w-4' />
            {t('imageEditor.page.copyUrl')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              // Close dropdown first, then open dialog after a short delay
              setTimeout(() => onSaveTemplate(), 100)
            }}
          >
            <FileDown className='mr-3 h-4 w-4' />
            {t('imageEditor.template.saveTemplate')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      {/* Main actions (Desktop/Tablet) */}
      {!includeUndoRedo && (
        <>
          <DropdownMenuItem onClick={onDownload}>
            <Download className='mr-3 h-4 w-4' />
            {t('imageEditor.page.download')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyUrl}>
            <Copy className='mr-3 h-4 w-4' />
            {t('imageEditor.page.copyUrl')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setTimeout(() => onSaveTemplate(), 0)
            }}
          >
            <FileDown className='mr-3 h-4 w-4' />
            {t('imageEditor.template.saveTemplate')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      {/* Language submenu */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Languages className='mr-3 h-4 w-4' />
          {t('common.language.title')}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            {availableLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onSelect={(e) => {
                  e.preventDefault()
                  onLanguageChange(lang.code)
                }}
              >
                {lang.name}
                {i18n.language === lang.code && <Check className='ml-auto h-4 w-4' />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>

      <DropdownMenuSeparator />

      {/* Show/Hide Controls submenu */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Eye className='mr-3 h-4 w-4' />
          {t('imageEditor.page.showHideControls')}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            {SECTION_KEYS.map((sectionKey) => {
              const isVisible = editorOpenSections.visibleSections?.includes(sectionKey) ?? true
              const SectionIcon = iconMap[sectionKey]
              return (
                <DropdownMenuItem
                  key={sectionKey}
                  onSelect={(e) => {
                    e.preventDefault()
                    onToggleSectionVisibility(sectionKey)
                  }}
                >
                  <div className='flex w-full items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <SectionIcon className='h-4 w-4' />
                      <span>{t(titleKeyMap[sectionKey])}</span>
                    </div>
                    <div className='flex w-4 items-center justify-center'>
                      {isVisible && <Check className='h-4 w-4' />}
                    </div>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuContent>
  )
}

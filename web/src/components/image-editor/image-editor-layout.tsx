import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { closestCenter, DndContext } from '@dnd-kit/core'
import { ChevronLeft, Download, FileText, MoreVertical, Redo2, Undo2 } from 'lucide-react'

import { EditorMenuDropdown } from '@/components/image-editor/editor-menu-dropdown'
import { SectionDragOverlay } from '@/components/image-editor/section-drag-overlay'
import { LoadingBar } from '@/components/loading-bar'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useEditorSectionDnd } from '@/hooks/use-editor-section-dnd'
import type { EditorSections, SectionKey } from '@/lib/editor-sections'
import { cn } from '@/lib/utils'

export interface ImageEditorLayoutProps {
  // Loading
  isLoading: boolean

  // Header
  isEmbedded: boolean
  onBack: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  isTemplate: boolean
  onSaveTemplate: () => void
  onDownload: () => void
  onCopyUrl: () => void
  onSaveTemplateAs: () => void
  onApplyTemplate: () => void
  onLanguageChange: (code: string) => void
  onToggleSectionVisibility: (key: SectionKey) => void
  editorOpenSections: EditorSections
  onOpenSectionsChange: (sections: EditorSections) => void

  // Desktop-only header: layer breadcrumb
  layerBreadcrumb?: React.ReactNode

  // Preview area (render prop - receives column sizing info)
  previewArea: (props: {
    isLeftColumnEmpty: boolean
    isRightColumnEmpty: boolean
  }) => React.ReactNode

  // Controls (rendered by parent, used in sidebar and mobile sheet)
  leftControls: React.ReactNode
  rightControls: React.ReactNode
  singleColumnControls: React.ReactNode

  // Status bar
  imagorPath: string

  // Zoom control (desktop and tablet only)
  zoomControl: React.ReactNode

  // Mobile sheet
  mobileSheetOpen: boolean
  onMobileSheetOpenChange: (open: boolean) => void

  // Section components for drag overlay (keyed by SectionKey)
  sectionComponents: Record<SectionKey, React.ReactNode>
}

export function ImageEditorLayout({
  isLoading,
  isEmbedded,
  onBack,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isTemplate,
  onSaveTemplate,
  onDownload,
  onCopyUrl,
  onSaveTemplateAs,
  onApplyTemplate,
  onLanguageChange,
  onToggleSectionVisibility,
  editorOpenSections,
  onOpenSectionsChange,
  layerBreadcrumb,
  previewArea,
  leftControls,
  rightControls,
  singleColumnControls,
  imagorPath,
  zoomControl,
  mobileSheetOpen,
  onMobileSheetOpenChange,
  sectionComponents,
}: ImageEditorLayoutProps) {
  const { t } = useTranslation()
  const isMobile = !useBreakpoint('md')
  const isDesktop = useBreakpoint('lg')
  const isTablet = !isMobile && !isDesktop

  // Use shared DnD hook (desktop only)
  const { activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useEditorSectionDnd(
    editorOpenSections,
    onOpenSectionsChange,
  )

  // Calculate if columns are empty for smart sizing (desktop)
  const leftColumnSections = editorOpenSections.leftColumn.filter((id) => {
    const visibleSections = editorOpenSections.visibleSections || []
    if (visibleSections.length > 0 && !visibleSections.includes(id)) {
      return false
    }
    return true
  })

  const rightColumnSections = editorOpenSections.rightColumn.filter((id) => {
    const visibleSections = editorOpenSections.visibleSections || []
    if (visibleSections.length > 0 && !visibleSections.includes(id)) {
      return false
    }
    return true
  })

  const isLeftColumnEmpty = leftColumnSections.length === 0
  const isRightColumnEmpty = rightColumnSections.length === 0

  // Memoize the rendered preview area to prevent infinite render loops
  const renderedPreviewArea = useMemo(
    () => previewArea({ isLeftColumnEmpty, isRightColumnEmpty }),
    [previewArea, isLeftColumnEmpty, isRightColumnEmpty],
  )

  // --- Shared sub-components ---
  const primaryActionButton = isTemplate ? (
    <>
      <Button
        variant='outline'
        size='sm'
        onClick={onSaveTemplate}
        className='rounded-r-none border-r-0'
      >
        <FileText className='mr-1 h-4 w-4' />
        {t('imageEditor.template.saveTemplate')}
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='rounded-l-none px-2'>
            <MoreVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <EditorMenuDropdown
          onDownload={onDownload}
          onCopyUrl={onCopyUrl}
          onSaveTemplate={onSaveTemplateAs}
          onApplyTemplate={onApplyTemplate}
          onLanguageChange={onLanguageChange}
          onToggleSectionVisibility={onToggleSectionVisibility}
          editorOpenSections={editorOpenSections}
          isTemplate={isTemplate}
        />
      </DropdownMenu>
    </>
  ) : (
    <>
      <Button
        variant='outline'
        size='sm'
        onClick={onDownload}
        className='rounded-r-none border-r-0'
      >
        <Download className='mr-1 h-4 w-4' />
        {t('imageEditor.page.download')}
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='rounded-l-none px-2'>
            <MoreVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <EditorMenuDropdown
          onDownload={onDownload}
          onCopyUrl={onCopyUrl}
          onSaveTemplate={onSaveTemplateAs}
          onApplyTemplate={onApplyTemplate}
          onLanguageChange={onLanguageChange}
          onToggleSectionVisibility={onToggleSectionVisibility}
          editorOpenSections={editorOpenSections}
        />
      </DropdownMenu>
    </>
  )

  const centeredTitle = (
    <div className='flex flex-1 justify-center'>
      <a
        href='https://imagor.net'
        target='_blank'
        className='text-foreground hover:text-foreground/80 text-lg font-semibold transition-colors'
      >
        {t('common.navigation.title')}
      </a>
    </div>
  )

  const backButton = (
    <Button variant='outline' size='sm' className={cn(isEmbedded && 'invisible')} onClick={onBack}>
      <ChevronLeft className='mr-1 h-4 w-4' />
      {t('imageEditor.page.back')}
    </Button>
  )

  const undoRedoButtons = (
    <>
      <Button
        variant='ghost'
        size='sm'
        onClick={onUndo}
        disabled={!canUndo}
        title={t('imageEditor.page.undo')}
      >
        <Undo2 className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={onRedo}
        disabled={!canRedo}
        title={t('imageEditor.page.redo')}
      >
        <Redo2 className='h-4 w-4' />
      </Button>
    </>
  )

  // --- Mobile Layout ---
  if (isMobile) {
    return (
      <div className='bg-background ios-no-drag min-h-screen-safe flex overflow-hidden overscroll-none select-none'>
        <LoadingBar isLoading={isLoading} />

        <div className='ios-preview-container-fix flex flex-1 flex-col'>
          {/* Header */}
          <div className='flex items-center gap-2 border-b p-3'>
            {backButton}
            {centeredTitle}
            <div className='ml-auto flex items-center gap-2'>
              <ModeToggle />
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm'>
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <EditorMenuDropdown
                  onDownload={onDownload}
                  onCopyUrl={onCopyUrl}
                  onSaveTemplate={onSaveTemplateAs}
                  onApplyTemplate={onApplyTemplate}
                  onLanguageChange={onLanguageChange}
                  onToggleSectionVisibility={onToggleSectionVisibility}
                  editorOpenSections={editorOpenSections}
                  includeUndoRedo={true}
                  onUndo={onUndo}
                  onRedo={onRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                />
              </DropdownMenu>
            </div>
          </div>

          {/* Preview */}
          {renderedPreviewArea}

          {/* Controls Sheet */}
          <Sheet open={mobileSheetOpen} onOpenChange={onMobileSheetOpenChange}>
            <SheetTrigger asChild>
              <button className='hidden' />
            </SheetTrigger>
            <SheetContent
              side='right'
              hideClose={true}
              className='flex w-full flex-col gap-0 p-0 sm:w-96'
            >
              <SheetHeader className='border-b p-3'>
                <div className='flex items-center gap-3'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onMobileSheetOpenChange(false)}
                  >
                    <ChevronLeft className='mr-1 h-4 w-4' />
                    {t('imageEditor.page.back')}
                  </Button>
                  <SheetTitle className='flex-1 text-center'>
                    {t('imageEditor.page.controls')}
                  </SheetTitle>
                  <div className='w-[72px]' />
                </div>
              </SheetHeader>
              <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
                {singleColumnControls}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    )
  }

  // --- Tablet Layout ---
  if (isTablet) {
    return (
      <div className='bg-background ios-no-drag grid h-screen grid-rows-[auto_1fr_auto] overscroll-none select-none'>
        <LoadingBar isLoading={isLoading} />

        {/* Header */}
        <div className='flex items-center gap-2 border-b p-3'>
          {backButton}
          {centeredTitle}
          <div className='ml-auto flex items-center gap-2'>
            <ModeToggle />
            {undoRedoButtons}
            <div className='inline-flex items-center rounded-md'>{primaryActionButton}</div>
          </div>
        </div>

        {/* Main content - Two columns */}
        <div className='grid w-full grid-cols-[1fr_330px] overflow-hidden'>
          <div className='flex min-w-0 flex-col overflow-hidden'>{renderedPreviewArea}</div>
          <div className='bg-background flex flex-col overflow-hidden border-l'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              {singleColumnControls}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className='bg-background scrollbar-hide flex h-12 items-center overflow-x-auto overflow-y-hidden border-t px-4'>
          <code className='text-muted-foreground pr-36 font-mono text-xs whitespace-nowrap select-text'>
            {imagorPath}
          </code>
        </div>

        {/* Zoom Controls */}
        <div className='pointer-events-none fixed right-4 bottom-0 z-20 flex h-12 items-center'>
          <div className='pointer-events-auto'>{zoomControl}</div>
        </div>
      </div>
    )
  }

  // --- Desktop Layout ---
  return (
    <div className='bg-background ios-no-drag grid h-screen grid-rows-[auto_1fr_auto] overscroll-none select-none'>
      <LoadingBar isLoading={isLoading} />

      {/* Header */}
      <div className='flex items-center gap-2 border-b p-3'>
        {backButton}
        {layerBreadcrumb && <div className='w-[220px]'>{layerBreadcrumb}</div>}
        {centeredTitle}
        <div className='ml-auto flex items-center gap-2'>
          <ModeToggle />
          {undoRedoButtons}
          <div className='inline-flex items-center rounded-md'>{primaryActionButton}</div>
        </div>
      </div>

      {/* Main content - Three columns with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className='grid overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out'
          style={{
            gridTemplateColumns: `${isLeftColumnEmpty ? '60px' : '330px'} 1fr ${isRightColumnEmpty ? '60px' : '330px'}`,
          }}
        >
          {/* Left Column */}
          <div className='bg-background flex flex-col overflow-hidden border-r'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              {leftControls}
            </div>
          </div>

          {/* Center - Preview */}
          <div className='flex flex-col overflow-hidden'>{renderedPreviewArea}</div>

          {/* Right Column */}
          <div className='bg-background flex flex-col overflow-hidden border-l'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              {rightControls}
            </div>
          </div>
        </div>

        {/* Shared Drag Overlay */}
        <SectionDragOverlay
          activeId={activeId}
          openSections={editorOpenSections}
          sectionComponents={sectionComponents}
        />
      </DndContext>

      {/* Status bar */}
      <div className='bg-background scrollbar-hide flex h-12 items-center overflow-x-auto overflow-y-hidden border-t px-4'>
        <code className='text-muted-foreground pr-36 font-mono text-xs whitespace-nowrap select-text'>
          {imagorPath}
        </code>
      </div>

      {/* Zoom Controls */}
      <div className='pointer-events-none fixed right-4 bottom-0 z-20 flex h-12 items-center'>
        <div className='pointer-events-auto'>{zoomControl}</div>
      </div>
    </div>
  )
}

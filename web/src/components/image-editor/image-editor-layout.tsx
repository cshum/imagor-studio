import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Download,
  FileText,
  GripVertical,
  MoreVertical,
  Redo2,
  Undo2,
} from 'lucide-react'

import { EditorMenuDropdown } from '@/components/image-editor/editor-menu-dropdown'
import { ZoomControls } from '@/components/image-editor/zoom-controls'
import { LoadingBar } from '@/components/loading-bar'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import type { EditorOpenSections, SectionKey } from '@/lib/editor-open-sections-storage'
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
  editorOpenSections: EditorOpenSections
  iconMap: Record<string, React.ComponentType<{ className?: string }>>
  titleKeyMap: Record<string, string>

  // Desktop-only header: breadcrumb
  breadcrumb?: React.ReactNode

  // Preview area (rendered by parent)
  preview: React.ReactNode

  // Controls (rendered by parent, used in sidebar and mobile sheet)
  leftControls: React.ReactNode
  rightControls: React.ReactNode
  singleColumnControls: React.ReactNode

  // Status bar
  imagorPath: string

  // Zoom
  zoom: number | 'fit'
  onZoomChange: (zoom: number | 'fit') => void
  actualScale: number | null

  // Mobile sheet
  mobileSheetOpen: boolean
  onMobileSheetOpenChange: (open: boolean) => void

  // Desktop DnD
  activeId: string | null
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: () => void
  activeSectionComponent?: React.ReactNode

  // Desktop column empty states
  isLeftColumnEmpty: boolean
  isRightColumnEmpty: boolean

  // Dialogs (rendered by parent)
  dialogs: React.ReactNode
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
  iconMap,
  titleKeyMap,
  breadcrumb,
  preview,
  leftControls,
  rightControls,
  singleColumnControls,
  imagorPath,
  zoom,
  onZoomChange,
  actualScale,
  mobileSheetOpen,
  onMobileSheetOpenChange,
  activeId,
  onDragStart,
  onDragOver,
  onDragEnd,
  activeSectionComponent,
  isLeftColumnEmpty,
  isRightColumnEmpty,
  dialogs,
}: ImageEditorLayoutProps) {
  const { t } = useTranslation()
  const isMobile = !useBreakpoint('md')
  const isDesktop = useBreakpoint('lg')
  const isTablet = !isMobile && !isDesktop

  const ActiveIcon = activeId ? iconMap[activeId] : null

  // Drag and drop sensors for desktop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
          iconMap={iconMap}
          titleKeyMap={titleKeyMap}
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
          iconMap={iconMap}
          titleKeyMap={titleKeyMap}
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
                  iconMap={iconMap}
                  titleKeyMap={titleKeyMap}
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
          {preview}

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

        {dialogs}
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
          <div className='flex min-w-0 flex-col overflow-hidden'>{preview}</div>
          <div className='bg-background flex flex-col overflow-hidden border-l'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              {singleColumnControls}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className='bg-background h-12 overflow-x-auto overflow-y-hidden border-t px-4 pt-2'>
          <code className='text-muted-foreground font-mono text-xs whitespace-nowrap select-text'>
            {imagorPath}
          </code>
        </div>

        {dialogs}
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
        {breadcrumb && <div className='w-[220px]'>{breadcrumb}</div>}
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
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
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
          <div className='flex flex-col overflow-hidden'>{preview}</div>

          {/* Right Column */}
          <div className='bg-background flex flex-col overflow-hidden border-l'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              {rightControls}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeSectionComponent && ActiveIcon ? (
            <div className='bg-card w-[305px] rounded-md border shadow-lg'>
              <Collapsible open={editorOpenSections[activeId as SectionKey]}>
                <div className='flex w-full items-center'>
                  <div className='py-2 pr-1 pl-3'>
                    <GripVertical className='h-4 w-4' />
                  </div>
                  <div className='flex flex-1 items-center justify-between py-2 pr-3'>
                    <div className='flex items-center gap-2'>
                      <ActiveIcon className='h-4 w-4' />
                      <span className='font-medium'>{t(titleKeyMap[activeId!])}</span>
                    </div>
                    {editorOpenSections[activeId as SectionKey] ? (
                      <ChevronUp className='h-4 w-4' />
                    ) : (
                      <ChevronDown className='h-4 w-4' />
                    )}
                  </div>
                </div>
                <CollapsibleContent className='overflow-hidden px-3 pt-1 pb-3'>
                  {activeSectionComponent}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Status bar */}
      <div className='bg-background flex h-12 items-center overflow-x-auto overflow-y-hidden border-t px-4'>
        <code className='text-muted-foreground pr-36 font-mono text-xs whitespace-nowrap select-text'>
          {imagorPath}
        </code>
      </div>

      {/* Zoom Controls */}
      <div className='pointer-events-none fixed right-4 bottom-0 z-20 flex h-12 items-center'>
        <div className='pointer-events-auto'>
          <ZoomControls zoom={zoom} onZoomChange={onZoomChange} actualScale={actualScale} />
        </div>
      </div>

      {dialogs}
    </div>
  )
}

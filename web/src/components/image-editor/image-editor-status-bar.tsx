import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleHelp, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  buildStatusBarSegments,
  type StatusBarMatchKey,
  type StatusBarSegment,
  type StatusBarSegmentPart,
} from '@/lib/image-editor-status-bar'
import { cn } from '@/lib/utils'

interface ImageEditorStatusBarProps {
  imagorPath: string
  activeStatusBarKeys?: StatusBarMatchKey[]
  onTokenClick?: (matchKeys: StatusBarMatchKey[]) => void
}

interface StatusBarTokenProps {
  part: StatusBarSegmentPart
  previousPart?: StatusBarSegmentPart
  hasActiveStatusBarKeys: boolean
  activeStatusBarKeys: StatusBarMatchKey[]
  onTokenClick?: (matchKeys: StatusBarMatchKey[]) => void
}

function StatusBarToken({
  part,
  previousPart,
  hasActiveStatusBarKeys,
  activeStatusBarKeys,
  onTokenClick,
}: StatusBarTokenProps) {
  const isHighlighted =
    hasActiveStatusBarKeys &&
    !!part.matchKeys?.length &&
    part.matchKeys.some((key) => activeStatusBarKeys.includes(key))
  const isClickable = !!part.matchKeys?.some((key) => key.startsWith('layer:'))

  const textClassName = cn(
    'transition-colors',
    isHighlighted ? 'text-foreground' : 'text-muted-foreground/70',
  )

  return (
    <>
      {part.prefix ? (
        <span className='sr-only'>{part.prefix}</span>
      ) : (
        previousPart &&
        !previousPart.text.endsWith(':') && <span className='text-muted-foreground/60'>:</span>
      )}
      {part.hint ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              data-status-bar-highlighted={isHighlighted ? 'true' : undefined}
              onClick={() => {
                if (part.matchKeys?.length) {
                  onTokenClick?.(part.matchKeys)
                }
              }}
              className={cn(
                'rounded no-underline decoration-dotted underline-offset-3 hover:underline',
                textClassName,
                isHighlighted ? 'hover:text-foreground' : 'hover:text-foreground/85',
                isClickable && 'cursor-pointer',
              )}
            >
              {part.prefix}
              {part.text}
            </button>
          </TooltipTrigger>
          <TooltipContent className='max-w-xs space-y-2 px-3 py-2'>
            <div className='text-sm font-medium'>{part.hint.title}</div>
            <p className='text-muted-foreground text-xs leading-relaxed'>{part.hint.description}</p>
            {part.hint.docsUrl && part.hint.docsLabel && (
              <a
                href={part.hint.docsUrl}
                target='_blank'
                rel='noreferrer'
                className='text-primary inline-flex items-center gap-1 text-xs hover:underline'
              >
                {part.hint.docsLabel}
                <ExternalLink className='h-3 w-3' />
              </a>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span
          data-status-bar-highlighted={isHighlighted ? 'true' : undefined}
          className={textClassName}
        >
          {part.prefix}
          {part.text}
        </span>
      )}
    </>
  )
}

function StatusBarHelpPopover() {
  const { t } = useTranslation()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='text-muted-foreground hover:text-foreground h-7 w-7 shrink-0'
          aria-label={t('imageEditor.page.statusBar.helpTitle')}
        >
          <CircleHelp className='h-4 w-4' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-80 space-y-3'>
        <div className='space-y-1'>
          <h4 className='text-sm font-semibold'>{t('imageEditor.page.statusBar.helpTitle')}</h4>
          <p className='text-muted-foreground text-sm'>
            {t('imageEditor.page.statusBar.helpDescription')}
          </p>
        </div>
        <div className='space-y-1'>
          <div className='text-xs font-medium tracking-wide uppercase'>
            {t('imageEditor.page.statusBar.syntaxTitle')}
          </div>
          <code className='bg-muted block overflow-x-auto rounded px-2 py-1 font-mono text-xs'>
            {t('imageEditor.page.statusBar.syntaxExample')}
          </code>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ImageEditorStatusBar({
  imagorPath,
  activeStatusBarKeys = [],
  onTokenClick,
}: ImageEditorStatusBarProps) {
  const { t } = useTranslation()
  const hasActiveStatusBarKeys = activeStatusBarKeys.length > 0
  const imageEndpointDocsUrl = 'https://docs.imagor.net/image-endpoint'
  const filtersDocsUrl = 'https://docs.imagor.net/filters'
  const statusBarScrollerRef = useRef<HTMLDivElement>(null)

  const statusBarSegments = useMemo<StatusBarSegment[]>(() => {
    return buildStatusBarSegments({
      imagorPath,
      t,
      imageEndpointDocsUrl,
      filtersDocsUrl,
    })
  }, [filtersDocsUrl, imageEndpointDocsUrl, imagorPath, t])

  useEffect(() => {
    if (!hasActiveStatusBarKeys) {
      return
    }

    const scroller = statusBarScrollerRef.current
    const highlightedPart = scroller?.querySelector<HTMLElement>(
      '[data-status-bar-highlighted="true"]',
    )

    if (!scroller || !highlightedPart) {
      return
    }

    const scrollerRect = scroller.getBoundingClientRect()
    const highlightedRect = highlightedPart.getBoundingClientRect()
    const isLeftClipped = highlightedRect.left < scrollerRect.left
    const isRightClipped = highlightedRect.right > scrollerRect.right

    if (!isLeftClipped && !isRightClipped) {
      return
    }

    highlightedPart.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeStatusBarKeys, hasActiveStatusBarKeys, statusBarSegments])

  return (
    <TooltipProvider delayDuration={150}>
      <div className='bg-background scrollbar-hide flex h-12 items-center gap-3 overflow-x-auto overflow-y-hidden overscroll-none border-t px-4 pr-28'>
        <div
          ref={statusBarScrollerRef}
          data-status-bar-scroller='true'
          className='scrollbar-hide min-w-0 flex-1 overflow-x-auto'
        >
          <code className='text-muted-foreground flex items-center pr-36 font-mono text-xs whitespace-nowrap select-text'>
            {statusBarSegments.map((segment, index) => (
              <React.Fragment key={`${index}-${segment.parts.map((part) => part.text).join(':')}`}>
                <span className='text-muted-foreground/60'>/</span>
                {segment.parts.map((part, partIndex) => (
                  <React.Fragment key={`${part.text}-${partIndex}`}>
                    <StatusBarToken
                      part={part}
                      previousPart={segment.parts[partIndex - 1]}
                      hasActiveStatusBarKeys={hasActiveStatusBarKeys}
                      activeStatusBarKeys={activeStatusBarKeys}
                      onTokenClick={onTokenClick}
                    />
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </code>
        </div>
        <StatusBarHelpPopover />
      </div>
    </TooltipProvider>
  )
}

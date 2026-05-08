import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'

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
  sourceImagePath?: string
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

export function ImageEditorStatusBar({
  imagorPath,
  sourceImagePath,
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
      sourceImagePath,
      t,
      imageEndpointDocsUrl,
      filtersDocsUrl,
    })
  }, [filtersDocsUrl, imageEndpointDocsUrl, imagorPath, sourceImagePath, t])

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
      <div className='bg-background scrollbar-hide flex h-12 items-center overflow-x-auto overflow-y-hidden overscroll-none border-t px-4'>
        <div
          ref={statusBarScrollerRef}
          data-status-bar-scroller='true'
          className='scrollbar-hide min-w-0 flex-1 overflow-x-auto'
        >
          <code className='text-muted-foreground flex items-center font-mono text-xs whitespace-nowrap select-text'>
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
      </div>
    </TooltipProvider>
  )
}

/**
 * ResponsiveDialog
 *
 * On desktop (sm+): renders as a centered Dialog modal.
 * On mobile (<sm):  renders as a Sheet sliding up from the bottom,
 *                   with a ← back button instead of ×.
 *
 * Usage — drop-in replacement for Dialog + DialogContent:
 *
 *   <ResponsiveDialog open={open} onOpenChange={setOpen} contentClassName="sm:max-w-xl">
 *     <ResponsiveDialogHeader>
 *       <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
 *       <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
 *     </ResponsiveDialogHeader>
 *     ...body...
 *     <ResponsiveDialogFooter>...</ResponsiveDialogFooter>
 *   </ResponsiveDialog>
 */

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/utils'

import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './sheet'

// ─── Context ────────────────────────────────────────────────────────────────

const ResponsiveDialogContext = React.createContext<{ isDesktop: boolean }>({ isDesktop: true })

const useResponsiveDialog = () => React.useContext(ResponsiveDialogContext)

// ─── Root ────────────────────────────────────────────────────────────────────

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Extra className applied to the DialogContent (desktop) or SheetContent (mobile) */
  contentClassName?: string
  children: React.ReactNode
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  contentClassName,
  children,
}: ResponsiveDialogProps) {
  const isDesktop = useBreakpoint('sm')
  const { t } = useTranslation()

  if (isDesktop) {
    return (
      <ResponsiveDialogContext.Provider value={{ isDesktop: true }}>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={contentClassName}>{children}</DialogContent>
        </Dialog>
      </ResponsiveDialogContext.Provider>
    )
  }

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop: false }}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side='bottom'
          hideClose
          className={cn(
            'pb-safe max-h-[92vh] overflow-y-auto rounded-t-xl px-0 pt-2',
            contentClassName,
          )}
        >
          {/* Back button row */}
          <div className='px-4 pb-2'>
            <Button
              variant='ghost'
              className='text-muted-foreground -ml-2 gap-2 px-3 text-base'
              onClick={() => onOpenChange?.(false)}
            >
              <ArrowLeft className='h-5 w-5' />
              {t('common.buttons.back')}
            </Button>
          </div>

          {/* Content */}
          <div className='px-6 pb-6'>{children}</div>
        </SheetContent>
      </Sheet>
    </ResponsiveDialogContext.Provider>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogHeader className={className} {...props} />
  }

  return <SheetHeader className={cn('text-left', className)} {...props} />
}

// ─── Title ───────────────────────────────────────────────────────────────────

export const ResponsiveDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogTitle ref={ref} className={className} {...props} />
  }

  return <SheetTitle ref={ref} className={className} {...props} />
})
ResponsiveDialogTitle.displayName = 'ResponsiveDialogTitle'

// ─── Description ─────────────────────────────────────────────────────────────

export const ResponsiveDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogDescription ref={ref} className={className} {...props} />
  }

  return <SheetDescription ref={ref} className={cn(className, 'mb-4')} {...props} />
})
ResponsiveDialogDescription.displayName = 'ResponsiveDialogDescription'

// ─── Footer ──────────────────────────────────────────────────────────────────

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogFooter className={className} {...props} />
  }

  return (
    <SheetFooter className={cn('flex flex-row justify-end gap-2 pt-4', className)} {...props} />
  )
}

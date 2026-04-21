import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Cloud,
  Database,
  FolderOpen,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  Plus,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'

import { leaveSpace, type SpaceItem } from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ListSpacesQuery } from '@/generated/graphql'
import { useAuth } from '@/stores/auth-store'

interface SpacesPageProps {
  loaderData?: ListSpacesQuery['spaces']
  currentOrganizationId?: string | null
}

export function SpacesPage({ loaderData, currentOrganizationId = null }: SpacesPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { authState } = useAuth()
  const [leaveSpaceItem, setLeaveSpaceItem] = useState<SpaceItem | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [openMenuSpaceKey, setOpenMenuSpaceKey] = useState<string | null>(null)
  const leaveDialogTimerRef = useRef<number | null>(null)

  const spaces = loaderData ?? []
  const hasSpaces = spaces.length > 0
  const ownedCount = useMemo(
    () =>
      currentOrganizationId === null
        ? spaces.length
        : spaces.filter((space) => space.orgId === currentOrganizationId).length,
    [currentOrganizationId, spaces],
  )
  const sharedCount = useMemo(
    () =>
      currentOrganizationId === null
        ? 0
        : spaces.filter((space) => space.orgId !== currentOrganizationId).length,
    [currentOrganizationId, spaces],
  )

  const handleLeaveSpace = async () => {
    if (!leaveSpaceItem) return

    setIsLeaving(true)
    try {
      await leaveSpace({ spaceKey: leaveSpaceItem.key })
      toast.success(t('pages.spaces.messages.leftSpaceSuccess'))
      setLeaveSpaceItem(null)
      await router.invalidate()
    } catch (err) {
      toast.error(
        `${t('pages.spaces.messages.leaveSpaceFailed')}: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setIsLeaving(false)
    }
  }

  const requestLeaveSpace = (space: SpaceItem) => {
    setOpenMenuSpaceKey(null)
    if (leaveDialogTimerRef.current !== null) {
      window.clearTimeout(leaveDialogTimerRef.current)
    }
    leaveDialogTimerRef.current = window.setTimeout(() => {
      setLeaveSpaceItem(space)
      leaveDialogTimerRef.current = null
    }, 0)
  }

  return (
    <div className='space-y-6'>
      {hasSpaces && (
        <div className='grid gap-3 sm:grid-cols-3'>
          <div className='bg-muted/30 rounded-xl p-4'>
            <p className='text-muted-foreground text-xs font-medium uppercase'>
              {t('pages.spaces.stats.totalSpaces')}
            </p>
            <p className='mt-2 text-2xl font-semibold'>{spaces.length}</p>
          </div>
          <div className='bg-muted/30 rounded-xl p-4'>
            <p className='text-muted-foreground text-xs font-medium uppercase'>
              {t('pages.spaces.stats.yourSpaces')}
            </p>
            <p className='mt-2 text-2xl font-semibold'>{ownedCount}</p>
          </div>
          <div className='bg-muted/30 rounded-xl p-4'>
            <p className='text-muted-foreground text-xs font-medium uppercase'>
              {t('pages.spaces.stats.sharedWithYou')}
            </p>
            <p className='mt-2 text-2xl font-semibold'>{sharedCount}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {!loaderData ? (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='space-y-4 rounded-xl border p-5'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-10 w-10 rounded-lg' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-3 w-20' />
                </div>
              </div>
              <div className='flex gap-2'>
                <Skeleton className='h-5 w-20 rounded-full' />
                <Skeleton className='h-5 w-16 rounded-full' />
              </div>
              <Skeleton className='h-9 w-full rounded-md' />
            </div>
          ))}
        </div>
      ) : spaces.length === 0 ? (
        /* Empty state */
        <div className='flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center'>
          <div className='bg-muted flex h-14 w-14 items-center justify-center rounded-full'>
            <LayoutGrid className='text-muted-foreground h-7 w-7' />
          </div>
          <h3 className='mt-4 text-base font-semibold'>{t('pages.spaces.noSpacesFound')}</h3>
          <p className='text-muted-foreground mt-1.5 max-w-xs text-sm'>
            {t('pages.spaces.emptyDescription')}
          </p>
          <p className='text-muted-foreground mt-2 max-w-sm text-sm'>
            {t('pages.spaces.startDescription')}
          </p>
          <Button asChild className='mt-6'>
            <Link to='/account/spaces/new'>
              <Plus className='mr-2 h-4 w-4' />
              {t('pages.spaces.createSpace')}
            </Link>
          </Button>
        </div>
      ) : (
        /* Card grid */
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {spaces.map((space) => {
            const canManageSpace = space.canManage
            const isSharedSpace = !canManageSpace
            return (
              <div
                key={space.key}
                className='group bg-card relative flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md'
              >
                {/* Card header row */}
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <div className='bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                    {space.storageMode === 'platform' ? (
                        <Cloud className='text-muted-foreground h-5 w-5' />
                      ) : (
                        <Database className='text-muted-foreground h-5 w-5' />
                      )}
                    </div>
                    <div className='min-w-0'>
                      <div className='flex min-w-0 items-center gap-2'>
                        <p className='truncate leading-tight font-semibold'>{space.name}</p>
                        {isSharedSpace && (
                          <Badge variant='outline' className='h-5 shrink-0 px-2 text-[11px]'>
                            {t('pages.spaces.sharedLabel')}
                          </Badge>
                        )}
                      </div>
                      <p className='text-muted-foreground truncate font-mono text-xs'>
                        {space.customDomain || `${space.key}.imagor.app`}
                      </p>
                    </div>
                  </div>

                  {/* Badge */}
                  <div className='mt-1 flex shrink-0 items-center gap-1'>
                    <Badge
                      variant={space.storageMode === 'byob' ? 'outline' : 'secondary'}
                      className={
                      space.storageMode === 'byob'
                          ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                          : ''
                      }
                    >
                      {t(`pages.spaces.storageType.${space.storageType}`)}
                    </Badge>
                  </div>
                </div>

                {/* Action buttons */}
                <div className='mt-4 flex gap-2'>
                  <Button variant='outline' size='sm' className='flex-1' asChild>
                    <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
                      <FolderOpen className='mr-1.5 h-4 w-4' />
                      {t('pages.spaces.openGallery')}
                    </Link>
                  </Button>
                  {canManageSpace && !space.canLeave ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-9 w-9 shrink-0'
                            asChild
                          >
                            <Link
                              to='/spaces/$spaceKey/settings/$section'
                              params={{ spaceKey: space.key, section: 'general' }}
                              aria-label={t('pages.spaces.configure')}
                            >
                              <Settings className='h-4 w-4' />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side='top'>{t('pages.spaces.configure')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                  {space.canLeave && authState.profile?.id ? (
                    <DropdownMenu
                      open={openMenuSpaceKey === space.key}
                      onOpenChange={(open) => setOpenMenuSpaceKey(open ? space.key : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='outline'
                          size='icon'
                          className='h-9 w-9 shrink-0'
                          aria-label={t('common.buttons.more')}
                        >
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {canManageSpace ? (
                          <DropdownMenuItem asChild>
                            <Link
                              to='/spaces/$spaceKey/settings/$section'
                              params={{ spaceKey: space.key, section: 'general' }}
                            >
                              <Settings className='mr-2 h-4 w-4' />
                              {t('pages.spaces.configure')}
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault()
                            requestLeaveSpace(space)
                          }}
                          className='text-destructive focus:text-destructive'
                        >
                          <LogOut className='mr-2 h-4 w-4' />
                          {t('pages.spaces.leaveSpace')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Space count footer */}
      {loaderData && spaces.length > 0 && (
        <p className='text-muted-foreground text-sm'>
          {t('pages.spaces.spaceCount', { count: spaces.length })}
        </p>
      )}

      <ResponsiveDialog
        open={leaveSpaceItem !== null}
        onOpenChange={(open) => !open && setLeaveSpaceItem(null)}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.leaveSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.leaveSpaceDescription')}{' '}
            <strong className='text-foreground'>{leaveSpaceItem?.key}</strong>?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setLeaveSpaceItem(null)}
            disabled={isLeaving}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            onClick={handleLeaveSpace}
            isLoading={isLeaving}
            className='w-full sm:w-auto'
          >
            {t('pages.spaces.leaveSpace')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </div>
  )
}

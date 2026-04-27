import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouter } from '@tanstack/react-router'
import { Cloud, Database, LayoutGrid, LogOut, MoreHorizontal, Plus, Settings } from 'lucide-react'
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
import type { ListSpacesQuery } from '@/generated/graphql'
import { getPlanEntitlements, isUnlimitedLimit } from '@/lib/plan-entitlements'
import { useAuth } from '@/stores/auth-store'

interface SpacesPageProps {
  loaderData?: ListSpacesQuery['spaces']
  currentOrganizationId?: string | null
  currentOrganizationPlan?: string | null
  currentOrganizationPlanStatus?: string | null
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  const digits = index === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[index]}`
}

export function SpacesPage({
  loaderData,
  currentOrganizationId = null,
  currentOrganizationPlan = null,
}: SpacesPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { authState } = useAuth()
  const [leaveSpaceItem, setLeaveSpaceItem] = useState<SpaceItem | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [openMenuSpaceKey, setOpenMenuSpaceKey] = useState<string | null>(null)
  const leaveDialogTimerRef = useRef<number | null>(null)

  const spaces = loaderData ?? []
  const hasSpaces = spaces.length > 0
  const organizationSpaces = useMemo(
    () =>
      currentOrganizationId === null
        ? spaces
        : spaces.filter((space) => space.orgId === currentOrganizationId),
    [currentOrganizationId, spaces],
  )
  const planEntitlements = useMemo(
    () => getPlanEntitlements(currentOrganizationPlan),
    [currentOrganizationPlan],
  )
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
  const hostedUsageBytes = useMemo(
    () =>
      organizationSpaces.reduce((total, space) => {
        if (space.storageMode !== 'platform' || space.storageUsageBytes == null) {
          return total
        }
        return total + space.storageUsageBytes
      }, 0),
    [organizationSpaces],
  )
  const createSpaceDisabled =
    planEntitlements.maxSpaces >= 0 && ownedCount >= planEntitlements.maxSpaces
  const spacesSummary = isUnlimitedLimit(planEntitlements.maxSpaces)
    ? t('pages.spaces.stats.unlimited')
    : `${ownedCount}/${planEntitlements.maxSpaces}`
  const storageLimitBytes =
    planEntitlements.storageLimitGB >= 0 ? planEntitlements.storageLimitGB * 1024 * 1024 * 1024 : -1
  const hostedStorageSummary = isUnlimitedLimit(planEntitlements.storageLimitGB)
    ? t('pages.spaces.stats.unlimited')
    : `${formatBytes(hostedUsageBytes)} / ${formatBytes(storageLimitBytes)}`

  const handleLeaveSpace = async () => {
    if (!leaveSpaceItem) return

    setIsLeaving(true)
    try {
      await leaveSpace({ spaceID: leaveSpaceItem.id })
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
        <div className='grid gap-3 sm:grid-cols-4'>
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
          <div className='bg-muted/30 rounded-xl p-4'>
            <p className='text-muted-foreground text-xs font-medium uppercase'>
              {t('pages.spaces.stats.spaceQuota')}
            </p>
            <p className='mt-2 text-2xl font-semibold'>{spacesSummary}</p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t(`pages.spaces.plan.${currentOrganizationPlan ?? 'free'}`)}
            </p>
          </div>
        </div>
      )}

      {currentOrganizationId !== null && (
        <div className='bg-muted/30 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1'>
            <p className='text-sm font-medium'>{t('pages.spaces.usageSummaryTitle')}</p>
            <p className='text-muted-foreground text-sm'>
              {t('pages.spaces.usageSummaryDescription', {
                spaces: spacesSummary,
                storage: hostedStorageSummary,
              })}
            </p>
            <p className='text-muted-foreground text-xs'>
              {t('pages.spaces.processingUsageComingSoon')}
            </p>
          </div>
          {createSpaceDisabled && (
            <Badge variant='outline' className='w-fit'>
              {t('pages.spaces.messages.spaceLimitReached')}
            </Badge>
          )}
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
          {createSpaceDisabled ? (
            <Button disabled className='mt-6' title={t('pages.spaces.messages.spaceLimitReached')}>
              <Plus className='mr-2 h-4 w-4' />
              {t('pages.spaces.createSpace')}
            </Button>
          ) : (
            <Button asChild className='mt-6'>
              <Link to='/account/spaces/new'>
                <Plus className='mr-2 h-4 w-4' />
                {t('pages.spaces.createSpace')}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        /* Card grid */
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {spaces.map((space) => {
            const canManageSpace = space.canManage
            const isSharedSpace = !canManageSpace
            const hostedUsageBytes =
              space.storageMode === 'platform' ? space.storageUsageBytes : null
            const storageBadgeLabel =
              hostedUsageBytes !== null
                ? t('pages.spaces.storageUsage', {
                    size: formatBytes(hostedUsageBytes),
                  })
                : t(`pages.spaces.storageType.${space.storageType}`)
            return (
              <div
                key={space.key}
                className='group bg-card hover:border-border hover:bg-accent/20 dark:hover:border-border/80 dark:hover:bg-accent/30 relative flex flex-col rounded-xl border p-5 transition-[background-color,border-color,box-shadow] hover:shadow-md'
              >
                <Link
                  to='/spaces/$spaceKey'
                  params={{ spaceKey: space.key }}
                  aria-label={`${t('pages.spaces.openGallery')}: ${space.name}`}
                  className='focus-visible:ring-ring absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
                />

                {/* Card header row */}
                <div className='flex items-center justify-between gap-2'>
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

                  <div className='pointer-events-none relative z-20 flex shrink-0 items-center gap-2 self-center'>
                    <Link
                      to='/spaces/$spaceKey'
                      params={{ spaceKey: space.key }}
                      aria-label={`${t('pages.spaces.openGallery')}: ${space.name}`}
                      className='pointer-events-auto'
                    >
                      <Badge
                        variant={space.storageMode === 'byob' ? 'outline' : 'secondary'}
                        className={
                          space.storageMode === 'byob'
                            ? 'cursor-pointer border-sky-500/15 bg-sky-500/6 text-sky-700 dark:border-sky-400/15 dark:bg-sky-400/8 dark:text-sky-300'
                            : 'cursor-pointer'
                        }
                      >
                        {storageBadgeLabel}
                      </Badge>
                    </Link>
                    {canManageSpace && !space.canLeave ? (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='pointer-events-auto h-10 w-10 shrink-0'
                        asChild
                      >
                        <Link
                          to='/spaces/$spaceKey/settings/$section'
                          params={{ spaceKey: space.key, section: 'general' }}
                          aria-label={t('pages.spaces.configure')}
                        >
                          <Settings className='h-5 w-5' />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>

                {space.canLeave && authState.profile?.id ? (
                  <div className='pointer-events-none relative z-20 mt-4 flex justify-end gap-2'>
                    <DropdownMenu
                      open={openMenuSpaceKey === space.key}
                      onOpenChange={(open) => setOpenMenuSpaceKey(open ? space.key : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='outline'
                          size='icon'
                          className='pointer-events-auto h-9 w-9 shrink-0'
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
                  </div>
                ) : null}
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

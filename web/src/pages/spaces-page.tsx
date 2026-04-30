import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouter } from '@tanstack/react-router'
import { Cloud, Database, LayoutGrid, LogOut, MoreHorizontal, Plus, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { createOrganization, leaveSpace, type SpaceItem } from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { GetUsageSummaryQuery, ListSpacesQuery } from '@/generated/graphql'
import { extractErrorMessage } from '@/lib/error-utils'
import { isUnlimitedLimit } from '@/lib/plan-entitlements'
import { useAuth } from '@/stores/auth-store'

interface SpacesPageProps {
  loaderData?: ListSpacesQuery['spaces']
  usageSummary?: GetUsageSummaryQuery['usageSummary'] | null
  currentOrganizationId?: string | null
  currentOrganizationPlan?: string | null
  currentOrganizationPlanStatus?: string | null
  canCreateSpace?: boolean
  canManageOrganization?: boolean
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  const digits = index === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[index]}`
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatUsagePeriodDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function getProgressValue(current: number, max: number | null | undefined) {
  if (max == null || max <= 0) return 0
  return Math.min((current / max) * 100, 100)
}

function isUnlimitedOrMissing(value: number | null | undefined) {
  return value != null && isUnlimitedLimit(value)
}

export function SpacesPage({
  loaderData,
  usageSummary = null,
  currentOrganizationId = null,
  currentOrganizationPlan = null,
  canCreateSpace = false,
  canManageOrganization = false,
}: SpacesPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { authState, refreshAuthSession } = useAuth()
  const [leaveSpaceItem, setLeaveSpaceItem] = useState<SpaceItem | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
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
  const usedSpaces = usageSummary?.usedSpaces ?? ownedCount
  const maxSpaces = usageSummary?.maxSpaces ?? null
  const spacesOverLimit = maxSpaces !== null && usedSpaces > maxSpaces
  const createSpaceDisabled = maxSpaces !== null && usedSpaces >= maxSpaces
  const spacesSummary = isUnlimitedOrMissing(maxSpaces)
    ? t('pages.spaces.stats.unlimited')
    : `${usedSpaces}/${maxSpaces}`
  const usedHostedStorageBytes = usageSummary?.usedHostedStorageBytes ?? hostedUsageBytes
  const storageLimitGB = usageSummary?.storageLimitGB ?? null
  const storageLimitBytes = storageLimitGB !== null ? storageLimitGB * 1024 * 1024 * 1024 : null
  const hostedStorageSummary = isUnlimitedOrMissing(storageLimitGB)
    ? t('pages.spaces.stats.unlimited')
    : `${formatBytes(usedHostedStorageBytes ?? 0)} / ${formatBytes(storageLimitBytes ?? 0)}`
  const usedTransforms = usageSummary?.usedTransforms ?? null
  const transformsLimit = usageSummary?.transformsLimit ?? null
  const processingSummary = isUnlimitedOrMissing(transformsLimit)
    ? t('pages.spaces.stats.unlimited')
    : `${formatCount(usedTransforms ?? 0)} / ${formatCount(transformsLimit ?? 0)}`
  const usagePeriod =
    usageSummary?.periodStart && usageSummary?.periodEnd
      ? t('pages.spaces.currentBillingPeriod', {
          start: formatUsagePeriodDate(usageSummary.periodStart),
          end: formatUsagePeriodDate(usageSummary.periodEnd),
        })
      : null
  const usageMeta = hasSpaces
    ? t('pages.spaces.usageSummaryMeta', {
        owned: ownedCount,
        shared: sharedCount,
      })
    : null
  const usageSummaryCardClassName = canManageOrganization
    ? 'bg-muted/30 hover:bg-muted/50 focus-visible:ring-ring block rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
    : 'bg-muted/30 rounded-lg border p-4'
  const needsOrganizationRecovery = currentOrganizationId === null && !canCreateSpace

  const handleLeaveSpace = async () => {
    if (!leaveSpaceItem) return

    setIsLeaving(true)
    try {
      await leaveSpace({ spaceID: leaveSpaceItem.id })
      toast.success(t('pages.spaces.messages.leftSpaceSuccess'))
      setLeaveSpaceItem(null)
      await router.invalidate()
    } catch (err) {
      toast.error(`${t('pages.spaces.messages.leaveSpaceFailed')}: ${extractErrorMessage(err)}`)
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

  const handleCreateOrganization = async () => {
    setIsCreatingOrganization(true)
    try {
      await createOrganization()
      await refreshAuthSession()
      await router.invalidate()
      toast.success(t('pages.workspaceRequired.actions.createSuccess'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.status.error')
      toast.error(`${t('pages.workspaceRequired.actions.createError')}: ${message}`)
    } finally {
      setIsCreatingOrganization(false)
    }
  }

  return (
    <div className='space-y-6'>
      {needsOrganizationRecovery && hasSpaces ? (
        <div className='bg-muted/30 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1'>
            <h2 className='text-sm font-semibold'>{t('pages.spaces.noOrganizationBannerTitle')}</h2>
            <p className='text-muted-foreground text-sm'>
              {t('pages.spaces.noOrganizationBannerDescription')}
            </p>
          </div>
          <ButtonWithLoading
            className='shrink-0'
            isLoading={isCreatingOrganization}
            onClick={handleCreateOrganization}
          >
            <span className='flex items-center justify-center gap-2'>
              <Plus className='h-4 w-4 shrink-0' />
              <span className='whitespace-nowrap'>
                {t('pages.workspaceRequired.actions.createOrganization')}
              </span>
            </span>
          </ButtonWithLoading>
        </div>
      ) : null}

      {currentOrganizationId !== null &&
        (canManageOrganization ? (
          <Link to='/account/organization/billing' className={usageSummaryCardClassName}>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='text-sm font-medium'>{t('pages.spaces.usageSummaryTitle')}</p>
                  <Badge variant='secondary'>
                    {t(`pages.spaces.plan.${currentOrganizationPlan ?? 'free'}`)}
                  </Badge>
                </div>
                {(usageMeta || usagePeriod) && (
                  <p className='text-muted-foreground text-xs'>
                    {usageMeta}
                    {usageMeta && usagePeriod ? ' · ' : ''}
                    {usagePeriod}
                  </p>
                )}
              </div>
              {createSpaceDisabled && (
                <Badge
                  variant='outline'
                  className='w-fit border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                >
                  {spacesOverLimit
                    ? t('pages.spaces.messages.overPlanLimit')
                    : t('pages.spaces.messages.spaceLimitReached')}
                </Badge>
              )}
            </div>

            <div className='mt-4 grid gap-4 sm:grid-cols-3'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='font-medium'>{t('pages.spaces.usage.spaces')}</span>
                  <div className='flex items-center gap-2'>
                    {spacesOverLimit && (
                      <Badge
                        variant='outline'
                        className='border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                      >
                        {t('pages.spaces.usage.overLimit')}
                      </Badge>
                    )}
                    <span
                      className={
                        spacesOverLimit
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-muted-foreground'
                      }
                    >
                      {spacesSummary}
                    </span>
                  </div>
                </div>
                <Progress
                  value={getProgressValue(usedSpaces, maxSpaces)}
                  className={spacesOverLimit ? 'bg-amber-500/15 dark:bg-amber-400/15' : undefined}
                  indicatorClassName={
                    spacesOverLimit ? 'bg-amber-500 dark:bg-amber-400' : undefined
                  }
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='font-medium'>{t('pages.spaces.usage.hostedStorage')}</span>
                  <span className='text-muted-foreground'>{hostedStorageSummary}</span>
                </div>
                <Progress
                  value={getProgressValue(usedHostedStorageBytes ?? 0, storageLimitBytes)}
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='font-medium'>{t('pages.spaces.usage.processing')}</span>
                  <span className='text-muted-foreground'>{processingSummary}</span>
                </div>
                <Progress value={getProgressValue(usedTransforms ?? 0, transformsLimit)} />
              </div>
            </div>
          </Link>
        ) : (
          <div className={usageSummaryCardClassName}>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='text-sm font-medium'>{t('pages.spaces.usageSummaryTitle')}</p>
                  <Badge variant='secondary'>
                    {t(`pages.spaces.plan.${currentOrganizationPlan ?? 'free'}`)}
                  </Badge>
                </div>
                {(usageMeta || usagePeriod) && (
                  <p className='text-muted-foreground text-xs'>
                    {usageMeta}
                    {usageMeta && usagePeriod ? ' · ' : ''}
                    {usagePeriod}
                  </p>
                )}
              </div>
              {createSpaceDisabled && (
                <Badge
                  variant='outline'
                  className='w-fit border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                >
                  {spacesOverLimit
                    ? t('pages.spaces.messages.overPlanLimit')
                    : t('pages.spaces.messages.spaceLimitReached')}
                </Badge>
              )}
            </div>

            <div className='mt-4 grid gap-4 sm:grid-cols-3'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='font-medium'>{t('pages.spaces.usage.spaces')}</span>
                  <div className='flex items-center gap-2'>
                    {spacesOverLimit && (
                      <Badge
                        variant='outline'
                        className='border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                      >
                        {t('pages.spaces.usage.overLimit')}
                      </Badge>
                    )}
                    <span
                      className={
                        spacesOverLimit
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-muted-foreground'
                      }
                    >
                      {spacesSummary}
                    </span>
                  </div>
                </div>
                <Progress
                  value={getProgressValue(usedSpaces, maxSpaces)}
                  className={spacesOverLimit ? 'bg-amber-500/15 dark:bg-amber-400/15' : undefined}
                  indicatorClassName={
                    spacesOverLimit ? 'bg-amber-500 dark:bg-amber-400' : undefined
                  }
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='font-medium'>{t('pages.spaces.usage.hostedStorage')}</span>
                  <span className='text-muted-foreground'>{hostedStorageSummary}</span>
                </div>
                <Progress
                  value={getProgressValue(usedHostedStorageBytes ?? 0, storageLimitBytes)}
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='font-medium'>{t('pages.spaces.usage.processing')}</span>
                  <span className='text-muted-foreground'>{processingSummary}</span>
                </div>
                <Progress value={getProgressValue(usedTransforms ?? 0, transformsLimit)} />
              </div>
            </div>
          </div>
        ))}

      {/* Loading skeleton */}
      {!loaderData ? (
        <div className='grid grid-cols-1 gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='space-y-4 rounded-lg border p-5'>
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
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center'>
          <div className='bg-muted flex h-14 w-14 items-center justify-center rounded-full'>
            <LayoutGrid className='text-muted-foreground h-7 w-7' />
          </div>
          <h3 className='mt-4 text-base font-semibold'>
            {t(
              canCreateSpace
                ? 'pages.spaces.noSpacesFound'
                : needsOrganizationRecovery
                  ? 'pages.spaces.noOrganizationTitle'
                  : 'pages.spaces.noSpacesAvailable',
            )}
          </h3>
          <p className='text-muted-foreground mt-1.5 max-w-xs text-sm'>
            {t(
              canCreateSpace
                ? 'pages.spaces.emptyDescription'
                : needsOrganizationRecovery
                  ? 'pages.spaces.emptyDescriptionNoOrganization'
                  : 'pages.spaces.emptyDescriptionMember',
            )}
          </p>
          <p className='text-muted-foreground mt-2 max-w-lg text-sm'>
            {t(
              canCreateSpace
                ? 'pages.spaces.startDescription'
                : needsOrganizationRecovery
                  ? 'pages.spaces.startDescriptionNoOrganization'
                  : 'pages.spaces.startDescriptionMember',
            )}
          </p>
          {needsOrganizationRecovery ? (
            <ButtonWithLoading
              className='mt-6'
              isLoading={isCreatingOrganization}
              onClick={handleCreateOrganization}
            >
              <span className='flex items-center justify-center gap-2'>
                <Plus className='h-4 w-4 shrink-0 self-start' />
                <span className='whitespace-nowrap'>
                  {t('pages.workspaceRequired.actions.createOrganization')}
                </span>
              </span>
            </ButtonWithLoading>
          ) : canCreateSpace && createSpaceDisabled ? (
            <Button disabled className='mt-6' title={t('pages.spaces.messages.spaceLimitReached')}>
              <Plus className='mr-2 h-4 w-4' />
              {t('pages.spaces.createSpace')}
            </Button>
          ) : canCreateSpace ? (
            <Button asChild className='mt-6'>
              <Link to='/account/spaces/new'>
                <Plus className='mr-2 h-4 w-4' />
                {t('pages.spaces.createSpace')}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        /* Space list */
        <div className='grid grid-cols-1 gap-4'>
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
            const processingUsageLabel =
              space.processingUsageCount !== null
                ? t('pages.spaces.processingUsage', {
                    count: space.processingUsageCount,
                  })
                : null
            return (
              <div
                key={space.key}
                className='group bg-card hover:border-border hover:bg-accent/20 dark:hover:border-border/80 dark:hover:bg-accent/30 relative flex flex-col rounded-lg border p-5 transition-[background-color,border-color,box-shadow] hover:shadow-md'
              >
                <Link
                  to='/spaces/$spaceKey'
                  params={{ spaceKey: space.key }}
                  aria-label={`${t('pages.spaces.openGallery')}: ${space.name}`}
                  className='focus-visible:ring-ring absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
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
                    {processingUsageLabel && (
                      <Badge variant='outline' className='pointer-events-auto'>
                        {processingUsageLabel}
                      </Badge>
                    )}
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
                    {space.canLeave && authState.profile?.id ? (
                      <DropdownMenu
                        open={openMenuSpaceKey === space.key}
                        onOpenChange={(open) => setOpenMenuSpaceKey(open ? space.key : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='pointer-events-auto h-10 w-10 shrink-0'
                            aria-label={t('common.buttons.more')}
                          >
                            <MoreHorizontal className='h-5 w-5' />
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
              </div>
            )
          })}
        </div>
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

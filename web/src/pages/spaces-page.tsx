import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Cloud,
  Database,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { deleteSpace, type SpaceItem } from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

interface SpacesPageProps {
  loaderData?: ListSpacesQuery['spaces']
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const

function avatarColor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function spaceInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function SpacesPage({ loaderData }: SpacesPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<SpaceItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const spaces = loaderData ?? []
  const hasSpaces = spaces.length > 0
  const managedCount = useMemo(
    () => spaces.filter((space) => space.storageType === 'managed').length,
    [spaces],
  )
  const s3Count = spaces.length - managedCount

  const handleDeleteSpace = async () => {
    if (!selectedSpace) return
    setIsDeleting(true)
    try {
      await deleteSpace({ key: selectedSpace.key })
      toast.success(t('pages.spaces.messages.spaceDeletedSuccess'))
      setIsDeleteOpen(false)
      setSelectedSpace(null)
      await router.invalidate()
    } catch (err) {
      toast.error(
        `${t('pages.spaces.messages.deleteSpaceFailed')}: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='space-y-6'>
      {hasSpaces && (
        <div className='grid gap-3 sm:grid-cols-3'>
          <div className='bg-muted/30 rounded-xl p-4'>
            <p className='text-muted-foreground text-xs font-medium uppercase'>Total spaces</p>
            <p className='mt-2 text-2xl font-semibold'>{spaces.length}</p>
          </div>
          <div className='bg-muted/30 rounded-xl p-4'>
            <p className='text-muted-foreground text-xs font-medium uppercase'>Managed storage</p>
            <p className='mt-2 text-2xl font-semibold'>{managedCount}</p>
          </div>
          <div className='bg-muted/30 rounded-xl p-4'>
            <p className='text-muted-foreground text-xs font-medium uppercase'>External storage</p>
            <p className='mt-2 text-2xl font-semibold'>{s3Count}</p>
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
              Start with a managed space for the fastest setup, then customize storage, delivery,
              and branding as your workspace grows.
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
            const color = avatarColor(space.key)
            const initials = spaceInitials(space.name)
            return (
              <div
                key={space.key}
                className='group bg-card relative flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md'
              >
                {/* Card header row */}
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${color}`}
                    >
                      {initials}
                    </div>
                    <div className='min-w-0'>
                      <p className='truncate leading-tight font-semibold'>{space.name}</p>
                      <p className='text-muted-foreground truncate font-mono text-xs'>
                        {space.key}
                      </p>
                    </div>
                  </div>

                  {/* Kebab menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100'
                        aria-label='Space actions'
                      >
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem asChild>
                        <Link to='/spaces/$spaceKey/settings' params={{ spaceKey: space.key }}>
                          <Settings className='mr-2 h-4 w-4' />
                          {t('pages.spaces.settings')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        onClick={() => {
                          setSelectedSpace(space)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        {t('pages.spaces.deleteSpace')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges */}
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Badge
                    variant={space.storageType === 's3' ? 'outline' : 'secondary'}
                    className={
                      space.storageType === 's3'
                        ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                        : ''
                    }
                  >
                    {space.storageType === 's3' ? (
                      <Database className='mr-1 h-3 w-3' />
                    ) : (
                      <Cloud className='mr-1 h-3 w-3' />
                    )}
                    {t(`pages.spaces.storageType.${space.storageType}`)}
                  </Badge>
                </div>

                {/* Action buttons */}
                <div className='mt-4 flex gap-2'>
                  <Button variant='outline' size='sm' className='flex-1' asChild>
                    <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
                      <FolderOpen className='mr-1.5 h-4 w-4' />
                      {t('pages.spaces.openGallery')}
                    </Link>
                  </Button>
                  <Button variant='outline' size='sm' className='flex-1' asChild>
                    <Link to='/spaces/$spaceKey/settings/$section' params={{ spaceKey: space.key, section: 'general' }}>
                      <Settings className='mr-1.5 h-4 w-4' />
                      Configure
                    </Link>
                  </Button>
                  <Button variant='outline' size='sm' asChild title={t('pages.spaces.settings')}>
                    <Link to='/spaces/$spaceKey/settings' params={{ spaceKey: space.key }}>
                      <Settings className='h-4 w-4' />
                    </Link>
                  </Button>
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

      {/* Delete confirmation dialog */}
      <ResponsiveDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.deleteSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.deleteSpaceDescription')}{' '}
            <strong className='text-foreground'>{selectedSpace?.key}</strong>?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setIsDeleteOpen(false)}
            disabled={isDeleting}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            onClick={handleDeleteSpace}
            isLoading={isDeleting}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.delete')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </div>
  )
}

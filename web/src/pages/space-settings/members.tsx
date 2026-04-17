import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock3 } from 'lucide-react'
import { toast } from 'sonner'

import {
  inviteSpaceMember,
  listSpaceInvitations,
  listSpaceMembers,
  removeSpaceMember,
  type SpaceInvitationItem,
  type SpaceInviteResultItem,
  type SpaceMemberItem,
} from '@/api/org-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { extractErrorMessage } from '@/lib/error-utils'
import { useAuth } from '@/stores/auth-store'

function getMemberLabel(member: Pick<SpaceMemberItem, 'displayName' | 'username'>) {
  return member.displayName || member.username
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

interface MembersSectionProps {
  spaceKey: string
  initialMembers: SpaceMemberItem[]
  initialInvitations: SpaceInvitationItem[]
  isShared: boolean
}

export function MembersSection({
  spaceKey,
  initialMembers,
  initialInvitations,
  isShared,
}: MembersSectionProps) {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const [members, setMembers] = useState<SpaceMemberItem[]>(initialMembers)
  const [invitations, setInvitations] = useState<SpaceInvitationItem[]>(initialInvitations)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const currentUserId = authState.profile?.id ?? null
  const pendingMember = members.find((member) => member.userId === pendingRemoveId)
  const sectionTitle = t('pages.spaceSettings.sections.members')

  const reload = async () => {
    setIsLoading(true)
    try {
      const [spaceMembers, pendingInvitations] = await Promise.all([
        listSpaceMembers(spaceKey),
        listSpaceInvitations(spaceKey),
      ])
      setMembers(spaceMembers)
      setInvitations(pendingInvitations)
    } catch {
      // ignore refresh failures in the settings view
    } finally {
      setIsLoading(false)
    }
  }

  const mapInviteError = (message: string) => {
    const normalized = message.toLowerCase()

    if (normalized.includes('email is required')) {
      return {
        kind: 'field' as const,
        message: t('pages.spaceSettings.members.inviteErrors.required'),
      }
    }

    if (normalized.includes('already has access')) {
      return {
        kind: 'field' as const,
        message: t('pages.spaceSettings.members.inviteErrors.alreadyHasAccess'),
      }
    }

    if (normalized.includes('email invitations are not configured')) {
      return {
        kind: 'toast' as const,
        message: t('pages.spaceSettings.members.inviteErrors.notConfigured'),
      }
    }

    if (normalized.includes('space member management is not available')) {
      return {
        kind: 'toast' as const,
        message: t('pages.spaceSettings.members.inviteErrors.unavailable'),
      }
    }

    return {
      kind: 'toast' as const,
      message: t('pages.spaceSettings.members.inviteErrors.default'),
    }
  }

  const shareWithEmail = async (email: string) => {
    const result: SpaceInviteResultItem = await inviteSpaceMember({
      spaceKey,
      email,
      role: 'member',
    })

    if (result.status === 'added') {
      toast.success(t('pages.spaceSettings.members.addSuccess'))
    } else {
      toast.success(t('pages.spaceSettings.members.inviteSent'))
    }

    setInviteEmail('')
    setInviteFieldError(null)
    await reload()
  }

  const handleInvite = async () => {
    const normalizedEmail = inviteEmail.trim()
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)

    setInviteFieldError(null)

    if (!normalizedEmail) {
      setInviteFieldError(t('pages.spaceSettings.members.inviteErrors.required'))
      return
    }

    if (!isValidEmail) {
      setInviteFieldError(t('pages.spaceSettings.members.inviteErrors.invalidEmail'))
      return
    }

    setIsInviting(true)
    try {
      await shareWithEmail(normalizedEmail)
    } catch (err) {
      const mappedError = mapInviteError(extractErrorMessage(err))
      if (mappedError.kind === 'field') {
        setInviteFieldError(mappedError.message)
      } else {
        toast.error(mappedError.message)
      }
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async () => {
    if (!pendingRemoveId) return

    if (pendingRemoveId === currentUserId) {
      toast.error(t('pages.spaceSettings.members.removeSelfNotAllowed'))
      return
    }

    setIsRemoving(true)
    try {
      await removeSpaceMember({ spaceKey, userId: pendingRemoveId })
      toast.success(t('pages.spaceSettings.members.removeSuccess'))
      setPendingRemoveId(null)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRemoving(false)
    }
  }

  const invitationsContent =
    invitations.length === 0 ? null : (
      <div className='overflow-hidden rounded-lg border'>
        <div className='bg-muted/50 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_160px] gap-4 border-b px-4 py-3 text-xs font-medium md:grid'>
          <div>{t('pages.spaceSettings.members.listHeaders.member')}</div>
          <div>{t('pages.spaceSettings.members.listHeaders.status')}</div>
        </div>
        <div className='divide-y'>
          {invitations.map((invitation) => (
            <>
              <div
                key={`${invitation.id}-desktop`}
                className='hidden grid-cols-[minmax(0,1fr)_160px] items-center gap-4 px-4 py-4 md:grid'
              >
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{invitation.email}</p>
                  <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                    <Clock3 className='h-3.5 w-3.5' />
                    <span>{new Date(invitation.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div>
                  <Badge variant='outline' className='justify-center px-3 py-1'>
                    {t('pages.spaceSettings.members.pendingAccessLabel')}
                  </Badge>
                </div>
              </div>
              <div key={`${invitation.id}-mobile`} className='space-y-3 px-4 py-4 md:hidden'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{invitation.email}</p>
                  <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                    <Clock3 className='h-3.5 w-3.5' />
                    <span>{new Date(invitation.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant='outline' className='w-fit px-3 py-1'>
                  {t('pages.spaceSettings.members.pendingAccessLabel')}
                </Badge>
              </div>
            </>
          ))}
        </div>
      </div>
    )

  const membersContent = isLoading ? (
    <Card>
      <CardContent className='p-4'>
        <p className='text-muted-foreground text-sm'>{t('common.status.loading')}</p>
      </CardContent>
    </Card>
  ) : members.length === 0 ? (
    <Card className='border-dashed'>
      <CardContent className='p-6 text-center'>
        <p className='font-medium'>{t('pages.spaceSettings.members.empty')}</p>
        <p className='text-muted-foreground mt-1 text-sm'>
          {t('pages.spaceSettings.members.emptyDescription')}
        </p>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className='p-0'>
        <div className='bg-muted/50 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_160px_104px] gap-4 border-b px-4 py-3 text-xs font-medium md:grid'>
          <div>{t('pages.spaceSettings.members.listHeaders.member')}</div>
          <div>{t('pages.spaceSettings.members.listHeaders.status')}</div>
          <div>{t('pages.spaceSettings.members.listHeaders.action')}</div>
        </div>
        <div className='divide-y'>
          {members.map((member) => {
            const memberLabel = getMemberLabel(member)
            const isCurrentUser = member.userId === currentUserId

            return (
              <>
                <div
                  key={`${member.userId}-desktop`}
                  className='hidden grid-cols-[minmax(0,1fr)_160px_104px] items-center gap-4 px-4 py-4 md:grid'
                >
                  <div className='flex min-w-0 items-center gap-3'>
                    <Avatar className='h-10 w-10'>
                      <AvatarImage src={member.avatarUrl ?? undefined} alt={memberLabel} />
                      <AvatarFallback className='text-sm font-semibold'>
                        {getInitials(memberLabel)}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>{memberLabel}</p>
                      <p className='text-muted-foreground truncate text-xs'>
                        {member.email || `@${member.username}`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge variant='secondary' className='justify-center px-3 py-1'>
                      {t('pages.spaceSettings.members.directAccessLabel')}
                    </Badge>
                  </div>
                  <div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-destructive hover:text-destructive h-9 w-[104px] justify-center px-3'
                      disabled={isCurrentUser}
                      onClick={() => setPendingRemoveId(member.userId)}
                    >
                      {isCurrentUser
                        ? t('pages.spaceSettings.members.removeSelfDisabled')
                        : t('common.buttons.remove')}
                    </Button>
                  </div>
                </div>
                <div key={`${member.userId}-mobile`} className='space-y-3 px-4 py-4 md:hidden'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <Avatar className='h-10 w-10'>
                      <AvatarImage src={member.avatarUrl ?? undefined} alt={memberLabel} />
                      <AvatarFallback className='text-sm font-semibold'>
                        {getInitials(memberLabel)}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>{memberLabel}</p>
                      <p className='text-muted-foreground truncate text-xs'>
                        {member.email || `@${member.username}`}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <Badge variant='secondary' className='px-3 py-1'>
                      {t('pages.spaceSettings.members.directAccessLabel')}
                    </Badge>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-destructive hover:text-destructive h-9 px-3'
                      disabled={isCurrentUser}
                      onClick={() => setPendingRemoveId(member.userId)}
                    >
                      {isCurrentUser
                        ? t('pages.spaceSettings.members.removeSelfDisabled')
                        : t('common.buttons.remove')}
                    </Button>
                  </div>
                </div>
              </>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      <div className='space-y-5'>
        {isShared ? (
          <div className='text-muted-foreground rounded-lg border px-4 py-3 text-sm leading-6'>
            <span className='text-foreground font-medium'>
              {t('pages.spaceSettings.members.sharedTitle')}:
            </span>
            {t('pages.spaceSettings.members.sharedDescription')}
          </div>
        ) : null}

        <div className='space-y-2'>
          <div className='flex flex-col gap-2 lg:flex-row'>
            <Input
              value={inviteEmail}
              onChange={(event) => {
                setInviteEmail(event.target.value)
                if (inviteFieldError) {
                  setInviteFieldError(null)
                }
              }}
              placeholder={t('pages.spaceSettings.members.emailPlaceholder')}
              disabled={isInviting}
              className='h-10 min-w-0 flex-1'
              type='email'
              aria-invalid={inviteFieldError ? 'true' : 'false'}
            />
            <ButtonWithLoading
              onClick={handleInvite}
              isLoading={isInviting}
              disabled={!inviteEmail.trim()}
              className='h-10 w-full lg:w-auto'
            >
              {t('pages.spaceSettings.members.sendInviteButton')}
            </ButtonWithLoading>
          </div>
          {inviteFieldError ? <p className='text-destructive text-sm'>{inviteFieldError}</p> : null}
        </div>

        <div className='space-y-2'>
          <h3 className='text-base font-semibold'>
            {sectionTitle} ({members.length})
          </h3>
          {membersContent}
        </div>

        {invitationsContent ? (
          <div className='space-y-2'>
            <h3 className='text-base font-semibold'>
              {t('pages.spaceSettings.members.pendingTitle')} ({invitations.length})
            </h3>
            {invitationsContent}
          </div>
        ) : null}
      </div>

      <ResponsiveDialog
        open={pendingRemoveId !== null}
        onOpenChange={(open) => !open && setPendingRemoveId(null)}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('pages.spaceSettings.members.removeTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaceSettings.members.removeDescription')}{' '}
            <strong className='text-foreground'>
              {pendingMember?.displayName || pendingMember?.username}
            </strong>
            ?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setPendingRemoveId(null)}
            disabled={isRemoving}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            onClick={handleRemove}
            isLoading={isRemoving}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.remove')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </>
  )
}

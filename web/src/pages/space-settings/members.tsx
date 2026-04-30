import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Clock3, MoreHorizontal, UserRound, UserX } from 'lucide-react'
import { toast } from 'sonner'

import {
  inviteSpaceMember,
  leaveSpace,
  listSpaceInvitations,
  listSpaceMembers,
  removeSpaceMember,
  updateSpaceMemberRole,
  type SpaceInvitationItem,
  type SpaceInviteResultItem,
  type SpaceMemberItem,
} from '@/api/org-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { isValidEmail, normalizeEmail } from '@/lib/email'
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

function getRoleBadgeLabel(
  member: Pick<SpaceMemberItem, 'role' | 'roleSource'>,
  t: (key: string) => string,
) {
  if (member.roleSource === 'organization') {
    if (member.role === 'owner') return t('pages.spaceSettings.members.roles.owner')
    if (member.role === 'admin') return t('pages.spaceSettings.members.roles.admin')
  }

  if (member.role === 'admin') return t('pages.spaceSettings.members.roles.spaceManager')
  return t('pages.spaceSettings.members.roles.member')
}

interface MembersSectionProps {
  spaceID: string
  initialMembers: SpaceMemberItem[]
  initialInvitations: SpaceInvitationItem[]
  canLeave?: boolean
}

export function MembersSection({
  spaceID,
  initialMembers,
  initialInvitations,
  canLeave = false,
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
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null)
  const [openMenuMemberId, setOpenMenuMemberId] = useState<string | null>(null)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const removeDialogTimerRef = useRef<number | null>(null)

  const currentUserId = authState.profile?.id ?? null
  const pendingMember = members.find((member) => member.userId === pendingRemoveId)
  const organizationMembers = members.filter((member) => member.roleSource === 'organization')
  const directMembers = members.filter((member) => member.roleSource !== 'organization')

  const reload = async () => {
    setIsLoading(true)
    try {
      const [spaceMembers, pendingInvitations] = await Promise.all([
        listSpaceMembers(spaceID),
        listSpaceInvitations(spaceID),
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
      spaceID,
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

    setInviteFieldError(null)

    if (!normalizedEmail) {
      setInviteFieldError(t('pages.spaceSettings.members.inviteErrors.required'))
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setInviteFieldError(t('pages.spaceSettings.members.inviteErrors.invalidEmail'))
      return
    }

    setIsInviting(true)
    try {
      await shareWithEmail(normalizeEmail(normalizedEmail))
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
      await removeSpaceMember({ spaceID, userId: pendingRemoveId })
      toast.success(t('pages.spaceSettings.members.removeSuccess'))
      setPendingRemoveId(null)
      await reload()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsRemoving(false)
    }
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    setOpenMenuMemberId(null)
    setUpdatingRoleUserId(userId)
    try {
      await updateSpaceMemberRole({ spaceID, userId, role })
      toast.success(t('pages.spaceSettings.members.roleUpdated'))
      await reload()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setUpdatingRoleUserId(null)
    }
  }

  const canLeaveSpace = Boolean(authState.profile?.id && canLeave)

  const handleLeaveSpace = async () => {
    setIsLeaving(true)
    try {
      await leaveSpace({ spaceID })
      toast.success(t('pages.spaces.messages.leaveSpaceSuccess'))
      window.location.href = '/spaces'
    } catch (err) {
      toast.error(
        `${t('pages.spaces.messages.leaveSpaceFailed')}: ${extractErrorMessage(err)}`,
      )
    } finally {
      setIsLeaving(false)
      setLeaveDialogOpen(false)
    }
  }

  const requestRemoveMember = (menuId: string, userId: string) => {
    setOpenMenuMemberId((current) => (current === menuId ? null : current))
    if (removeDialogTimerRef.current !== null) {
      window.clearTimeout(removeDialogTimerRef.current)
    }
    removeDialogTimerRef.current = window.setTimeout(() => {
      setPendingRemoveId(userId)
      removeDialogTimerRef.current = null
    }, 0)
  }

  const renderMemberActions = (member: SpaceMemberItem, menuId: string) => {
    const isCurrentUser = member.userId === currentUserId
    const canShowRoleSection = member.canChangeRole
    const canShowRemove = member.canRemove
    const canShowLeave = isCurrentUser && canLeaveSpace

    return (
      <DropdownMenuContent align='end'>
        {canShowRoleSection ? (
          <>
            <DropdownMenuLabel className='text-muted-foreground px-2 py-1.5 text-xs font-normal'>
              {t('pages.spaceSettings.members.roleSectionLabel')}
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={updatingRoleUserId === member.userId || member.role === 'admin'}
              onClick={() => handleRoleChange(member.userId, 'admin')}
            >
              {member.role === 'admin' ? (
                <Check className='text-muted-foreground mr-3 h-4 w-4' />
              ) : (
                <span className='mr-3 h-4 w-4' />
              )}
              <span>{t('pages.spaceSettings.members.roles.spaceManager')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={updatingRoleUserId === member.userId || member.role === 'member'}
              onClick={() => handleRoleChange(member.userId, 'member')}
            >
              {member.role === 'member' ? (
                <Check className='text-muted-foreground mr-3 h-4 w-4' />
              ) : (
                <span className='mr-3 h-4 w-4' />
              )}
              <span>{t('pages.spaceSettings.members.roles.member')}</span>
            </DropdownMenuItem>
          </>
        ) : null}
        {(canShowRoleSection && canShowRemove) || (canShowRoleSection && canShowLeave) ? (
          <DropdownMenuSeparator />
        ) : null}
        {canShowRemove ? (
          <DropdownMenuItem
            disabled={updatingRoleUserId === member.userId}
            className='text-destructive focus:text-destructive'
            onClick={() => requestRemoveMember(menuId, member.userId)}
          >
            <UserX className='mr-2 h-4 w-4' />
            <span>{t('common.buttons.remove')}</span>
          </DropdownMenuItem>
        ) : null}
        {canShowLeave ? (
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setLeaveDialogOpen(true)}
          >
            <UserX className='mr-2 h-4 w-4' />
            <span>{t('pages.spaces.leaveSpace')}</span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    )
  }

  const hasMemberActions = (member: SpaceMemberItem) => {
    const isCurrentUser = member.userId === currentUserId
    return member.canChangeRole || member.canRemove || (isCurrentUser && canLeaveSpace)
  }

  const invitationsContent =
    invitations.length === 0 ? null : (
      <div className='overflow-hidden rounded-lg border'>
        <div className='divide-y'>
          {invitations.map((invitation) => (
            <div key={invitation.id}>
              <div className='hidden px-4 py-4 md:block'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{invitation.email}</p>
                  <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                    <Badge variant='outline' className='h-5 px-2 text-[11px] font-medium'>
                      {t(`pages.spaceSettings.members.roles.${invitation.role}`)}
                    </Badge>
                    <Clock3 className='h-3.5 w-3.5' />
                    <span>{new Date(invitation.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className='space-y-3 px-4 py-4 md:hidden'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{invitation.email}</p>
                  <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                    <Badge variant='outline' className='h-5 px-2 text-[11px] font-medium'>
                      {t(`pages.spaceSettings.members.roles.${invitation.role}`)}
                    </Badge>
                    <Clock3 className='h-3.5 w-3.5' />
                    <span>{new Date(invitation.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )

  const renderMembersList = (
    sectionMembers: SpaceMemberItem[],
    options?: { emptyState?: React.ReactNode; showActions?: boolean },
  ) =>
    isLoading ? (
      <Card>
        <CardContent className='p-4'>
          <p className='text-muted-foreground text-sm'>{t('common.status.loading')}</p>
        </CardContent>
      </Card>
    ) : sectionMembers.length === 0 ? (
      (options?.emptyState ?? null)
    ) : (
      <Card>
        <CardContent className='p-0'>
          <div
            className={`bg-muted/50 text-muted-foreground hidden gap-4 border-b px-4 py-3 text-xs font-medium md:grid ${options?.showActions === false ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_44px]'}`}
          >
            <div>{t('pages.spaceSettings.members.listHeaders.member')}</div>
            {options?.showActions === false ? null : (
              <div className='text-right'>
                {t('pages.spaceSettings.members.listHeaders.action')}
              </div>
            )}
          </div>
          <div className='divide-y'>
            {sectionMembers.map((member) => {
              const memberLabel = getMemberLabel(member)
              const isCurrentUser = member.userId === currentUserId
              const desktopMenuId = `${member.userId}-desktop`
              const mobileMenuId = `${member.userId}-mobile`

              return (
                <div key={member.userId}>
                  <div
                    className={`hidden items-center gap-4 px-4 py-4 md:grid ${options?.showActions === false ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_44px]'}`}
                  >
                    <div className='flex min-w-0 items-center gap-3'>
                      <Avatar className='h-10 w-10'>
                        <AvatarImage src={member.avatarUrl ?? undefined} alt={memberLabel} />
                        <AvatarFallback className='text-sm font-semibold'>
                          {getInitials(memberLabel)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          <p className='truncate text-sm font-medium'>{memberLabel}</p>
                          {member.role === 'admin' || member.role === 'owner' ? (
                            <Badge variant='secondary' className='h-5 px-2 text-[11px] font-medium'>
                              {getRoleBadgeLabel(member, t)}
                            </Badge>
                          ) : null}
                          {isCurrentUser ? (
                            <Badge
                              variant='outline'
                              className='inline-flex h-5 items-center gap-1 px-2 text-[11px] font-medium'
                            >
                              <UserRound className='h-3 w-3' />
                              {t('pages.spaceSettings.members.removeSelfDisabled')}
                            </Badge>
                          ) : null}
                        </div>
                        <p className='text-muted-foreground truncate text-xs'>
                          {member.email || `@${member.username}`}
                        </p>
                      </div>
                    </div>
                    {options?.showActions === false ? null : (
                      <div>
                        {!hasMemberActions(member) ? null : (
                          <div className='flex justify-end'>
                            <DropdownMenu
                              open={openMenuMemberId === desktopMenuId}
                              onOpenChange={(open) =>
                                setOpenMenuMemberId(open ? desktopMenuId : null)
                              }
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-9 w-9'
                                  aria-label={t('common.buttons.more')}
                                >
                                  <MoreHorizontal className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              {renderMemberActions(member, desktopMenuId)}
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className='px-4 py-4 md:hidden'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <Avatar className='h-10 w-10'>
                        <AvatarImage src={member.avatarUrl ?? undefined} alt={memberLabel} />
                        <AvatarFallback className='text-sm font-semibold'>
                          {getInitials(memberLabel)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <p className='truncate text-sm font-medium'>{memberLabel}</p>
                          {member.role === 'admin' || member.role === 'owner' ? (
                            <Badge variant='secondary' className='h-5 px-2 text-[11px] font-medium'>
                              {getRoleBadgeLabel(member, t)}
                            </Badge>
                          ) : null}
                          {isCurrentUser ? (
                            <Badge
                              variant='outline'
                              className='inline-flex h-5 items-center gap-1 px-2 text-[11px] font-medium'
                            >
                              <UserRound className='h-3 w-3' />
                              {t('pages.spaceSettings.members.removeSelfDisabled')}
                            </Badge>
                          ) : null}
                        </div>
                        <p className='text-muted-foreground truncate text-xs'>
                          {member.email || `@${member.username}`}
                        </p>
                      </div>
                      {!hasMemberActions(member) ? null : (
                        <DropdownMenu
                          open={openMenuMemberId === mobileMenuId}
                          onOpenChange={(open) => setOpenMenuMemberId(open ? mobileMenuId : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-9 w-9'
                              aria-label={t('common.buttons.more')}
                            >
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          {renderMemberActions(member, mobileMenuId)}
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )

  const directMembersEmptyState = (
    <div className='rounded-lg border border-dashed p-6 text-center'>
      <p className='font-medium'>{t('pages.spaceSettings.members.empty')}</p>
      <p className='text-muted-foreground mt-1 text-sm'>
        {t('pages.spaceSettings.members.emptyDescription')}
      </p>
    </div>
  )

  return (
    <>
      <div className='space-y-5'>
        <div className='space-y-2'>
          <h3 className='text-base font-semibold'>
            {t('pages.spaceSettings.members.sharedTitle')} ({organizationMembers.length})
          </h3>
          <p className='text-muted-foreground text-sm'>
            {t('pages.spaceSettings.members.sharedManageHint')}
          </p>
          {renderMembersList(organizationMembers, { showActions: false })}
        </div>

        <div className='space-y-2'>
          <h3 className='text-base font-semibold'>
            {t('pages.spaceSettings.members.accessLabel')} ({directMembers.length})
          </h3>
          <p className='text-muted-foreground text-sm'>
            {t('pages.spaceSettings.members.accessDescription')}
          </p>
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
          {renderMembersList(directMembers, { emptyState: directMembersEmptyState })}
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
            {t('pages.spaceSettings.members.removeDescription', {
              name: pendingMember?.displayName || pendingMember?.username || '',
            })}
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

      <ResponsiveDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.leaveSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.leaveSpaceDescription')}{' '}
            <strong className='text-foreground'>{spaceID}</strong>?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setLeaveDialogOpen(false)}
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
    </>
  )
}

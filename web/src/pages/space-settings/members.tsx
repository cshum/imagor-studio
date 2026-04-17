import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock3, MailPlus, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import {
  addSpaceMember,
  inviteSpaceMember,
  listOrgMembers,
  listSpaceInvitations,
  listSpaceMembers,
  removeSpaceMember,
  updateSpaceMemberRole,
  type OrgMemberItem,
  type SpaceInvitationItem,
  type SpaceInviteResultItem,
  type SpaceMemberItem,
} from '@/api/org-api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const ROLE_OPTIONS = ['admin', 'member'] as const

function getMemberLabel(member: Pick<SpaceMemberItem, 'displayName' | 'username'>) {
  return member.displayName || member.username
}

function getOrgMemberLabel(member: Pick<OrgMemberItem, 'displayName' | 'username'>) {
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

// ── Members section ────────────────────────────────────────────────────────

interface MembersSectionProps {
  spaceKey: string
  initialMembers: SpaceMemberItem[]
  initialOrgMembers: OrgMemberItem[]
  initialInvitations: SpaceInvitationItem[]
  isShared: boolean
}

export function MembersSection({
  spaceKey,
  initialMembers,
  initialOrgMembers,
  initialInvitations,
  isShared,
}: MembersSectionProps) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<SpaceMemberItem[]>(initialMembers)
  const [orgMembers, setOrgMembers] = useState<OrgMemberItem[]>(initialOrgMembers)
  const [invitations, setInvitations] = useState<SpaceInvitationItem[]>(initialInvitations)
  const [isLoading, setIsLoading] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('member')
  const [directAddRole, setDirectAddRole] = useState<string>('member')
  const [isInviting, setIsInviting] = useState(false)
  const [isAddingDirectly, setIsAddingDirectly] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const reload = async () => {
    setIsLoading(true)
    try {
      const [spaceMembers, allOrgMembers, pendingInvitations] = await Promise.all([
        listSpaceMembers(spaceKey),
        listOrgMembers(),
        listSpaceInvitations(spaceKey),
      ])
      setMembers(spaceMembers)
      setOrgMembers(allOrgMembers)
      setInvitations(pendingInvitations)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!addUserId) return
    setIsAddingDirectly(true)
    try {
      await addSpaceMember({ spaceKey, userId: addUserId, role: directAddRole })
      toast.success(t('pages.spaceSettings.members.addSuccess'))
      setAddUserId('')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsAddingDirectly(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    try {
      const result: SpaceInviteResultItem = await inviteSpaceMember({
        spaceKey,
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      if (result.status === 'added') {
        toast.success(t('pages.spaceSettings.members.addSuccess'))
      } else {
        toast.success(t('pages.spaceSettings.members.inviteSent'))
      }
      setInviteEmail('')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateSpaceMemberRole({ spaceKey, userId, role })
      toast.success(t('pages.spaceSettings.members.roleUpdated'))
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRemove = async () => {
    if (!pendingRemoveId) return
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

  const pendingMember = members.find((m) => m.userId === pendingRemoveId)
  const availableOrgMembers = orgMembers.filter(
    (member) => !members.some((spaceMember) => spaceMember.userId === member.userId),
  )

  const selectedCandidate = availableOrgMembers.find((member) => member.userId === addUserId)
  const sectionTitle = t('pages.spaceSettings.sections.members')

  const invitationsContent =
    invitations.length === 0 ? null : (
      <Card>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='min-w-0 space-y-1'>
                  <p className='truncate text-sm font-medium'>{invitation.email}</p>
                  <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                    <Clock3 className='h-3.5 w-3.5' />
                    <span>
                      {t('pages.spaceSettings.members.pendingHeaders.expires')}:{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Badge variant='secondary'>
                  {t(`pages.spaceSettings.members.roles.${invitation.role}`)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )

  return (
    <>
      <div className='space-y-6'>
        {isShared ? (
          <div className='bg-muted/40 rounded-xl border px-4 py-3 text-sm'>
            <div className='flex items-start gap-3'>
              <Badge variant='secondary' className='mt-0.5'>
                {t('pages.spaceSettings.members.sharedTitle')}
              </Badge>
              <p className='text-muted-foreground leading-6'>
                {t('pages.spaceSettings.members.sharedDescription')}
              </p>
            </div>
          </div>
        ) : null}

        <Card className='overflow-hidden'>
          <CardHeader className='pb-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full'>
                <MailPlus className='h-5 w-5' />
              </div>
              <div>
                <CardTitle className='text-lg'>
                  {t('pages.spaceSettings.members.sendInviteButton')}
                </CardTitle>
                <CardDescription>{t('pages.spaceSettings.members.inviteDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='flex flex-col gap-3 lg:flex-row'>
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder={t('pages.spaceSettings.members.emailPlaceholder')}
                disabled={isInviting}
                className='min-w-0 flex-1'
                type='email'
              />
              <Select value={inviteRole} onValueChange={setInviteRole} disabled={isInviting}>
                <SelectTrigger className='w-full lg:w-36'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`pages.spaceSettings.members.roles.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ButtonWithLoading
                onClick={handleInvite}
                isLoading={isInviting}
                disabled={!inviteEmail.trim()}
                className='w-full lg:w-auto'
              >
                {t('pages.spaceSettings.members.sendInviteButton')}
              </ButtonWithLoading>
            </div>

            <div className='text-muted-foreground flex items-start gap-2 text-sm leading-6'>
              <MailPlus className='mt-0.5 h-4 w-4 shrink-0' />
              <p>{t('pages.spaceSettings.members.inviteHelp')}</p>
            </div>

            <Separator />

            <div className='space-y-3 rounded-xl border border-dashed p-4'>
              <div className='flex items-start gap-3'>
                <div className='bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full'>
                  <UserPlus className='h-4 w-4' />
                </div>
                <div>
                  <p className='text-sm font-medium'>{t('pages.spaceSettings.members.addButton')}</p>
                  <p className='text-muted-foreground text-sm'>
                    {t('pages.spaceSettings.members.addExistingDescription')}
                  </p>
                </div>
              </div>

              <div className='flex flex-col gap-3 xl:flex-row'>
                <Select
                  value={addUserId}
                  onValueChange={setAddUserId}
                  disabled={isAddingDirectly || availableOrgMembers.length === 0}
                >
                  <SelectTrigger className='min-w-0 flex-1'>
                    <SelectValue
                      placeholder={
                        availableOrgMembers.length === 0
                          ? t('pages.spaceSettings.members.memberPlaceholderEmpty')
                          : t('pages.spaceSettings.members.memberPlaceholder')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrgMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {getOrgMemberLabel(member)} (@{member.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={directAddRole}
                  onValueChange={setDirectAddRole}
                  disabled={isAddingDirectly}
                >
                  <SelectTrigger className='w-full xl:w-36'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`pages.spaceSettings.members.roles.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ButtonWithLoading
                  onClick={handleAdd}
                  isLoading={isAddingDirectly}
                  disabled={!addUserId}
                  variant='outline'
                  className='w-full xl:w-auto'
                >
                  {t('pages.spaceSettings.members.addButton')}
                </ButtonWithLoading>
              </div>

              {selectedCandidate ? (
                <p className='text-muted-foreground text-xs'>
                  @{selectedCandidate.username}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {invitationsContent ? (
          <div className='space-y-3'>
            <div className='flex items-center gap-3'>
              <h3 className='text-base font-semibold'>
                {t('pages.spaceSettings.members.pendingTitle')} ({invitations.length})
              </h3>
              <Badge variant='outline'>{invitations.length}</Badge>
            </div>
            {invitationsContent}
          </div>
        ) : null}

        <div className='space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full'>
              <Users className='h-4 w-4' />
            </div>
            <div>
              <h3 className='text-base font-semibold'>
                {sectionTitle} ({members.length})
              </h3>
              <p className='text-muted-foreground text-sm'>
                {t('pages.spaceSettings.members.description')}
              </p>
            </div>
          </div>

          {isLoading ? (
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
                <div className='divide-y'>
                  {members.map((member) => {
                    const memberLabel = getMemberLabel(member)

                    return (
                      <div
                        key={member.userId}
                        className='flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between'
                      >
                        <div className='flex min-w-0 items-center gap-3'>
                          <Avatar className='h-10 w-10'>
                            <AvatarFallback className='text-sm font-semibold'>
                              {getInitials(memberLabel)}
                            </AvatarFallback>
                          </Avatar>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-medium'>{memberLabel}</p>
                            <p className='text-muted-foreground truncate text-xs'>
                              @{member.username}
                            </p>
                          </div>
                        </div>

                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                          <Select
                            value={member.role}
                            onValueChange={(role) => handleRoleChange(member.userId, role)}
                          >
                            <SelectTrigger className='w-full sm:w-36'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {t(`pages.spaceSettings.members.roles.${r}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-destructive hover:text-destructive h-9 px-3'
                            onClick={() => setPendingRemoveId(member.userId)}
                          >
                            {t('common.buttons.remove')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Remove confirmation dialog */}
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

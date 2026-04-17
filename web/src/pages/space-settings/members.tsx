import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock3 } from 'lucide-react'
import { toast } from 'sonner'

import {
  inviteSpaceMember,
  listSpaceInvitations,
  listSpaceMembers,
  removeSpaceMember,
  updateSpaceMemberRole,
  type SpaceInvitationItem,
  type SpaceInviteResultItem,
  type SpaceMemberItem,
} from '@/api/org-api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ROLE_OPTIONS = ['admin', 'member'] as const

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

// ── Members section ────────────────────────────────────────────────────────

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
  const [members, setMembers] = useState<SpaceMemberItem[]>(initialMembers)
  const [invitations, setInvitations] = useState<SpaceInvitationItem[]>(initialInvitations)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('member')
  const [isInviting, setIsInviting] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

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
      // ignore
    } finally {
      setIsLoading(false)
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
  const sectionTitle = t('pages.spaceSettings.sections.members')

  const invitationsContent =
    invitations.length === 0 ? null : (
      <div className='overflow-hidden rounded-lg border'>
        <div className='divide-y'>
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className='flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
            >
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>{invitation.email}</p>
                <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                  <span>{t(`pages.spaceSettings.members.roles.${invitation.role}`)}</span>
                  <span>•</span>
                  <Clock3 className='h-3.5 w-3.5' />
                  <span>
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
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
                    <p className='text-muted-foreground truncate text-xs'>@{member.username}</p>
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

        <div className='rounded-lg border p-4 sm:p-5'>
          <div className='space-y-4'>
            <div className='flex flex-col gap-3 lg:flex-row'>
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder={t('pages.spaceSettings.members.emailPlaceholder')}
                disabled={isInviting}
                className='h-10 min-w-0 flex-1'
                type='email'
              />
              <Select value={inviteRole} onValueChange={setInviteRole} disabled={isInviting}>
                <SelectTrigger className='h-10 w-full lg:w-36'>
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
                className='h-10 w-full lg:w-auto'
              >
                {t('pages.spaceSettings.members.sendInviteButton')}
              </ButtonWithLoading>
            </div>
          </div>
        </div>

        {invitationsContent ? (
          <div className='space-y-2'>
            <h3 className='text-base font-semibold'>
              {t('pages.spaceSettings.members.pendingTitle')} ({invitations.length})
            </h3>
            {invitationsContent}
          </div>
        ) : null}

        <div className='space-y-2'>
          <h3 className='text-base font-semibold'>
            {sectionTitle} ({members.length})
          </h3>
          {membersContent}
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

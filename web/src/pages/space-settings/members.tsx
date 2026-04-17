import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
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
  const [addRole, setAddRole] = useState<string>('member')
  const [isAdding, setIsAdding] = useState(false)
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
    setIsAdding(true)
    try {
      await addSpaceMember({ spaceKey, userId: addUserId, role: addRole })
      toast.success(t('pages.spaceSettings.members.addSuccess'))
      setAddUserId('')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsAdding(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setIsAdding(true)
    try {
      const result: SpaceInviteResultItem = await inviteSpaceMember({
        spaceKey,
        email: inviteEmail.trim(),
        role: addRole,
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
      setIsAdding(false)
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

  const membersContent = isLoading ? (
    <div className='rounded-lg border p-4'>
      <p className='text-muted-foreground text-sm'>{t('common.status.loading')}</p>
    </div>
  ) : members.length === 0 ? (
    <div className='rounded-lg border border-dashed p-6 text-center'>
      <p className='font-medium'>{t('pages.spaceSettings.members.empty')}</p>
      <p className='text-muted-foreground mt-1 text-sm'>
        {t('pages.spaceSettings.members.emptyDescription')}
      </p>
    </div>
  ) : (
    <div className='overflow-hidden rounded-lg border'>
      <div className='bg-muted/40 hidden grid-cols-[minmax(0,1fr)_140px_96px] gap-4 border-b px-4 py-3 text-xs font-medium tracking-wide uppercase md:grid'>
        <span>{t('pages.spaceSettings.members.tableHeaders.member')}</span>
        <span>{t('pages.spaceSettings.members.tableHeaders.role')}</span>
        <span className='text-right'>{t('pages.spaceSettings.members.tableHeaders.action')}</span>
      </div>
      <div className='divide-y'>
        {members.map((member) => (
          <div
            key={member.userId}
            className='grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px_96px] md:items-center md:gap-4'
          >
            <div className='flex min-w-0 items-center gap-3'>
              <div className='bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full'>
                <UserRound className='h-4 w-4' />
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>
                  {member.displayName || member.username}
                </p>
                <p className='text-muted-foreground truncate text-xs'>@{member.username}</p>
              </div>
            </div>
            <div className='space-y-1 md:space-y-0'>
              <p className='text-muted-foreground text-xs font-medium uppercase md:hidden'>
                {t('pages.spaceSettings.members.tableHeaders.role')}
              </p>
              <Select
                value={member.role}
                onValueChange={(role) => handleRoleChange(member.userId, role)}
              >
                <SelectTrigger className='h-9'>
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
            </div>
            <div className='flex justify-end'>
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
        ))}
      </div>
    </div>
  )

  const selectedCandidate = availableOrgMembers.find((member) => member.userId === addUserId)

  const invitationsContent =
    invitations.length === 0 ? null : (
      <div className='overflow-hidden rounded-lg border'>
        <div className='bg-muted/40 grid grid-cols-[minmax(0,1fr)_120px_140px] gap-4 border-b px-4 py-3 text-xs font-medium tracking-wide uppercase'>
          <span>{t('pages.spaceSettings.members.pendingHeaders.email')}</span>
          <span>{t('pages.spaceSettings.members.pendingHeaders.role')}</span>
          <span>{t('pages.spaceSettings.members.pendingHeaders.expires')}</span>
        </div>
        <div className='divide-y'>
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className='grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_120px_140px] md:items-center md:gap-4'
            >
              <span className='truncate'>{invitation.email}</span>
              <span>{t(`pages.spaceSettings.members.roles.${invitation.role}`)}</span>
              <span className='text-muted-foreground'>
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )

  return (
    <>
      <div className='space-y-4'>
        {isShared ? (
          <div className='rounded-lg border border-dashed px-4 py-3 text-sm'>
            <p className='font-medium'>{t('pages.spaceSettings.members.sharedTitle')}</p>
            <p className='text-muted-foreground mt-1'>
              {t('pages.spaceSettings.members.sharedDescription')}
            </p>
          </div>
        ) : null}

        <div className='space-y-2'>
          <p className='text-muted-foreground text-sm'>
            {t('pages.spaceSettings.members.inviteDescription')}
          </p>
          <div className='flex flex-wrap gap-2 sm:flex-nowrap'>
            <Input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={t('pages.spaceSettings.members.emailPlaceholder')}
              disabled={isAdding}
              className='min-w-0 flex-1'
              type='email'
            />
            <Select value={addRole} onValueChange={setAddRole} disabled={isAdding}>
              <SelectTrigger className='w-32 shrink-0'>
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
              isLoading={isAdding}
              disabled={!inviteEmail.trim()}
              className='shrink-0'
            >
              {t('pages.spaceSettings.members.sendInviteButton')}
            </ButtonWithLoading>
          </div>
          <p className='text-muted-foreground text-xs'>
            {t('pages.spaceSettings.members.inviteHelp')}
          </p>
        </div>

        <div className='space-y-2'>
          <p className='text-muted-foreground text-sm'>
            {t('pages.spaceSettings.members.addExistingDescription')}
          </p>
          <div className='flex flex-wrap gap-2 sm:flex-nowrap'>
            <Select
              value={addUserId}
              onValueChange={setAddUserId}
              disabled={isAdding || availableOrgMembers.length === 0}
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
                    {member.displayName || member.username} (@{member.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={addRole} onValueChange={setAddRole} disabled={isAdding}>
              <SelectTrigger className='w-32 shrink-0'>
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
              isLoading={isAdding}
              disabled={!addUserId}
              className='shrink-0'
            >
              {t('pages.spaceSettings.members.addButton')}
            </ButtonWithLoading>
          </div>
          {selectedCandidate ? (
            <p className='text-muted-foreground text-xs'>@{selectedCandidate.username}</p>
          ) : null}
        </div>

        {invitationsContent ? (
          <div className='space-y-2'>
            <p className='text-sm font-medium'>{t('pages.spaceSettings.members.pendingTitle')}</p>
            {invitationsContent}
          </div>
        ) : null}

        {membersContent}
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

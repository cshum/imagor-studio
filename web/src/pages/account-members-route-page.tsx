import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, UserMinus } from 'lucide-react'
import { toast } from 'sonner'

import {
  addOrgMember,
  addOrgMemberByEmail,
  getMyOrganization,
  listOrgMembers,
  removeOrgMember,
  transferOrganizationOwnership,
  updateOrgMemberRole,
  type OrgMemberItem,
} from '@/api/org-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingsSection } from '@/components/ui/settings-section'
import { extractErrorInfo, extractErrorMessage } from '@/lib/error-utils'
import type { OrgMembersLoaderData } from '@/loaders/account-loader'
import { useAuth } from '@/stores/auth-store'

interface AccountMembersRoutePageProps {
  loaderData: OrgMembersLoaderData
}

function getMemberLabel(member: Pick<OrgMemberItem, 'displayName' | 'username'>) {
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

function getRoleLabel(role: string, t: (key: string) => string) {
  if (role === 'owner') return t('pages.organizationMembers.roles.owner')
  if (role === 'admin') return t('pages.organizationMembers.roles.admin')
  return t('pages.organizationMembers.roles.member')
}

function getOrganizationMembersErrorMessage(error: unknown, t: (key: string) => string): string {
  const errorInfo = extractErrorInfo(error)

  switch (errorInfo.reason) {
    case 'org_member_other_organization':
      return t('pages.organizationMembers.messages.errors.otherOrganization')
    case 'org_member_already_member':
      return t('pages.organizationMembers.messages.errors.alreadyMember')
    case 'org_member_remove_self':
      return t('pages.organizationMembers.messages.errors.cannotRemoveYourself')
    case 'org_member_remove_owner':
      return t('pages.organizationMembers.messages.errors.cannotRemoveOwner')
    case 'org_member_remove_last_member':
      return t('pages.organizationMembers.messages.errors.cannotRemoveLastMember')
    case 'org_transfer_current_owner_required':
      return t('pages.organizationMembers.messages.errors.mustBeCurrentOwner')
    case 'org_transfer_target_not_member':
      return t('pages.organizationMembers.messages.errors.targetMustAlreadyBeMember')
  }

  return errorInfo.message || extractErrorMessage(error)
}

export function AccountMembersRoutePage({ loaderData }: AccountMembersRoutePageProps) {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const canAdministerOrganization = authState.profile?.role === 'admin'
  const [organization, setOrganization] = useState(loaderData.organization)
  const [members, setMembers] = useState(loaderData.members)
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [isAdding, setIsAdding] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null)
  const [pendingTransferUserId, setPendingTransferUserId] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)

  const currentUserId = authState.profile?.id ?? null
  const pendingRemoveMember =
    members.find((member) => member.userId === pendingRemoveUserId) ?? null
  const pendingTransferMember =
    members.find((member) => member.userId === pendingTransferUserId) ?? null
  const currentUserIsOwner = currentUserId !== null && organization?.ownerUserId === currentUserId

  const reloadOrganizationMembers = async () => {
    const [nextOrganization, nextMembers] = await Promise.all([getMyOrganization(), listOrgMembers()])
    setOrganization(nextOrganization)
    setMembers(nextMembers)
  }

  const handleAddMember = async () => {
    const nextIdentifier = identifier.trim()
    if (!nextIdentifier) {
      toast.error(t('pages.organizationMembers.messages.identifierRequired'))
      return
    }

    setIsAdding(true)
    try {
      if (nextIdentifier.includes('@')) {
        await addOrgMemberByEmail({ email: nextIdentifier, role })
      } else {
        await addOrgMember({ username: nextIdentifier, role })
      }

      toast.success(t('pages.organizationMembers.messages.memberAdded'))
      setIdentifier('')
      setRole('member')
      await reloadOrganizationMembers()
    } catch (error) {
      const message = getOrganizationMembersErrorMessage(error, t)
      toast.error(`${t('pages.organizationMembers.messages.memberAddFailed')}: ${message}`)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRoleChange = async (userId: string, nextRole: 'admin' | 'member') => {
    setUpdatingUserId(userId)
    try {
      await updateOrgMemberRole({ userId, role: nextRole })
      toast.success(t('pages.organizationMembers.messages.roleUpdated'))
      await reloadOrganizationMembers()
    } catch (error) {
      toast.error(
        `${t('pages.organizationMembers.messages.roleUpdateFailed')}: ${extractErrorMessage(error)}`,
      )
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleRemoveMember = async () => {
    if (!pendingRemoveUserId) return

    setIsRemoving(true)
    try {
      await removeOrgMember({ userId: pendingRemoveUserId })
      toast.success(t('pages.organizationMembers.messages.memberRemoved'))
      setPendingRemoveUserId(null)
      await reloadOrganizationMembers()
    } catch (error) {
      const message = getOrganizationMembersErrorMessage(error, t)
      toast.error(`${t('pages.organizationMembers.messages.memberRemoveFailed')}: ${message}`)
    } finally {
      setIsRemoving(false)
    }
  }

  const requestRemoveMember = (userId: string) => {
    window.setTimeout(() => setPendingRemoveUserId(userId), 0)
  }

  const handleTransferOwnership = async () => {
    if (!pendingTransferUserId) return

    setIsTransferring(true)
    try {
      await transferOrganizationOwnership({ userId: pendingTransferUserId })
      toast.success(t('pages.organizationMembers.messages.ownershipTransferred'))
      setPendingTransferUserId(null)
      await reloadOrganizationMembers()
    } catch (error) {
      const message = getOrganizationMembersErrorMessage(error, t)
      toast.error(`${t('pages.organizationMembers.messages.ownershipTransferFailed')}: ${message}`)
    } finally {
      setIsTransferring(false)
    }
  }

  const requestTransferOwnership = (userId: string) => {
    window.setTimeout(() => setPendingTransferUserId(userId), 0)
  }

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {t('pages.organizationMembers.title')}
        </h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          {t('pages.organizationMembers.titleDescription')}
        </p>
      </div>

      {canAdministerOrganization ? (
        <SettingsSection
          title={t('pages.organizationMembers.addTitle')}
          description={t('pages.organizationMembers.addDescription')}
          contentClassName='border-t-0'
        >
          <div className='grid gap-3 py-1 md:grid-cols-[minmax(0,1fr)_180px_auto]'>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={t('pages.organizationMembers.identifierPlaceholder')}
              disabled={isAdding}
            />
            <Select value={role} onValueChange={(value: 'admin' | 'member') => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='member'>{t('pages.organizationMembers.roles.member')}</SelectItem>
                <SelectItem value='admin'>{t('pages.organizationMembers.roles.admin')}</SelectItem>
              </SelectContent>
            </Select>
            <ButtonWithLoading isLoading={isAdding} onClick={handleAddMember}>
              {t('pages.organizationMembers.addButton')}
            </ButtonWithLoading>
          </div>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title={`${t('pages.organizationMembers.listTitle')} (${members.length})`}
        description={
          organization?.name
            ? t('pages.organizationMembers.listDescription', { name: organization.name })
            : t('pages.organizationMembers.listDescriptionFallback')
        }
      >
        {members.length === 0 ? (
          <div className='rounded-lg border border-dashed p-6 text-center'>
            <p className='font-medium'>{t('pages.organizationMembers.empty')}</p>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('pages.organizationMembers.emptyDescription')}
            </p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-lg border'>
            <div className='bg-muted/50 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_44px] gap-4 border-b px-4 py-3 text-xs font-medium md:grid'>
              <div>{t('pages.organizationMembers.listHeaders.member')}</div>
              <div className='text-right'>{t('pages.organizationMembers.listHeaders.action')}</div>
            </div>
            <div className='divide-y'>
              {members.map((member) => {
                const isOwner =
                  member.userId === organization?.ownerUserId || member.role === 'owner'
                const isCurrentUser = member.userId === currentUserId
                const canManage = canAdministerOrganization && !isOwner && !isCurrentUser
                const canTransferOwnership = currentUserIsOwner && !isOwner && !isCurrentUser
                const canShowActions = canManage || canTransferOwnership

                return (
                  <div key={member.userId}>
                    <div className='hidden grid-cols-[minmax(0,1fr)_44px] items-center gap-4 px-4 py-4 md:grid'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <Avatar className='h-10 w-10'>
                          <AvatarImage
                            src={member.avatarUrl ?? undefined}
                            alt={getMemberLabel(member)}
                          />
                          <AvatarFallback className='text-sm font-semibold'>
                            {getInitials(getMemberLabel(member))}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <p className='truncate text-sm font-medium'>{getMemberLabel(member)}</p>
                            <Badge
                              variant={isOwner ? 'secondary' : 'outline'}
                              className='h-5 px-2 text-[11px] font-medium'
                            >
                              {getRoleLabel(member.role, t)}
                            </Badge>
                            {isCurrentUser ? (
                              <Badge
                                variant='outline'
                                className='inline-flex h-5 items-center px-2 text-[11px] font-medium'
                              >
                                {t('pages.organizationMembers.youBadge')}
                              </Badge>
                            ) : null}
                          </div>
                          <p className='text-muted-foreground truncate text-xs'>
                            {member.email || `@${member.username}`}
                          </p>
                        </div>
                      </div>
                      <div>
                        {canShowActions ? (
                          <div className='flex justify-end'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <ButtonWithLoading
                                  variant='ghost'
                                  size='icon'
                                  className='h-9 w-9'
                                  isLoading={updatingUserId === member.userId}
                                  disabled={isRemoving && pendingRemoveUserId === member.userId}
                                >
                                  <MoreHorizontal className='h-4 w-4' />
                                </ButtonWithLoading>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuLabel>
                                  {t('pages.organizationMembers.actionsTitle')}
                                </DropdownMenuLabel>
                                {canTransferOwnership ? (
                                  <DropdownMenuItem onClick={() => requestTransferOwnership(member.userId)}>
                                    {t('pages.organizationMembers.transferOwnership')}
                                  </DropdownMenuItem>
                                ) : null}
                                {canTransferOwnership && canManage ? <DropdownMenuSeparator /> : null}
                                {canManage ? (
                                  <>
                                    <DropdownMenuItem
                                      disabled={member.role === 'admin'}
                                      onClick={() => handleRoleChange(member.userId, 'admin')}
                                    >
                                      {t('pages.organizationMembers.promoteToAdmin')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={member.role === 'member'}
                                      onClick={() => handleRoleChange(member.userId, 'member')}
                                    >
                                      {t('pages.organizationMembers.changeToMember')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className='text-destructive focus:text-destructive'
                                      onClick={() => requestRemoveMember(member.userId)}
                                    >
                                      <UserMinus className='mr-2 h-4 w-4' />
                                      {t('pages.organizationMembers.removeMember')}
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className='px-4 py-4 md:hidden'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <Avatar className='h-10 w-10'>
                          <AvatarImage
                            src={member.avatarUrl ?? undefined}
                            alt={getMemberLabel(member)}
                          />
                          <AvatarFallback className='text-sm font-semibold'>
                            {getInitials(getMemberLabel(member))}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <p className='truncate text-sm font-medium'>{getMemberLabel(member)}</p>
                            <Badge
                              variant={isOwner ? 'secondary' : 'outline'}
                              className='h-5 px-2 text-[11px] font-medium'
                            >
                              {getRoleLabel(member.role, t)}
                            </Badge>
                            {isCurrentUser ? (
                              <Badge
                                variant='outline'
                                className='inline-flex h-5 items-center px-2 text-[11px] font-medium'
                              >
                                {t('pages.organizationMembers.youBadge')}
                              </Badge>
                            ) : null}
                          </div>
                          <p className='text-muted-foreground truncate text-xs'>
                            {member.email || `@${member.username}`}
                          </p>
                        </div>
                        {canShowActions ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <ButtonWithLoading
                                variant='ghost'
                                size='icon'
                                className='h-9 w-9'
                                isLoading={updatingUserId === member.userId}
                                disabled={isRemoving && pendingRemoveUserId === member.userId}
                              >
                                <MoreHorizontal className='h-4 w-4' />
                              </ButtonWithLoading>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuLabel>
                                {t('pages.organizationMembers.actionsTitle')}
                              </DropdownMenuLabel>
                              {canTransferOwnership ? (
                                <DropdownMenuItem onClick={() => requestTransferOwnership(member.userId)}>
                                  {t('pages.organizationMembers.transferOwnership')}
                                </DropdownMenuItem>
                              ) : null}
                              {canTransferOwnership && canManage ? <DropdownMenuSeparator /> : null}
                              {canManage ? (
                                <>
                                  <DropdownMenuItem
                                    disabled={member.role === 'admin'}
                                    onClick={() => handleRoleChange(member.userId, 'admin')}
                                  >
                                    {t('pages.organizationMembers.promoteToAdmin')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={member.role === 'member'}
                                    onClick={() => handleRoleChange(member.userId, 'member')}
                                  >
                                    {t('pages.organizationMembers.changeToMember')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className='text-destructive focus:text-destructive'
                                    onClick={() => requestRemoveMember(member.userId)}
                                  >
                                    <UserMinus className='mr-2 h-4 w-4' />
                                    {t('pages.organizationMembers.removeMember')}
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </SettingsSection>

      <ResponsiveDialog
        open={pendingRemoveMember !== null}
        onOpenChange={(open) => !open && setPendingRemoveUserId(null)}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('pages.organizationMembers.removeTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.organizationMembers.removeDescription', {
              name: pendingRemoveMember ? getMemberLabel(pendingRemoveMember) : '',
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ButtonWithLoading variant='outline' onClick={() => setPendingRemoveUserId(null)}>
            {t('common.buttons.cancel')}
          </ButtonWithLoading>
          <ButtonWithLoading
            variant='destructive'
            isLoading={isRemoving}
            onClick={handleRemoveMember}
          >
            {t('pages.organizationMembers.removeMember')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={pendingTransferMember !== null}
        onOpenChange={(open) => !open && setPendingTransferUserId(null)}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('pages.organizationMembers.transferTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.organizationMembers.transferDescription', {
              name: pendingTransferMember ? getMemberLabel(pendingTransferMember) : '',
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ButtonWithLoading variant='outline' onClick={() => setPendingTransferUserId(null)}>
            {t('common.buttons.cancel')}
          </ButtonWithLoading>
          <ButtonWithLoading isLoading={isTransferring} onClick={handleTransferOwnership}>
            {t('pages.organizationMembers.transferOwnership')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </div>
  )
}

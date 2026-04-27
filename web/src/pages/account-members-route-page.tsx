import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, UserMinus } from 'lucide-react'
import { toast } from 'sonner'

import {
  addOrgMember,
  addOrgMemberByEmail,
  listOrgMembers,
  removeOrgMember,
  updateOrgMemberRole,
  type OrgMemberItem,
} from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { extractErrorMessage } from '@/lib/error-utils'
import type { OrgMembersLoaderData } from '@/loaders/account-loader'
import { useAuth } from '@/stores/auth-store'

interface AccountMembersRoutePageProps {
  loaderData: OrgMembersLoaderData
}

function getMemberLabel(member: Pick<OrgMemberItem, 'displayName' | 'username'>) {
  return member.displayName || member.username
}

function getRoleLabel(role: string, t: (key: string) => string) {
  if (role === 'owner') return t('pages.organizationMembers.roles.owner')
  if (role === 'admin') return t('pages.organizationMembers.roles.admin')
  return t('pages.organizationMembers.roles.member')
}

function formatJoinedAt(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function AccountMembersRoutePage({ loaderData }: AccountMembersRoutePageProps) {
  const { t, i18n } = useTranslation()
  const { authState } = useAuth()
  const [members, setMembers] = useState(loaderData.members)
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [isAdding, setIsAdding] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const currentUserId = authState.profile?.id ?? null
  const organization = loaderData.organization
  const pendingRemoveMember =
    members.find((member) => member.userId === pendingRemoveUserId) ?? null

  const reloadMembers = async () => {
    const nextMembers = await listOrgMembers()
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
      await reloadMembers()
    } catch (error) {
      toast.error(
        `${t('pages.organizationMembers.messages.memberAddFailed')}: ${extractErrorMessage(error)}`,
      )
    } finally {
      setIsAdding(false)
    }
  }

  const handleRoleChange = async (userId: string, nextRole: 'admin' | 'member') => {
    setUpdatingUserId(userId)
    try {
      await updateOrgMemberRole({ userId, role: nextRole })
      toast.success(t('pages.organizationMembers.messages.roleUpdated'))
      await reloadMembers()
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
      await reloadMembers()
    } catch (error) {
      toast.error(
        `${t('pages.organizationMembers.messages.memberRemoveFailed')}: ${extractErrorMessage(error)}`,
      )
    } finally {
      setIsRemoving(false)
    }
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

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.organizationMembers.addTitle')}</CardTitle>
          <CardDescription>{t('pages.organizationMembers.addDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]'>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.organizationMembers.listTitle')}</CardTitle>
          <CardDescription>
            {organization?.name
              ? t('pages.organizationMembers.listDescription', { name: organization.name })
              : t('pages.organizationMembers.listDescriptionFallback')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {members.map((member) => {
            const isOwner = member.userId === organization?.ownerUserId || member.role === 'owner'
            const isCurrentUser = member.userId === currentUserId
            const canManage = !isOwner && !isCurrentUser

            return (
              <div
                key={member.userId}
                className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='min-w-0 space-y-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='truncate font-medium'>{getMemberLabel(member)}</p>
                    <Badge variant={isOwner ? 'secondary' : 'outline'}>
                      {getRoleLabel(member.role, t)}
                    </Badge>
                    {isCurrentUser && (
                      <Badge variant='outline'>{t('pages.organizationMembers.youBadge')}</Badge>
                    )}
                  </div>
                  <p className='text-muted-foreground text-sm'>@{member.username}</p>
                  <p className='text-muted-foreground text-xs'>
                    {t('pages.organizationMembers.joinedAt', {
                      date: formatJoinedAt(member.createdAt, i18n.language),
                    })}
                  </p>
                </div>

                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ButtonWithLoading
                        variant='outline'
                        size='icon'
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
                        onClick={() => setPendingRemoveUserId(member.userId)}
                      >
                        <UserMinus className='mr-2 h-4 w-4' />
                        {t('pages.organizationMembers.removeMember')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>

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
    </div>
  )
}

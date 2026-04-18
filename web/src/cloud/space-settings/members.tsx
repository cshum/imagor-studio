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
} from '@/cloud/org-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@shared/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent } from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu'
import { Input } from '@shared/components/ui/input'
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

function getRoleDescription(
	member: Pick<SpaceMemberItem, 'role' | 'roleSource'>,
	t: (key: string) => string,
) {
	if (member.roleSource === 'organization') {
		return t('pages.spaceSettings.members.roleSource.organization')
	}
	if (member.role === 'admin') {
		return t('pages.spaceSettings.members.roleSource.space')
	}
	return null
}

interface MembersSectionProps {
	spaceKey: string
	initialMembers: SpaceMemberItem[]
	initialInvitations: SpaceInvitationItem[]
	isShared: boolean
	canLeave?: boolean
}

export function MembersSection({
	spaceKey,
	initialMembers,
	initialInvitations,
	isShared,
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
			return { kind: 'field' as const, message: t('pages.spaceSettings.members.inviteErrors.required') }
		}
		if (normalized.includes('already has access')) {
			return { kind: 'field' as const, message: t('pages.spaceSettings.members.inviteErrors.alreadyHasAccess') }
		}
		if (normalized.includes('email invitations are not configured')) {
			return { kind: 'toast' as const, message: t('pages.spaceSettings.members.inviteErrors.notConfigured') }
		}
		if (normalized.includes('space member management is not available')) {
			return { kind: 'toast' as const, message: t('pages.spaceSettings.members.inviteErrors.unavailable') }
		}
		return { kind: 'toast' as const, message: t('pages.spaceSettings.members.inviteErrors.default') }
	}

	const shareWithEmail = async (email: string) => {
		const result: SpaceInviteResultItem = await inviteSpaceMember({ spaceKey, email, role: 'member' })
		toast.success(
			result.status === 'added'
				? t('pages.spaceSettings.members.addSuccess')
				: t('pages.spaceSettings.members.inviteSent'),
		)
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
			if (mappedError.kind === 'field') setInviteFieldError(mappedError.message)
			else toast.error(mappedError.message)
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

	const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
		setOpenMenuMemberId(null)
		setUpdatingRoleUserId(userId)
		try {
			await updateSpaceMemberRole({ spaceKey, userId, role })
			toast.success(t('pages.spaceSettings.members.roleUpdated'))
			await reload()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : String(err))
		} finally {
			setUpdatingRoleUserId(null)
		}
	}

	const canLeaveSpace = Boolean(authState.profile?.id && canLeave)

	const handleLeaveSpace = async () => {
		setIsLeaving(true)
		try {
			await leaveSpace({ spaceKey })
			toast.success(t('pages.spaces.messages.leaveSpaceSuccess'))
			window.location.href = '/spaces'
		} catch (err) {
			toast.error(`${t('pages.spaces.messages.leaveSpaceFailed')}: ${err instanceof Error ? err.message : String(err)}`)
		} finally {
			setIsLeaving(false)
			setLeaveDialogOpen(false)
		}
	}

	const requestRemoveMember = (menuId: string, userId: string) => {
		setOpenMenuMemberId((current) => (current === menuId ? null : current))
		if (removeDialogTimerRef.current !== null) window.clearTimeout(removeDialogTimerRef.current)
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
				{(canShowRoleSection && canShowRemove) || (canShowRoleSection && canShowLeave) ? <DropdownMenuSeparator /> : null}
				{canShowRemove ? (
					<DropdownMenuItem onClick={() => requestRemoveMember(menuId, member.userId)}>
						<UserX className='mr-2 h-4 w-4' />
						<span>{t('pages.spaceSettings.members.remove')}</span>
					</DropdownMenuItem>
				) : null}
				{canShowLeave ? (
					<DropdownMenuItem onClick={() => setLeaveDialogOpen(true)}>
						<UserX className='mr-2 h-4 w-4' />
						<span>{t('pages.spaceSettings.members.leaveSpace')}</span>
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		)
	}

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-xl font-semibold'>{sectionTitle}</h2>
				<p className='text-muted-foreground mt-1 text-sm'>
					{isShared
						? t('pages.spaceSettings.members.sharedDescription')
						: t('pages.spaceSettings.members.description')}
				</p>
			</div>

			<Card>
				<CardContent className='space-y-4 pt-6'>
					<div className='flex gap-2'>
						<Input
							type='email'
							placeholder={t('pages.spaceSettings.members.invitePlaceholder')}
							value={inviteEmail}
							onChange={(e) => setInviteEmail(e.target.value)}
						/>
						<ButtonWithLoading isLoading={isInviting} onClick={handleInvite}>
							{t('pages.spaceSettings.members.inviteButton')}
						</ButtonWithLoading>
					</div>
					{inviteFieldError ? <p className='text-destructive text-sm'>{inviteFieldError}</p> : null}
				</CardContent>
			</Card>

			<div className='space-y-3'>
				{members.map((member) => {
					const label = getMemberLabel(member)
					const roleDescription = getRoleDescription(member, t)
					const menuId = `${member.userId}-${member.role}`

					return (
						<Card key={member.userId}>
							<CardContent className='flex items-center justify-between gap-4 py-4'>
								<div className='flex items-center gap-3'>
									<Avatar>
										<AvatarImage src={member.avatarUrl ?? undefined} alt={label} />
										<AvatarFallback>{getInitials(label || member.username)}</AvatarFallback>
									</Avatar>
									<div>
										<div className='flex items-center gap-2'>
											<span className='font-medium'>{label}</span>
											<Badge variant='secondary'>{getRoleBadgeLabel(member, t)}</Badge>
										</div>
										<div className='text-muted-foreground flex items-center gap-2 text-sm'>
											<UserRound className='h-3.5 w-3.5' />
											<span>@{member.username}</span>
											{roleDescription ? <span>• {roleDescription}</span> : null}
										</div>
									</div>
								</div>

								<DropdownMenu open={openMenuMemberId === menuId} onOpenChange={(open) => setOpenMenuMemberId(open ? menuId : null)}>
									<DropdownMenuTrigger asChild>
										<Button variant='ghost' size='icon'>
											<MoreHorizontal className='h-4 w-4' />
										</Button>
									</DropdownMenuTrigger>
									{renderMemberActions(member, menuId)}
								</DropdownMenu>
							</CardContent>
						</Card>
					)
				})}

				{invitations.map((invitation) => (
					<Card key={invitation.id}>
						<CardContent className='flex items-center gap-3 py-4'>
							<Avatar>
								<AvatarFallback>
									<Clock3 className='h-4 w-4' />
								</AvatarFallback>
							</Avatar>
							<div>
								<div className='font-medium'>{invitation.email}</div>
								<div className='text-muted-foreground text-sm'>
									{t('pages.spaceSettings.members.pendingInvitation')}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<ResponsiveDialog open={pendingRemoveId !== null} onOpenChange={(open) => !open && setPendingRemoveId(null)}>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>{t('pages.spaceSettings.members.removeDialogTitle')}</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{t('pages.spaceSettings.members.removeDialogDescription', {
							member: pendingMember ? getMemberLabel(pendingMember) : '',
						})}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogFooter>
					<Button variant='outline' onClick={() => setPendingRemoveId(null)}>
						{t('common.buttons.cancel')}
					</Button>
					<ButtonWithLoading variant='destructive' isLoading={isRemoving} onClick={handleRemove}>
						{t('pages.spaceSettings.members.remove')}
					</ButtonWithLoading>
				</ResponsiveDialogFooter>
			</ResponsiveDialog>

			<ResponsiveDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>{t('pages.spaceSettings.members.leaveDialogTitle')}</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{t('pages.spaceSettings.members.leaveDialogDescription')}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogFooter>
					<Button variant='outline' onClick={() => setLeaveDialogOpen(false)}>
						{t('common.buttons.cancel')}
					</Button>
					<ButtonWithLoading variant='destructive' isLoading={isLeaving} onClick={handleLeaveSpace}>
						{t('pages.spaceSettings.members.leaveSpace')}
					</ButtonWithLoading>
				</ResponsiveDialogFooter>
			</ResponsiveDialog>

			{isLoading ? <div className='text-muted-foreground text-sm'>{t('common.status.loading')}</div> : null}
		</div>
	)
}

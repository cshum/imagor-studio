import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { Edit, MoreHorizontal, Plus, Search, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { createUser, deactivateAccount, reactivateAccount, updateProfile } from '@/api/user-api'
import { Button } from '@shared/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@shared/components/ui/input'
import {
	ResponsiveDialog,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormErrors } from '@/hooks/use-form-errors'
import type { ListUsersQuery, User } from '@/types/generated-shared'

interface UsersPageProps {
	loaderData?: ListUsersQuery['users']
	searchQuery?: string
}

export function UsersPage({ loaderData, searchQuery = '' }: UsersPageProps) {
	const { t } = useTranslation()
	const router = useRouter()
	const [searchTerm, setSearchTerm] = useState(searchQuery)
	const navigate = useNavigate()
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearchTerm(value)
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
			searchTimerRef.current = setTimeout(() => {
				void navigate({ to: '/account/users', search: { q: value }, replace: true })
			}, 300)
		},
		[navigate],
	)

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [selectedUser, setSelectedUser] = useState<User | null>(null)
	const [isCreating, setIsCreating] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const [isDeactivating, setIsDeactivating] = useState<string | null>(null)

	const createUserSchema = z
		.object({
			displayName: z
				.string()
				.min(3, t('forms.validation.displayNameMinLength'))
				.max(100, t('forms.validation.displayNameMaxLength')),
			username: z
				.string()
				.min(3, t('forms.validation.usernameMinLength'))
				.max(30, t('forms.validation.usernameMaxLength'))
				.regex(/^[a-zA-Z0-9_-]+$/, t('forms.validation.usernamePattern')),
			password: z
				.string()
				.min(8, t('forms.validation.passwordMinLength'))
				.max(72, t('forms.validation.passwordMaxLength')),
			confirmPassword: z
				.string()
				.min(8, t('forms.validation.confirmPasswordMinLength'))
				.max(72, t('forms.validation.confirmPasswordMaxLength')),
			role: z.enum(['user', 'admin']),
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: t('forms.validation.passwordsDoNotMatch'),
			path: ['confirmPassword'],
		})

	const editUserSchema = z.object({
		displayName: z
			.string()
			.min(3, t('forms.validation.displayNameMinLength'))
			.max(100, t('forms.validation.displayNameMaxLength')),
		username: z
			.string()
			.min(3, t('forms.validation.usernameMinLength'))
			.max(30, t('forms.validation.usernameMaxLength'))
			.regex(/^[a-zA-Z0-9_-]+$/, t('forms.validation.usernamePattern')),
		role: z.enum(['user', 'admin']),
	})

	type CreateUserFormData = z.infer<typeof createUserSchema>
	type EditUserFormData = z.infer<typeof editUserSchema>

	const { handleFormError: handleCreateError } = useFormErrors<CreateUserFormData>()
	const { handleFormError: handleEditError } = useFormErrors<EditUserFormData>()

	const users = loaderData?.items || []
	const totalCount = loaderData?.totalCount || 0

	const createForm = useForm<CreateUserFormData>({
		resolver: zodResolver(createUserSchema),
		defaultValues: {
			displayName: '',
			username: '',
			password: '',
			confirmPassword: '',
			role: 'user',
		},
	})

	const editForm = useForm<EditUserFormData>({
		resolver: zodResolver(editUserSchema),
		defaultValues: {
			displayName: '',
			username: '',
			role: 'user',
		},
	})

	const handleCreateUser = async (values: CreateUserFormData) => {
		setIsCreating(true)
		try {
			await createUser({
				displayName: values.displayName,
				username: values.username,
				password: values.password,
				role: values.role,
			})
			toast.success(t('pages.users.messages.userCreatedSuccess'))
			setIsCreateDialogOpen(false)
			createForm.reset()
			await router.invalidate()
		} catch (err) {
			handleCreateError(
				err,
				createForm.setError,
				{ username: { ALREADY_EXISTS: t('pages.users.messages.usernameAlreadyExists') } },
				t('pages.users.messages.createUserFailed'),
			)
		} finally {
			setIsCreating(false)
		}
	}

	const handleEditUser = async (values: EditUserFormData) => {
		if (!selectedUser) return
		setIsUpdating(true)
		try {
			await updateProfile(
				{ displayName: values.displayName, username: values.username },
				selectedUser.id,
			)
			toast.success(t('pages.users.messages.userUpdatedSuccess'))
			setIsEditDialogOpen(false)
			setSelectedUser(null)
			await router.invalidate()
		} catch (err) {
			handleEditError(
				err,
				editForm.setError,
				{ username: { ALREADY_EXISTS: t('pages.users.messages.usernameAlreadyExists') } },
				t('pages.users.messages.updateUserFailed'),
			)
		} finally {
			setIsUpdating(false)
		}
	}

	const handleDeactivateUser = async (userId: string, isActive: boolean) => {
		setIsDeactivating(userId)
		try {
			if (isActive) {
				await deactivateAccount(userId)
			} else {
				await reactivateAccount(userId)
			}
			toast.success(
				isActive
					? t('pages.users.messages.userDeactivatedSuccess')
					: t('pages.users.messages.userReactivatedSuccess'),
			)
			setIsEditDialogOpen(false)
			setSelectedUser(null)
			await router.invalidate()
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error'
			toast.error(
				`${
					isActive
						? t('pages.users.messages.deactivateUserFailed')
						: t('pages.users.messages.reactivateUserFailed')
				}: ${errorMessage}`,
			)
		} finally {
			setIsDeactivating(null)
		}
	}

	const openEditDialog = (user: User) => {
		setTimeout(() => {
			setSelectedUser(user)
			editForm.reset({
				displayName: user.displayName,
				username: user.username,
				...(user.role === 'user' && { role: 'user' }),
				...(user.role === 'admin' && { role: 'admin' }),
			})
			setIsEditDialogOpen(true)
		}, 0)
	}

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold tracking-tight'>{t('pages.users.title')}</h1>
				<p className='text-muted-foreground mt-1.5 text-sm'>{t('pages.users.description')}</p>
			</div>

			<div className='space-y-4'>
				<div className='flex items-center gap-3'>
					<div className='relative flex-1'>
						<Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
						<Input
							placeholder={t('pages.users.searchPlaceholder')}
							value={searchTerm}
							onChange={(e) => handleSearchChange(e.target.value)}
							className='pl-10'
						/>
					</div>
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className='mr-2 h-4 w-4' />
						{t('pages.users.createUser')}
					</Button>
				</div>

				<div className='space-y-2'>
					{loaderData === undefined ? (
						Array.from({ length: 5 }).map((_, index) => (
							<div key={index} className='border-border rounded-lg border p-4'>
								<div className='flex items-center justify-between'>
									<div className='space-y-2'>
										<Skeleton className='h-4 w-32' />
										<Skeleton className='h-3 w-24' />
									</div>
									<Skeleton className='h-8 w-8 rounded-md' />
								</div>
							</div>
						))
					) : users.length === 0 ? (
						<div className='text-muted-foreground rounded-lg border border-dashed py-12 text-center'>
							{searchTerm ? t('pages.users.noResults') : t('pages.users.noUsers')}
						</div>
					) : (
						users.map((user) => (
							<div
								key={user.id}
								className='border-border flex items-center justify-between rounded-lg border p-4'
							>
								<div>
									<div className='font-medium'>{user.displayName}</div>
									<div className='text-muted-foreground text-sm'>@{user.username}</div>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant='ghost' size='icon'>
											<MoreHorizontal className='h-4 w-4' />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align='end'>
										<DropdownMenuItem onClick={() => openEditDialog(user)}>
											<Edit className='mr-2 h-4 w-4' />
											{t('common.buttons.edit')}
										</DropdownMenuItem>
										{user.isActive ? (
											<DropdownMenuItem onClick={() => handleDeactivateUser(user.id, true)}>
												<UserX className='mr-2 h-4 w-4' />
												{t('pages.users.deactivateUser')}
											</DropdownMenuItem>
										) : (
											<DropdownMenuItem onClick={() => handleDeactivateUser(user.id, false)}>
												<UserCheck className='mr-2 h-4 w-4' />
												{t('pages.users.reactivateUser')}
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						))
					)}
				</div>

				{loaderData !== undefined && users.length > 0 ? (
					<p className='text-muted-foreground text-sm'>
						{t('pages.users.resultsCount', { count: totalCount })}
					</p>
				) : null}
			</div>

			<ResponsiveDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>{t('pages.users.createUser')}</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{t('pages.users.createUserDescription')}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<Form {...createForm}>
					<form onSubmit={createForm.handleSubmit(handleCreateUser)} className='space-y-4'>
						<FormField
							control={createForm.control}
							name='displayName'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('forms.labels.displayName')}</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={createForm.control}
							name='username'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('forms.labels.username')}</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={createForm.control}
							name='password'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('forms.labels.password')}</FormLabel>
									<FormControl>
										<Input type='password' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={createForm.control}
							name='confirmPassword'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('forms.labels.confirmPassword')}</FormLabel>
									<FormControl>
										<Input type='password' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<ResponsiveDialogFooter>
							<ButtonWithLoading type='submit' isLoading={isCreating}>
								{t('pages.users.createUser')}
							</ButtonWithLoading>
						</ResponsiveDialogFooter>
					</form>
				</Form>
			</ResponsiveDialog>

			<ResponsiveDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>{t('pages.users.editUser')}</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{t('pages.users.editUserDescription')}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<Form {...editForm}>
					<form onSubmit={editForm.handleSubmit(handleEditUser)} className='space-y-4'>
						<FormField
							control={editForm.control}
							name='displayName'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('forms.labels.displayName')}</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={editForm.control}
							name='username'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('forms.labels.username')}</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<ResponsiveDialogFooter>
							<ButtonWithLoading type='submit' isLoading={isUpdating}>
								{t('common.buttons.save')}
							</ButtonWithLoading>
							{selectedUser ? (
								<Button
									type='button'
									variant='outline'
									onClick={() => handleDeactivateUser(selectedUser.id, !!selectedUser.isActive)}
									disabled={isDeactivating === selectedUser.id}
								>
									{selectedUser.isActive
										? t('pages.users.deactivateUser')
										: t('pages.users.reactivateUser')}
								</Button>
							) : null}
						</ResponsiveDialogFooter>
					</form>
				</Form>
			</ResponsiveDialog>
		</div>
	)
}

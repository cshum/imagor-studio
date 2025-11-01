import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { Edit, MoreHorizontal, Plus, Search, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { createUser, deactivateAccount, updateProfile } from '@/api/user-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { ListUsersQuery, User } from '@/generated/graphql'
import { useFormErrors } from '@/hooks/use-form-errors'

interface UsersPageProps {
  loaderData?: ListUsersQuery['users']
}

export function UsersPage({ loaderData }: UsersPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

  // Create translation-aware validation schemas
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

  // Initialize form error handlers
  const { handleFormError: handleCreateError } = useFormErrors<CreateUserFormData>()
  const { handleFormError: handleEditError } = useFormErrors<EditUserFormData>()

  // Use loader data directly
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
      const createUserData = {
        displayName: values.displayName,
        username: values.username,
        password: values.password,
        role: values.role,
      }
      await createUser(createUserData)
      toast.success(t('pages.users.messages.userCreatedSuccess'))
      setIsCreateDialogOpen(false)
      createForm.reset()
      await router.invalidate()
    } catch (err) {
      handleCreateError(
        err,
        createForm.setError,
        {
          username: {
            ALREADY_EXISTS: t('pages.users.messages.usernameAlreadyExists'),
          },
        },
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
        {
          username: {
            ALREADY_EXISTS: t('pages.users.messages.usernameAlreadyExists'),
          },
        },
        t('pages.users.messages.updateUserFailed'),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeactivateUser = async (userId: string, isActive: boolean) => {
    setIsDeactivating(userId)
    try {
      await deactivateAccount(userId)
      const successMessage = isActive
        ? t('pages.users.messages.userDeactivatedSuccess')
        : t('pages.users.messages.userReactivatedSuccess')
      toast.success(successMessage)
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      await router.invalidate()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      const failedMessage = isActive
        ? t('pages.users.messages.deactivateUserFailed')
        : t('pages.users.messages.reactivateUserFailed')
      toast.error(`${failedMessage}: ${errorMessage}`)
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

  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>{t('pages.users.title')}</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className='mr-2 h-4 w-4' />
                  {t('pages.users.createUser')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('pages.users.createNewUser')}</DialogTitle>
                  <DialogDescription>{t('pages.users.createUserDescription')}</DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(handleCreateUser)} className='space-y-4'>
                    <FormField
                      control={createForm.control}
                      name='displayName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('pages.users.placeholders.enterDisplayName')}
                              {...field}
                              disabled={isCreating}
                            />
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
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('pages.users.placeholders.enterUsername')}
                              {...field}
                              disabled={isCreating}
                            />
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              placeholder={t('pages.users.placeholders.enterPassword')}
                              {...field}
                              disabled={isCreating}
                            />
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
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              placeholder={t('pages.users.placeholders.confirmPassword')}
                              {...field}
                              disabled={isCreating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name='role'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              disabled={isCreating}
                              className='border-input bg-background w-full rounded-md border p-2'
                            >
                              <option value='user'>User</option>
                              <option value='admin'>Admin</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => setIsCreateDialogOpen(false)}
                        disabled={isCreating}
                      >
                        Cancel
                      </Button>
                      <ButtonWithLoading type='submit' isLoading={isCreating}>
                        Create User
                      </ButtonWithLoading>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Search */}
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
              <Input
                placeholder={t('pages.users.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>

            {/* Users Table - Desktop */}
            <div className='hidden rounded-lg border md:block'>
              <div className='bg-muted/50 grid grid-cols-5 gap-4 border-b p-4 font-medium'>
                <div>{t('pages.users.tableHeaders.name')}</div>
                <div>{t('pages.users.tableHeaders.username')}</div>
                <div>{t('pages.users.tableHeaders.role')}</div>
                <div>{t('pages.users.tableHeaders.status')}</div>
                <div>{t('pages.users.tableHeaders.actions')}</div>
              </div>

              {!loaderData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='grid grid-cols-5 gap-4 border-b p-4'>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-16' />
                    <Skeleton className='h-4 w-16' />
                    <Skeleton className='h-4 w-8' />
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className='text-muted-foreground p-8 text-center'>{t('pages.users.noUsersFound')}</div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className='grid grid-cols-5 items-center gap-4 border-b p-4'>
                    <div className='font-medium'>{user.displayName}</div>
                    <div className='text-muted-foreground'>{user.username}</div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}
                      >
                        {user.isActive
                          ? t('pages.users.status.active')
                          : t('pages.users.status.inactive')}
                      </span>
                    </div>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className='mr-2 h-4 w-4' />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Users Cards - Mobile */}
            <div className='space-y-4 md:hidden'>
              {!loaderData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='space-y-3 rounded-lg border p-4'>
                    <div className='flex items-start justify-between'>
                      <Skeleton className='h-5 w-32' />
                      <Skeleton className='h-5 w-16' />
                    </div>
                    <Skeleton className='h-4 w-48' />
                    <div className='flex items-center justify-between'>
                      <Skeleton className='h-5 w-12' />
                      <div className='flex gap-2'>
                        <Skeleton className='h-8 w-16' />
                        <Skeleton className='h-8 w-20' />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className='text-muted-foreground rounded-lg border p-8 text-center'>
                  {t('pages.users.noUsersFound')}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className='space-y-3 rounded-lg border p-4'>
                    {/* Header: Name and Status */}
                    <div className='flex items-start justify-between'>
                      <h3 className='text-lg font-medium'>{user.displayName}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}
                      >
                        {user.isActive
                          ? t('pages.users.status.active')
                          : t('pages.users.status.inactive')}
                      </span>
                    </div>

                    {/* Username */}
                    <div className='text-muted-foreground'>{user.username}</div>

                    {/* Role and Actions */}
                    <div className='flex items-center justify-between pt-2'>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}
                      >
                        {user.role}
                      </span>

                      {/* Mobile Action Buttons */}
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openEditDialog(user)}
                          className='px-3 py-2'
                        >
                          <Edit className='mr-1 h-4 w-4' />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Info */}
            <div className='text-muted-foreground text-sm'>
              {t('pages.users.showingUsers', { filtered: filteredUsers.length, total: totalCount })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be applied immediately.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditUser)} className='space-y-4'>
              <FormField
                control={editForm.control}
                name='displayName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter display name' {...field} disabled={isUpdating} />
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
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter username' {...field} disabled={isUpdating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        disabled={isUpdating}
                        className='border-input bg-background w-full rounded-md border p-2'
                      >
                        <option value='user'>User</option>
                        <option value='admin'>Admin</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Deactivate Section - Separate Row */}
              <div className='mt-4 border-t pt-4'>
                <div className='bg-muted/50 flex items-center justify-between rounded-lg p-3'>
                  <div>
                    <h4 className='text-sm font-medium'>
                      {selectedUser?.isActive ? 'Deactivate User' : 'Reactivate User'}
                    </h4>
                    <p className='text-muted-foreground text-xs'>
                      {selectedUser?.isActive
                        ? 'This will prevent the user from logging in'
                        : 'This will allow the user to log in again'}
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant={selectedUser?.isActive ? 'destructive' : 'default'}
                    size='sm'
                    onClick={() => {
                      if (!selectedUser) {
                        return
                      }
                      if (selectedUser.isActive) {
                        // Show confirmation dialog for deactivation
                        setIsConfirmDialogOpen(true)
                      } else {
                        // No confirmation needed for reactivation
                        handleDeactivateUser(selectedUser.id, selectedUser.isActive)
                      }
                    }}
                    disabled={isUpdating || isDeactivating === selectedUser?.id}
                  >
                    {selectedUser?.isActive ? (
                      <>
                        <UserX className='mr-2 h-4 w-4' />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className='mr-2 h-4 w-4' />
                        Reactivate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isUpdating}
                  className='w-full sm:w-auto'
                >
                  Cancel
                </Button>
                <ButtonWithLoading
                  type='submit'
                  isLoading={isUpdating}
                  className='w-full sm:w-auto'
                >
                  Update User
                </ButtonWithLoading>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deactivation */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <strong>{selectedUser?.displayName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <Button
              variant='outline'
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isDeactivating === selectedUser?.id}
              className='w-full sm:w-auto'
            >
              Cancel
            </Button>
            <ButtonWithLoading
              variant='destructive'
              onClick={() => {
                if (selectedUser) {
                  handleDeactivateUser(selectedUser.id, selectedUser.isActive)
                  setIsConfirmDialogOpen(false)
                }
              }}
              isLoading={isDeactivating === selectedUser?.id}
              className='w-full sm:w-auto'
            >
              Deactivate
            </ButtonWithLoading>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

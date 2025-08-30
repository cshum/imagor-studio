import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Plus, Search, MoreHorizontal, Edit, UserX, UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { listUsers, createUser, deactivateAccount, updateProfile } from '@/api/user-api'
import { extractErrorMessage } from '@/lib/error-utils'
import type { ListUsersQuery } from '@/generated/graphql'

interface UsersPageProps {
  loaderData?: ListUsersQuery['users']
}

const createUserSchema = z.object({
  displayName: z
    .string()
    .min(3, 'Display name must be at least 3 characters long')
    .max(100, 'Display name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password must be less than 72 characters'),
  role: z.enum(['user', 'admin']),
})

const editUserSchema = z.object({
  displayName: z
    .string()
    .min(3, 'Display name must be at least 3 characters long')
    .max(100, 'Display name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['user', 'admin']),
})

type CreateUserFormData = z.infer<typeof createUserSchema>
type EditUserFormData = z.infer<typeof editUserSchema>

export function UsersPage({ loaderData }: UsersPageProps) {
  const [users, setUsers] = useState(loaderData?.items || [])
  const [totalCount, setTotalCount] = useState(loaderData?.totalCount || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

  const pageSize = 20

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      role: 'user'
    },
  })

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      displayName: '',
      email: '',
      role: 'user'
    },
  })

  const loadUsers = async (offset = 0) => {
    setIsLoading(true)
    try {
      const result = await listUsers(offset, pageSize)
      setUsers(result.items)
      setTotalCount(result.totalCount)
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      toast.error(`Failed to load users: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (values: CreateUserFormData) => {
    setIsCreating(true)
    try {
      await createUser(values)
      toast.success('User created successfully!')
      setIsCreateDialogOpen(false)
      createForm.reset()
      loadUsers(currentPage * pageSize)
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      
      // Check if it's a validation error that should highlight a field
      if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already')) {
        createForm.setError('email', { message: 'This email is already in use' })
      } else if (errorMessage.toLowerCase().includes('email')) {
        createForm.setError('email', { message: errorMessage })
      } else if (errorMessage.toLowerCase().includes('display name')) {
        createForm.setError('displayName', { message: errorMessage })
      } else {
        // Unexpected error - show toast
        toast.error(`Failed to create user: ${errorMessage}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditUser = async (values: EditUserFormData) => {
    if (!selectedUser) return

    setIsUpdating(true)
    try {
      await updateProfile(
        { displayName: values.displayName, email: values.email },
        selectedUser.id
      )
      toast.success('User updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      loadUsers(currentPage * pageSize)
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      
      // Check if it's a validation error that should highlight a field
      if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already')) {
        editForm.setError('email', { message: 'This email is already in use' })
      } else if (errorMessage.toLowerCase().includes('email')) {
        editForm.setError('email', { message: errorMessage })
      } else if (errorMessage.toLowerCase().includes('display name')) {
        editForm.setError('displayName', { message: errorMessage })
      } else {
        // Unexpected error - show toast
        toast.error(`Failed to update user: ${errorMessage}`)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeactivateUser = async (userId: string, isActive: boolean) => {
    setIsDeactivating(userId)
    try {
      await deactivateAccount(userId)
      toast.success(`User ${isActive ? 'deactivated' : 'reactivated'} successfully!`)
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      loadUsers(currentPage * pageSize)
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      toast.error(`Failed to ${isActive ? 'deactivate' : 'reactivate'} user: ${errorMessage}`)
    } finally {
      setIsDeactivating(null)
    }
  }

  const openEditDialog = (user: any) => {
    setSelectedUser(user)
    editForm.reset({
      displayName: user.displayName,
      email: user.email,
      role: user.role
    })
    setIsEditDialogOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (!loaderData) {
      loadUsers()
    }
  }, [loaderData])

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Users</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className='h-4 w-4 mr-2' />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system. They will be able to log in with the provided credentials.
                  </DialogDescription>
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
                              placeholder='Enter display name'
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
                      name='email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type='email'
                              placeholder='Enter email address'
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
                              placeholder='Enter password'
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
                              className='w-full p-2 border border-input rounded-md bg-background'
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
                      <ButtonWithLoading
                        type='submit'
                        isLoading={isCreating}
                      >
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
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search users by name or email...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>

            {/* Users Table - Desktop */}
            <div className='hidden md:block border rounded-lg'>
              <div className='grid grid-cols-5 gap-4 p-4 font-medium border-b bg-muted/50'>
                <div>Name</div>
                <div>Email</div>
                <div>Role</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='grid grid-cols-5 gap-4 p-4 border-b'>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-16' />
                    <Skeleton className='h-4 w-16' />
                    <Skeleton className='h-4 w-8' />
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className='p-8 text-center text-muted-foreground'>
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className='grid grid-cols-5 gap-4 p-4 border-b items-center'>
                    <div className='font-medium'>{user.displayName}</div>
                    <div className='text-muted-foreground'>{user.email}</div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
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
                            <Edit className='h-4 w-4 mr-2' />
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
            <div className='md:hidden space-y-4'>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='border rounded-lg p-4 space-y-3'>
                    <div className='flex justify-between items-start'>
                      <Skeleton className='h-5 w-32' />
                      <Skeleton className='h-5 w-16' />
                    </div>
                    <Skeleton className='h-4 w-48' />
                    <div className='flex justify-between items-center'>
                      <Skeleton className='h-5 w-12' />
                      <div className='flex gap-2'>
                        <Skeleton className='h-8 w-16' />
                        <Skeleton className='h-8 w-20' />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className='border rounded-lg p-8 text-center text-muted-foreground'>
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className='border rounded-lg p-4 space-y-3'>
                    {/* Header: Name and Status */}
                    <div className='flex justify-between items-start'>
                      <h3 className='font-medium text-lg'>{user.displayName}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    {/* Email */}
                    <div className='text-muted-foreground'>{user.email}</div>
                    
                    {/* Role and Actions */}
                    <div className='flex justify-between items-center pt-2'>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
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
                          <Edit className='h-4 w-4 mr-1' />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Info */}
            <div className='text-sm text-muted-foreground'>
              Showing {filteredUsers.length} of {totalCount} users
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
                      <Input
                        placeholder='Enter display name'
                        {...field}
                        disabled={isUpdating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='Enter email address'
                        {...field}
                        disabled={isUpdating}
                      />
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
                        className='w-full p-2 border border-input rounded-md bg-background'
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
              <div className='border-t pt-4 mt-4'>
                <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
                  <div>
                    <h4 className='text-sm font-medium'>
                      {selectedUser?.isActive ? 'Deactivate User' : 'Reactivate User'}
                    </h4>
                    <p className='text-xs text-muted-foreground'>
                      {selectedUser?.isActive 
                        ? 'This will prevent the user from logging in'
                        : 'This will allow the user to log in again'
                      }
                    </p>
                  </div>
                  <Button 
                    type='button'
                    variant={selectedUser?.isActive ? 'destructive' : 'default'}
                    size='sm'
                    onClick={() => {
                      if (selectedUser?.isActive) {
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
                        <UserX className='h-4 w-4 mr-2' />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className='h-4 w-4 mr-2' />
                        Reactivate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter className='flex flex-col sm:flex-row sm:justify-end gap-2'>
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
          <DialogFooter className='flex flex-col sm:flex-row sm:justify-end gap-2'>
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

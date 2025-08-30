import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import * as z from 'zod'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContentLayout } from '@/layouts/content-layout'
import { initAuth, useAuth } from '@/stores/auth-store'
import { changePassword, updateProfile } from '@/api/user-api'
import { setSystemRegistry } from '@/api/registry-api'
import { extractErrorMessage } from '@/lib/error-utils'

const profileSchema = z.object({
  displayName: z
    .string()
    .min(3, 'Display name must be at least 3 characters long')
    .max(100, 'Display name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(72, 'Password must be less than 72 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function AccountPage() {
  const { authState } = useAuth()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isUpdatingGuestMode, setIsUpdatingGuestMode] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [guestModeError, setGuestModeError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [guestModeSuccess, setGuestModeSuccess] = useState<string | null>(null)
  const [guestModeEnabled, setGuestModeEnabled] = useState(false) // TODO: Get from API
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: authState.profile?.displayName || '',
      email: authState.profile?.email || '',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onProfileSubmit = async (values: ProfileForm) => {
    setIsUpdatingProfile(true)
    setProfileError(null)
    setProfileSuccess(null)

    try {
      await updateProfile({
        displayName: values.displayName,
        email: values.email,
      })
      await initAuth()
      setProfileSuccess('Profile updated successfully!')
    } catch (err) {
      setProfileError(extractErrorMessage(err))
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onPasswordSubmit = async (values: PasswordForm) => {
    setIsUpdatingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(null)

    try {
      await changePassword(values.currentPassword, values.newPassword)
      setPasswordSuccess('Password updated successfully!')
      passwordForm.reset()
      // Close dialog after successful password change
      setTimeout(() => {
        setPasswordDialogOpen(false)
        setPasswordSuccess(null)
      }, 2000)
    } catch (err) {
      setPasswordError(extractErrorMessage(err))
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const onGuestModeToggle = async (enabled: boolean) => {
    setIsUpdatingGuestMode(true)
    setGuestModeError(null)
    setGuestModeSuccess(null)

    try {
      await setSystemRegistry('auth.enableGuestMode', enabled ? 'true' : 'false')
      
      setGuestModeEnabled(enabled)
      setGuestModeSuccess(`Guest mode ${enabled ? 'enabled' : 'disabled'} successfully!`)
    } catch (err) {
      setGuestModeError(extractErrorMessage(err))
    } finally {
      setIsUpdatingGuestMode(false)
    }
  }

  const isAdmin = authState.profile?.role === 'admin'

  return (
    <ContentLayout title='Account Settings'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to='/'>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Account Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='mt-4'>
        <Tabs defaultValue='profile' className='w-full'>
        <TabsList className='grid w-full grid-cols-3 mb-6'>
          <TabsTrigger value='profile'>Profile</TabsTrigger>
          <TabsTrigger value='security'>Security</TabsTrigger>
          {isAdmin && <TabsTrigger value='admin'>Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value='profile' className='space-y-6 mt-0'>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account profile information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className='space-y-4'>
                  <FormField
                    control={profileForm.control}
                    name='displayName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Enter your display name'
                            {...field}
                            disabled={isUpdatingProfile}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type='email'
                            placeholder='Enter your email address'
                            {...field}
                            disabled={isUpdatingProfile}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {profileError && (
                    <div className='text-destructive bg-destructive/10 rounded-md p-3 text-sm'>
                      {profileError}
                    </div>
                  )}

                  {profileSuccess && (
                    <div className='text-green-600 bg-green-50 dark:bg-green-950 rounded-md p-3 text-sm'>
                      {profileSuccess}
                    </div>
                  )}

                  <Button type='submit' disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='security' className='space-y-6 mt-0'>
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and password.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div className='space-y-0.5'>
                  <div className='text-base font-medium'>Password</div>
                  <div className='text-sm text-muted-foreground'>
                    Change your account password
                  </div>
                </div>
                <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant='outline'>Change Password</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className='space-y-4'>
                        <FormField
                          control={passwordForm.control}
                          name='currentPassword'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input
                                  type='password'
                                  placeholder='Enter your current password'
                                  {...field}
                                  disabled={isUpdatingPassword}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name='newPassword'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input
                                  type='password'
                                  placeholder='Enter your new password'
                                  {...field}
                                  disabled={isUpdatingPassword}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name='confirmPassword'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input
                                  type='password'
                                  placeholder='Confirm your new password'
                                  {...field}
                                  disabled={isUpdatingPassword}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {passwordError && (
                          <div className='text-destructive bg-destructive/10 rounded-md p-3 text-sm'>
                            {passwordError}
                          </div>
                        )}

                        {passwordSuccess && (
                          <div className='text-green-600 bg-green-50 dark:bg-green-950 rounded-md p-3 text-sm'>
                            {passwordSuccess}
                          </div>
                        )}

                        <div className='flex justify-end space-x-2'>
                          <Button
                            type='button'
                            variant='outline'
                            onClick={() => setPasswordDialogOpen(false)}
                            disabled={isUpdatingPassword}
                          >
                            Cancel
                          </Button>
                          <Button type='submit' disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value='admin' className='space-y-6 mt-0'>
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings. These options are only available to administrators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <div className='text-base font-medium'>Guest Mode</div>
                      <div className='text-sm text-muted-foreground'>
                        Allow users to browse the gallery without creating an account
                      </div>
                    </div>
                    <Checkbox
                      checked={guestModeEnabled}
                      onCheckedChange={onGuestModeToggle}
                      disabled={isUpdatingGuestMode}
                    />
                  </div>

                  {guestModeError && (
                    <div className='text-destructive bg-destructive/10 rounded-md p-3 text-sm'>
                      {guestModeError}
                    </div>
                  )}

                  {guestModeSuccess && (
                    <div className='text-green-600 bg-green-50 dark:bg-green-950 rounded-md p-3 text-sm'>
                      {guestModeSuccess}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        </Tabs>
      </div>
    </ContentLayout>
  )
}

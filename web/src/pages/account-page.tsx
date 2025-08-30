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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ContentLayout } from '@/layouts/content-layout'
import { useAuth } from '@/stores/auth-store'
import { changePassword, updateProfile } from '@/api/user-api'

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
      setProfileSuccess('Profile updated successfully!')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile')
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
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const onGuestModeToggle = async (enabled: boolean) => {
    setIsUpdatingGuestMode(true)
    setGuestModeError(null)
    setGuestModeSuccess(null)

    try {
      // TODO: Implement guest mode toggle API call
      console.log('Toggling guest mode:', enabled)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setGuestModeEnabled(enabled)
      setGuestModeSuccess(`Guest mode ${enabled ? 'enabled' : 'disabled'} successfully!`)
    } catch (err) {
      setGuestModeError(err instanceof Error ? err.message : 'Failed to update guest mode setting')
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

      <div className='space-y-6'>
        {/* Profile Settings */}
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

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password. You'll need to enter your current password.
            </CardDescription>
          </CardHeader>
          <CardContent>
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

                <Button type='submit' disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Updating...' : 'Change Password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Admin Settings */}
        {isAdmin && (
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
        )}
      </div>
    </ContentLayout>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ChevronRight,
  Database,
  FolderOpen,
  LogOut,
  MoreVertical,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { deleteSpace, updateSpace } from '@/api/org-api'
import { ModeToggle } from '@/components/mode-toggle.tsx'
import { Button } from '@/components/ui/button'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarWrapper,
} from '@/components/ui/sidebar'
import { useBrand } from '@/hooks/use-brand'
import { useAuth } from '@/stores/auth-store'
import type { GetSpaceQuery } from '@/generated/graphql'

export type SpaceSettingsData = NonNullable<GetSpaceQuery['space']>

interface SpaceSettingsPageProps {
  loaderData: SpaceSettingsData
}

// ── Form schemas ─────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1).max(255),
  customDomain: z.string().optional(),
})
type GeneralFormData = z.infer<typeof generalSchema>

const storageSchema = z.object({
  endpoint: z.string().optional(),
  prefix: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretKey: z.string().optional(),
})
type StorageFormData = z.infer<typeof storageSchema>

const imageProcessingSchema = z.object({
  imagorSecret: z.string().optional(),
  signerAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  signerTruncate: z.number().int().min(0).optional(),
})
type ImageProcessingFormData = z.infer<typeof imageProcessingSchema>

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const

function avatarColor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function spaceInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ── Section types ─────────────────────────────────────────────────────────────

type SectionId = 'general' | 'storage' | 'imageProcessing' | 'dangerZone'

// ── Page component ────────────────────────────────────────────────────────────

export function SpaceSettingsPage({ loaderData: space }: SpaceSettingsPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const { title: appTitle } = useBrand()
  const { authState, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<SectionId>('general')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isByob = space.storageType === 's3'
  const color = avatarColor(space.key)
  const initials = spaceInitials(space.name)

  const getUserDisplayName = () =>
    authState.profile?.displayName ||
    authState.profile?.username ||
    t('common.status.user')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  // -- General form ----------------------------------------------------------
  const generalForm = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: space.name ?? '',
      customDomain: space.customDomain ?? '',
    },
  })
  const [isSavingGeneral, setIsSavingGeneral] = useState(false)

  const handleSaveGeneral = async (values: GeneralFormData) => {
    setIsSavingGeneral(true)
    try {
      await updateSpace({
        key: space.key,
        input: {
          key: space.key,
          name: values.name,
          customDomain: values.customDomain ?? null,
          storageType: null,
          bucket: null,
          region: null,
          endpoint: null,
          prefix: null,
          accessKeyId: null,
          secretKey: null,
          usePathStyle: null,
          isShared: null,
          signerAlgorithm: null,
          signerTruncate: null,
          imagorSecret: null,
        },
      })
      toast.success(t('pages.spaceSettings.general.saved'))
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingGeneral(false)
    }
  }

  // -- BYOB Storage form -----------------------------------------------------
  const storageForm = useForm<StorageFormData>({
    resolver: zodResolver(storageSchema),
    defaultValues: {
      endpoint: space.endpoint ?? '',
      prefix: space.prefix ?? '',
      accessKeyId: '',
      secretKey: '',
    },
  })
  const [isSavingStorage, setIsSavingStorage] = useState(false)

  const handleSaveStorage = async (values: StorageFormData) => {
    setIsSavingStorage(true)
    try {
      await updateSpace({
        key: space.key,
        input: {
          key: space.key,
          name: space.name,
          storageType: null,
          bucket: null,
          region: null,
          endpoint: values.endpoint ?? null,
          prefix: values.prefix ?? null,
          accessKeyId: values.accessKeyId ?? null,
          secretKey: values.secretKey || null,
          usePathStyle: null,
          customDomain: null,
          isShared: null,
          signerAlgorithm: null,
          signerTruncate: null,
          imagorSecret: null,
        },
      })
      toast.success(t('pages.spaceSettings.storage.saved'))
      storageForm.setValue('accessKeyId', '')
      storageForm.setValue('secretKey', '')
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingStorage(false)
    }
  }

  // -- Image Processing form -------------------------------------------------
  const imageProcessingForm = useForm<ImageProcessingFormData>({
    resolver: zodResolver(imageProcessingSchema),
    defaultValues: {
      imagorSecret: '',
      signerAlgorithm: (space.signerAlgorithm as 'sha1' | 'sha256' | 'sha512') || 'sha256',
      signerTruncate: space.signerTruncate ?? 0,
    },
  })
  const [isSavingImageProcessing, setIsSavingImageProcessing] = useState(false)

  const handleSaveImageProcessing = async (values: ImageProcessingFormData) => {
    setIsSavingImageProcessing(true)
    try {
      await updateSpace({
        key: space.key,
        input: {
          key: space.key,
          name: space.name,
          storageType: null,
          bucket: null,
          region: null,
          endpoint: null,
          prefix: null,
          accessKeyId: null,
          secretKey: null,
          usePathStyle: null,
          customDomain: null,
          isShared: null,
          signerAlgorithm: values.signerAlgorithm ?? null,
          signerTruncate: values.signerTruncate ?? null,
          imagorSecret: values.imagorSecret || null,
        },
      })
      toast.success(t('pages.spaceSettings.imageProcessing.saved'))
      imageProcessingForm.setValue('imagorSecret', '')
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingImageProcessing(false)
    }
  }

  // -- Delete ----------------------------------------------------------------
  const handleDeleteSpace = async () => {
    setIsDeleting(true)
    try {
      await deleteSpace({ key: space.key })
      toast.success(t('pages.spaces.messages.spaceDeletedSuccess'))
      await navigate({ to: '/account/spaces' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  // ── Nav items ──────────────────────────────────────────────────────────────

  const navItems: Array<{
    id: SectionId
    icon: React.ReactNode
    label: string
    danger?: boolean
  }> = [
    {
      id: 'general',
      icon: <Settings className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.general'),
    },
    {
      id: 'storage',
      icon: <Database className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.storage'),
    },
    {
      id: 'imageProcessing',
      icon: <ShieldCheck className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.imageProcessing'),
    },
    {
      id: 'dangerZone',
      icon: <AlertTriangle className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.dangerZone'),
      danger: true,
    },
  ]

  return (
    <SidebarWrapper>
      {/* ── Space settings sidebar ────────────────────────────────────── */}
      <Sidebar collapsible='offcanvas' className='top-14'>
        {/* Space identity */}
        <SidebarHeader className='border-b px-4 py-3'>
          <div className='flex items-center gap-3'>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${color}`}
            >
              {initials}
            </div>
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold leading-tight'>{space.name}</p>
              <p className='text-muted-foreground truncate font-mono text-xs'>{space.key}</p>
            </div>
          </div>
        </SidebarHeader>

        {/* Nav */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => setActiveSection(item.id)}
                      tooltip={item.label}
                      className={
                        item.danger
                          ? 'text-destructive/80 hover:bg-destructive/10 hover:text-destructive data-[active=true]:bg-destructive/10 data-[active=true]:text-destructive data-[active=true]:hover:bg-destructive/10 data-[active=true]:hover:text-destructive'
                          : 'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground'
                      }
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer: open gallery link */}
        <SidebarFooter className='border-t p-3'>
          <SidebarMenuButton asChild tooltip={t('pages.spaceSettings.openGallery')}>
            <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
              <FolderOpen className='h-4 w-4' />
              <span>{t('pages.spaceSettings.openGallery')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <SidebarInset>
        {/* Fixed full-width header */}
        <header className='bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 z-50 w-full border-b backdrop-blur'>
          <div className='mx-auto px-4 py-2'>
            <div className='flex h-10 items-center justify-between'>
              {/* Left: trigger + breadcrumb */}
              <div className='flex min-w-0 items-center space-x-1 sm:space-x-2'>
                <SidebarTrigger className='-ml-2 h-10 w-10 shrink-0' />
                <Link
                  to='/'
                  className='hidden text-base font-semibold transition-opacity hover:opacity-80 sm:block'
                >
                  {appTitle}
                </Link>
                <span className='text-muted-foreground mx-1 hidden sm:block'>|</span>
                <Link
                  to='/account/spaces'
                  className='text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:block'
                >
                  {t('layouts.account.title')}
                </Link>
                <ChevronRight className='text-muted-foreground hidden h-3.5 w-3.5 shrink-0 sm:block' />
                <span className='hidden max-w-[180px] truncate text-sm font-medium sm:block'>
                  {space.name}
                </span>
              </div>

              {/* Right: mode toggle + user menu */}
              <div className='flex shrink-0 items-center space-x-1'>
                <ModeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon' className='h-10 w-10'>
                      <MoreVertical className='h-4 w-4' />
                      <span className='sr-only'>{t('common.buttons.more')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-56'>
                    <DropdownMenuLabel className='font-normal'>
                      <div className='flex flex-col space-y-1'>
                        <p className='text-sm font-medium leading-none'>{getUserDisplayName()}</p>
                        {authState.profile?.role && (
                          <p className='text-muted-foreground text-xs leading-none capitalize'>
                            {authState.profile.role}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className='cursor-pointer'>
                      <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                      {t('common.navigation.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className='relative min-h-screen pt-14'>
          <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
            {/* ── General ───────────────────────────────────────────────── */}
            {activeSection === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('pages.spaceSettings.sections.general')}</CardTitle>
                  <CardDescription>
                    {t('pages.spaceSettings.general.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...generalForm}>
                    <form
                      onSubmit={generalForm.handleSubmit(handleSaveGeneral)}
                      className='space-y-4'
                    >
                      <FormField
                        control={generalForm.control}
                        name='name'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('pages.spaceSettings.general.name')}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isSavingGeneral} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name='customDomain'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('pages.spaceSettings.general.customDomain')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder='images.example.com'
                                {...field}
                                disabled={isSavingGeneral}
                              />
                            </FormControl>
                            <FormDescription>
                              {t('pages.spaceSettings.general.customDomainDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className='flex justify-end'>
                        <ButtonWithLoading type='submit' isLoading={isSavingGeneral}>
                          {t('common.buttons.save')}
                        </ButtonWithLoading>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* ── Storage ───────────────────────────────────────────────── */}
            {activeSection === 'storage' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('pages.spaceSettings.sections.storage')}</CardTitle>
                  <CardDescription>
                    {t('pages.spaceSettings.storage.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isByob ? (
                    <div className='bg-muted/50 flex items-start gap-3 rounded-lg border p-4'>
                      <Database className='text-muted-foreground mt-0.5 h-5 w-5 shrink-0' />
                      <div className='space-y-1'>
                        <p className='text-sm font-medium'>
                          {t('pages.spaceSettings.storage.managedTitle')}
                        </p>
                        <p className='text-muted-foreground text-sm'>
                          {t('pages.spaceSettings.storage.managedDescription')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className='bg-muted/30 mb-4 rounded-lg border p-3'>
                        <p className='text-sm'>
                          <span className='text-muted-foreground font-medium'>
                            {t('pages.spaceSettings.storage.bucket')}:
                          </span>{' '}
                          <span className='font-mono text-sm'>{space.bucket}</span>
                          {space.region && (
                            <>
                              <span className='text-muted-foreground mx-2'>·</span>
                              <span className='text-muted-foreground font-medium'>
                                {t('pages.spaceSettings.storage.region')}:
                              </span>{' '}
                              <span className='font-mono text-sm'>{space.region}</span>
                            </>
                          )}
                        </p>
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {t('pages.spaceSettings.storage.bucketLocked')}
                        </p>
                      </div>
                      <Form {...storageForm}>
                        <form
                          onSubmit={storageForm.handleSubmit(handleSaveStorage)}
                          className='space-y-4'
                        >
                          <FormField
                            control={storageForm.control}
                            name='endpoint'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t('pages.spaceSettings.storage.endpoint')}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='https://s3.amazonaws.com'
                                    {...field}
                                    disabled={isSavingStorage}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {t('pages.spaceSettings.storage.endpointDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={storageForm.control}
                            name='prefix'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t('pages.spaceSettings.storage.prefix')}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='media/'
                                    {...field}
                                    disabled={isSavingStorage}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {t('pages.spaceSettings.storage.prefixDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className='grid grid-cols-2 gap-4'>
                            <FormField
                              control={storageForm.control}
                              name='accessKeyId'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {t('pages.spaceSettings.storage.accessKeyId')}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={t(
                                        'pages.spaceSettings.placeholders.unchanged',
                                      )}
                                      {...field}
                                      disabled={isSavingStorage}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={storageForm.control}
                              name='secretKey'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {t('pages.spaceSettings.storage.secretKey')}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type='password'
                                      placeholder={t(
                                        'pages.spaceSettings.placeholders.unchanged',
                                      )}
                                      {...field}
                                      disabled={isSavingStorage}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className='flex justify-end'>
                            <ButtonWithLoading type='submit' isLoading={isSavingStorage}>
                              {t('common.buttons.save')}
                            </ButtonWithLoading>
                          </div>
                        </form>
                      </Form>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Image Processing ──────────────────────────────────────── */}
            {activeSection === 'imageProcessing' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('pages.spaceSettings.sections.imageProcessing')}</CardTitle>
                  <CardDescription>
                    {t('pages.spaceSettings.imageProcessing.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...imageProcessingForm}>
                    <form
                      onSubmit={imageProcessingForm.handleSubmit(handleSaveImageProcessing)}
                      className='space-y-4'
                    >
                      <FormField
                        control={imageProcessingForm.control}
                        name='imagorSecret'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('pages.spaceSettings.imageProcessing.imagorSecret')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type='password'
                                placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                                {...field}
                                disabled={isSavingImageProcessing}
                              />
                            </FormControl>
                            <FormDescription>
                              {t(
                                'pages.spaceSettings.imageProcessing.imagorSecretDescription',
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className='grid grid-cols-2 gap-4'>
                        <FormField
                          control={imageProcessingForm.control}
                          name='signerAlgorithm'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('pages.spaceSettings.imageProcessing.signerAlgorithm')}
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? 'sha256'}
                                disabled={isSavingImageProcessing}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value='sha1'>SHA-1</SelectItem>
                                  <SelectItem value='sha256'>SHA-256</SelectItem>
                                  <SelectItem value='sha512'>SHA-512</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={imageProcessingForm.control}
                          name='signerTruncate'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('pages.spaceSettings.imageProcessing.signerTruncate')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  min={0}
                                  placeholder='0'
                                  value={field.value ?? 0}
                                  onChange={(e) =>
                                    field.onChange(
                                      isNaN(e.target.valueAsNumber)
                                        ? 0
                                        : e.target.valueAsNumber,
                                    )
                                  }
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  disabled={isSavingImageProcessing}
                                />
                              </FormControl>
                              <FormDescription>
                                {t(
                                  'pages.spaceSettings.imageProcessing.signerTruncateDescription',
                                )}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className='flex justify-end'>
                        <ButtonWithLoading type='submit' isLoading={isSavingImageProcessing}>
                          {t('common.buttons.save')}
                        </ButtonWithLoading>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* ── Danger Zone ───────────────────────────────────────────── */}
            {activeSection === 'dangerZone' && (
              <Card className='border-destructive/50'>
                <CardHeader>
                  <CardTitle className='text-destructive flex items-center gap-2'>
                    <AlertTriangle className='h-5 w-5' />
                    {t('pages.spaceSettings.sections.dangerZone')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center justify-between rounded-lg border p-4'>
                    <div>
                      <p className='font-medium'>
                        {t('pages.spaceSettings.danger.deleteTitle')}
                      </p>
                      <p className='text-muted-foreground text-sm'>
                        {t('pages.spaceSettings.danger.deleteDescription')}
                      </p>
                    </div>
                    <Button variant='destructive' onClick={() => setIsDeleteDialogOpen(true)}>
                      {t('pages.spaceSettings.danger.deleteButton')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </SidebarInset>

      {/* Delete confirmation dialog */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.spaces.deleteSpace')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.spaces.deleteSpaceDescription')}{' '}
            <strong className='text-foreground'>{space.key}</strong>?
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setIsDeleteDialogOpen(false)}
            disabled={isDeleting}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            onClick={handleDeleteSpace}
            isLoading={isDeleting}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.delete')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </SidebarWrapper>
  )
}

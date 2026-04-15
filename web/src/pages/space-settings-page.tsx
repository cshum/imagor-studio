import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Database,
  FolderOpen,
  Images,
  LogOut,
  MoreVertical,
  Settings,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import {
  addOrgMember,
  deleteSpace,
  getSpaceRegistry,
  listOrgMembers,
  removeOrgMember,
  setSpaceRegistryObject,
  updateOrgMemberRole,
  updateSpace,
  type OrgMemberItem,
} from '@/api/org-api'
import { ModeToggle } from '@/components/mode-toggle.tsx'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
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
import { SettingRow } from '@/components/ui/setting-row'
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
import type { GetSpaceQuery } from '@/generated/graphql'
import { useBrand } from '@/hooks/use-brand'
import { getLanguageCodes, getLanguageLabels } from '@/i18n'
import { useAuth } from '@/stores/auth-store'

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

// Merged storage + URL-signing config form
const configSchema = z.object({
  endpoint: z.string().optional(),
  prefix: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretKey: z.string().optional(),
  imagorSecret: z.string().optional(),
  signerAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  signerTruncate: z.number().int().min(0).optional(),
})
type ConfigFormData = z.infer<typeof configSchema>

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

type SectionId = 'general' | 'storage' | 'gallery' | 'members' | 'dangerZone'

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
  const [galleryRegistry, setGalleryRegistry] = useState<Record<string, string>>({})

  useEffect(() => {
    getSpaceRegistry(space.key)
      .then((entries) => {
        const map: Record<string, string> = {}
        entries.forEach((e) => {
          map[e.key] = e.value
        })
        setGalleryRegistry(map)
      })
      .catch(() => {
        // silently ignore — fall back to empty initial values
      })
  }, [space.key])

  const isByob = space.storageType === 's3'
  const color = avatarColor(space.key)
  const initials = spaceInitials(space.name)

  const getUserDisplayName = () =>
    authState.profile?.displayName || authState.profile?.username || t('common.status.user')

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

  // -- Storage & Security config form ----------------------------------------
  const configForm = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      endpoint: space.endpoint ?? '',
      prefix: space.prefix ?? '',
      accessKeyId: '',
      secretKey: '',
      imagorSecret: '',
      signerAlgorithm: (space.signerAlgorithm as 'sha1' | 'sha256' | 'sha512') || 'sha256',
      signerTruncate: space.signerTruncate ?? 0,
    },
  })
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  const handleSaveConfig = async (values: ConfigFormData) => {
    setIsSavingConfig(true)
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
          signerAlgorithm: values.signerAlgorithm ?? null,
          signerTruncate: values.signerTruncate ?? null,
          imagorSecret: values.imagorSecret || null,
        },
      })
      toast.success(t('pages.spaceSettings.storage.saved'))
      configForm.setValue('accessKeyId', '')
      configForm.setValue('secretKey', '')
      configForm.setValue('imagorSecret', '')
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingConfig(false)
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
      id: 'gallery',
      icon: <Images className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.gallery'),
    },
    {
      id: 'members',
      icon: <Users className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.members'),
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
              <p className='truncate text-sm leading-tight font-semibold'>{space.name}</p>
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

        {/* Footer: back + open gallery */}
        <SidebarFooter className='space-y-1 border-t p-3'>
          <SidebarMenuButton asChild tooltip={t('pages.spaceSettings.backToSpaces')}>
            <Link to='/account/spaces'>
              <ArrowLeft className='h-4 w-4' />
              <span>{t('pages.spaceSettings.backToSpaces')}</span>
            </Link>
          </SidebarMenuButton>
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
                        <p className='text-sm leading-none font-medium'>{getUserDisplayName()}</p>
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
                  <CardDescription>{t('pages.spaceSettings.general.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...generalForm}>
                    <form onSubmit={generalForm.handleSubmit(handleSaveGeneral)}>
                      <FormField
                        control={generalForm.control}
                        name='name'
                        render={({ field }) => (
                          <FormItem>
                            <SettingRow label={t('pages.spaceSettings.general.name')}>
                              <FormControl>
                                <Input {...field} disabled={isSavingGeneral} />
                              </FormControl>
                              <FormMessage className='mt-1.5' />
                            </SettingRow>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name='customDomain'
                        render={({ field }) => (
                          <FormItem>
                            <SettingRow
                              label={t('pages.spaceSettings.general.customDomain')}
                              description={t('pages.spaceSettings.general.customDomainDescription')}
                              last
                            >
                              <FormControl>
                                <Input
                                  placeholder='images.example.com'
                                  {...field}
                                  disabled={isSavingGeneral}
                                />
                              </FormControl>
                              <FormMessage className='mt-1.5' />
                            </SettingRow>
                          </FormItem>
                        )}
                      />
                      <div className='mt-2 flex justify-end pt-2'>
                        <ButtonWithLoading type='submit' isLoading={isSavingGeneral}>
                          {t('common.buttons.save')}
                        </ButtonWithLoading>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
            {activeSection === 'general' && (
              <div className='mt-4'>
                <BrandingSettingsSection spaceKey={space.key} initialValues={galleryRegistry} />
              </div>
            )}

            {/* ── Storage & Security ────────────────────────────────────── */}
            {activeSection === 'storage' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('pages.spaceSettings.sections.storage')}</CardTitle>
                  <CardDescription>{t('pages.spaceSettings.storage.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Managed storage info banner */}
                  {!isByob && (
                    <div className='bg-muted/50 mb-4 flex items-start gap-3 rounded-lg border p-4'>
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
                  )}

                  {/* BYOB: bucket/region readonly banner */}
                  {isByob && (
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
                  )}

                  <Form {...configForm}>
                    <form onSubmit={configForm.handleSubmit(handleSaveConfig)}>
                      {/* BYOB-only: storage credentials */}
                      {isByob && (
                        <>
                          <FormField
                            control={configForm.control}
                            name='prefix'
                            render={({ field }) => (
                              <FormItem>
                                <SettingRow
                                  label={t('pages.spaceSettings.storage.prefix')}
                                  description={t('pages.spaceSettings.storage.prefixDescription')}
                                >
                                  <FormControl>
                                    <Input
                                      placeholder='media/'
                                      {...field}
                                      disabled={isSavingConfig}
                                    />
                                  </FormControl>
                                  <FormMessage className='mt-1.5' />
                                </SettingRow>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={configForm.control}
                            name='endpoint'
                            render={({ field }) => (
                              <FormItem>
                                <SettingRow
                                  label={t('pages.spaceSettings.storage.endpoint')}
                                  description={t('pages.spaceSettings.storage.endpointDescription')}
                                >
                                  <FormControl>
                                    <Input
                                      placeholder='https://s3.amazonaws.com'
                                      {...field}
                                      disabled={isSavingConfig}
                                    />
                                  </FormControl>
                                  <FormMessage className='mt-1.5' />
                                </SettingRow>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={configForm.control}
                            name='accessKeyId'
                            render={({ field }) => (
                              <FormItem>
                                <SettingRow
                                  label={t('pages.spaceSettings.storage.accessKeyId')}
                                  description={t(
                                    'pages.spaceSettings.storage.accessKeyIdDescription',
                                  )}
                                >
                                  <FormControl>
                                    <Input
                                      placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                                      {...field}
                                      disabled={isSavingConfig}
                                    />
                                  </FormControl>
                                  <FormMessage className='mt-1.5' />
                                </SettingRow>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={configForm.control}
                            name='secretKey'
                            render={({ field }) => (
                              <FormItem>
                                <SettingRow
                                  label={t('pages.spaceSettings.storage.secretKey')}
                                  description={t('pages.spaceSettings.storage.secretKeyDescription')}
                                >
                                  <FormControl>
                                    <Input
                                      type='password'
                                      placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                                      {...field}
                                      disabled={isSavingConfig}
                                    />
                                  </FormControl>
                                  <FormMessage className='mt-1.5' />
                                </SettingRow>
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      {/* URL Signing sub-section */}
                      <div className={isByob ? 'mb-1 border-t pt-5' : 'mb-1'}>
                        <p className='text-muted-foreground text-xs font-semibold uppercase tracking-wide'>
                          {t('pages.spaceSettings.storage.urlSigning')}
                        </p>
                        <p className='text-muted-foreground mt-1 text-sm'>
                          {t('pages.spaceSettings.storage.urlSigningDescription')}
                        </p>
                      </div>

                      <FormField
                        control={configForm.control}
                        name='imagorSecret'
                        render={({ field }) => (
                          <FormItem>
                            <SettingRow
                              label={t('pages.spaceSettings.storage.imagorSecret')}
                              description={t('pages.spaceSettings.storage.imagorSecretDescription')}
                            >
                              <FormControl>
                                <Input
                                  type='password'
                                  placeholder={t('pages.spaceSettings.placeholders.unchanged')}
                                  {...field}
                                  disabled={isSavingConfig}
                                />
                              </FormControl>
                              <FormMessage className='mt-1.5' />
                            </SettingRow>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={configForm.control}
                        name='signerAlgorithm'
                        render={({ field }) => (
                          <FormItem>
                            <SettingRow
                              label={t('pages.spaceSettings.storage.signerAlgorithm')}
                              description={t(
                                'pages.spaceSettings.storage.signerAlgorithmDescription',
                              )}
                            >
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? 'sha256'}
                                disabled={isSavingConfig}
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
                              <FormMessage className='mt-1.5' />
                            </SettingRow>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={configForm.control}
                        name='signerTruncate'
                        render={({ field }) => (
                          <FormItem>
                            <SettingRow
                              label={t('pages.spaceSettings.storage.signerTruncate')}
                              description={t(
                                'pages.spaceSettings.storage.signerTruncateDescription',
                              )}
                              last
                            >
                              <FormControl>
                                <Input
                                  type='number'
                                  min={0}
                                  placeholder='0'
                                  value={field.value ?? 0}
                                  onChange={(e) =>
                                    field.onChange(
                                      isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber,
                                    )
                                  }
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  disabled={isSavingConfig}
                                />
                              </FormControl>
                              <FormMessage className='mt-1.5' />
                            </SettingRow>
                          </FormItem>
                        )}
                      />

                      <div className='mt-2 flex justify-end pt-2'>
                        <ButtonWithLoading type='submit' isLoading={isSavingConfig}>
                          {t('common.buttons.save')}
                        </ButtonWithLoading>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* ── Gallery settings ──────────────────────────────────────── */}
            {activeSection === 'gallery' && (
              <GallerySettingsSection spaceKey={space.key} initialValues={galleryRegistry} />
            )}

            {/* ── Members ───────────────────────────────────────────────── */}
            {activeSection === 'members' && <MembersSection />}

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
                      <p className='font-medium'>{t('pages.spaceSettings.danger.deleteTitle')}</p>
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

// ── Gallery settings sub-component ───────────────────────────────────────────

interface GallerySettingsSectionProps {
  spaceKey: string
  initialValues: Record<string, string>
}

function GallerySettingsSection({ spaceKey, initialValues }: GallerySettingsSectionProps) {
  const { t } = useTranslation()

  const GALLERY_SETTINGS: SystemSetting[] = [
    {
      key: 'config.app_default_language',
      type: 'select',
      label: t('pages.admin.systemSettings.fields.defaultLanguage.label'),
      description: t('pages.admin.systemSettings.fields.defaultLanguage.description'),
      defaultValue: 'en',
      options: getLanguageCodes(),
      optionLabels: getLanguageLabels(),
    },
    {
      key: 'config.app_home_title',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.homeTitle.label'),
      description: t('pages.admin.systemSettings.fields.homeTitle.description'),
      defaultValue: 'Home',
    },
    {
      key: 'config.allow_guest_mode',
      type: 'boolean',
      label: t('pages.admin.systemSettings.fields.guestMode.label'),
      description: t('pages.admin.systemSettings.fields.guestMode.description'),
      defaultValue: false,
    },
    {
      key: 'config.app_default_sort_by',
      type: 'dual-select',
      label: t('pages.admin.systemSettings.fields.defaultSorting.label'),
      description: t('pages.admin.systemSettings.fields.defaultSorting.description'),
      defaultValue: 'MODIFIED_TIME',
      options: ['NAME', 'MODIFIED_TIME'],
      optionLabels: {
        NAME: t('pages.admin.systemSettings.fields.defaultSorting.options.name'),
        MODIFIED_TIME: t('pages.admin.systemSettings.fields.defaultSorting.options.modifiedTime'),
      },
      primaryLabel: t('pages.admin.systemSettings.fields.defaultSorting.sortBy'),
      secondaryKey: 'config.app_default_sort_order',
      secondaryDefaultValue: 'DESC',
      secondaryOptions: ['ASC', 'DESC'],
      secondaryOptionLabels: {
        ASC: t('pages.admin.systemSettings.fields.defaultSorting.options.ascending'),
        DESC: t('pages.admin.systemSettings.fields.defaultSorting.options.descending'),
      },
      secondaryLabel: t('pages.admin.systemSettings.fields.defaultSorting.order'),
    },
    {
      key: 'config.app_show_file_names',
      type: 'boolean',
      label: t('pages.admin.systemSettings.fields.showFileNames.label'),
      description: t('pages.admin.systemSettings.fields.showFileNames.description'),
      defaultValue: false,
    },
    {
      key: 'config.app_image_extensions',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.imageExtensions.label'),
      description: t('pages.admin.systemSettings.fields.imageExtensions.description'),
      defaultValue:
        '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif,.cr2,.raf,.orf,.rw2,.x3f,.cr3,.dng,.nef,.arw,.pef,.raw,.nrw,.srw,.erf,.mrw,.dcr,.kdc,.3fr,.mef,.iiq,.rwl,.sr2,.srf,.crw',
    },
    {
      key: 'config.app_video_extensions',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.videoExtensions.label'),
      description: t('pages.admin.systemSettings.fields.videoExtensions.description'),
      defaultValue: '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg',
    },
    {
      key: 'config.app_video_thumbnail_position',
      type: 'select',
      label: t('pages.admin.systemSettings.fields.videoThumbnailPosition.label'),
      description: t('pages.admin.systemSettings.fields.videoThumbnailPosition.description'),
      defaultValue: 'first_frame',
      options: ['first_frame', 'seek_1s', 'seek_3s', 'seek_5s', 'seek_10pct', 'seek_25pct'],
      optionLabels: {
        first_frame: t(
          'pages.admin.systemSettings.fields.videoThumbnailPosition.options.firstFrame',
        ),
        seek_1s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek1s'),
        seek_3s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek3s'),
        seek_5s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek5s'),
        seek_10pct: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek10pct'),
        seek_25pct: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek25pct'),
      },
    },
    {
      key: 'config.app_show_hidden',
      type: 'boolean',
      label: t('pages.admin.systemSettings.fields.showHidden.label'),
      description: t('pages.admin.systemSettings.fields.showHidden.description'),
      defaultValue: false,
    },
  ]

  const handleSave = async (changedValues: Record<string, string>) => {
    await setSpaceRegistryObject(spaceKey, changedValues)
  }

  return (
    <SystemSettingsForm
      title={t('pages.spaceSettings.sections.gallery')}
      description={t('pages.spaceSettings.gallery.description')}
      settings={GALLERY_SETTINGS}
      initialValues={initialValues}
      saveCallback={handleSave}
    />
  )
}

// ── Branding settings sub-component ──────────────────────────────────────────

interface BrandingSettingsSectionProps {
  spaceKey: string
  initialValues: Record<string, string>
}

function BrandingSettingsSection({ spaceKey, initialValues }: BrandingSettingsSectionProps) {
  const { t } = useTranslation()

  const BRANDING_SETTINGS: SystemSetting[] = [
    {
      key: 'config.app_title',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.appTitle.label'),
      description: t('pages.admin.systemSettings.fields.appTitle.description'),
      defaultValue: 'Imagor Studio',
    },
    {
      key: 'config.app_url',
      type: 'text',
      label: t('pages.admin.systemSettings.fields.appUrl.label'),
      description: t('pages.admin.systemSettings.fields.appUrl.description'),
      defaultValue: 'https://imagor.net',
    },
  ]

  const handleSave = async (changedValues: Record<string, string>) => {
    await setSpaceRegistryObject(spaceKey, changedValues)
  }

  return (
    <SystemSettingsForm
      title={t('pages.spaceSettings.branding.title')}
      description={t('pages.spaceSettings.branding.description')}
      settings={BRANDING_SETTINGS}
      initialValues={initialValues}
      saveCallback={handleSave}
    />
  )
}

// ── Members section sub-component ────────────────────────────────────────────

const ROLE_OPTIONS = ['owner', 'admin', 'member'] as const

function MembersSection() {
  const { t } = useTranslation()
  const [members, setMembers] = useState<OrgMemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addUsername, setAddUsername] = useState('')
  const [addRole, setAddRole] = useState<string>('member')
  const [isAdding, setIsAdding] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      setMembers(await listOrgMembers())
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleAdd = async () => {
    if (!addUsername.trim()) return
    setIsAdding(true)
    try {
      await addOrgMember({ username: addUsername.trim(), role: addRole })
      toast.success(t('pages.spaceSettings.members.addSuccess'))
      setAddUsername('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsAdding(false)
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateOrgMemberRole({ userId, role })
      toast.success(t('pages.spaceSettings.members.roleUpdated'))
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRemove = async () => {
    if (!pendingRemoveId) return
    setIsRemoving(true)
    try {
      await removeOrgMember({ userId: pendingRemoveId })
      toast.success(t('pages.spaceSettings.members.removeSuccess'))
      setPendingRemoveId(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRemoving(false)
    }
  }

  const pendingMember = members.find((m) => m.userId === pendingRemoveId)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.spaceSettings.sections.members')}</CardTitle>
          <CardDescription>{t('pages.spaceSettings.members.description')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Add member row */}
          <div className='flex items-end gap-3'>
            <div className='flex-1'>
              <label className='mb-1 block text-sm font-medium'>
                {t('pages.spaceSettings.members.addLabel')}
              </label>
              <Input
                placeholder={t('pages.spaceSettings.members.usernamePlaceholder')}
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                disabled={isAdding}
              />
            </div>
            <div className='w-36'>
              <label className='mb-1 block text-sm font-medium'>
                {t('pages.spaceSettings.members.roleLabel')}
              </label>
              <Select value={addRole} onValueChange={setAddRole} disabled={isAdding}>
                <SelectTrigger>
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
            <ButtonWithLoading
              onClick={handleAdd}
              isLoading={isAdding}
              disabled={!addUsername.trim()}
            >
              {t('pages.spaceSettings.members.addButton')}
            </ButtonWithLoading>
          </div>

          {/* Member list */}
          {isLoading ? (
            <p className='text-muted-foreground text-sm'>{t('common.status.loading')}</p>
          ) : members.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              {t('pages.spaceSettings.members.empty')}
            </p>
          ) : (
            <div className='divide-y rounded-lg border'>
              {members.map((member) => (
                <div key={member.userId} className='flex items-center justify-between px-4 py-3'>
                  <span className='text-sm font-medium'>{member.username}</span>
                  <div className='flex items-center gap-2'>
                    <Select
                      value={member.role}
                      onValueChange={(role) => handleRoleChange(member.userId, role)}
                    >
                      <SelectTrigger className='h-8 w-28 text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r} className='text-xs'>
                            {t(`pages.spaceSettings.members.roles.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-destructive hover:text-destructive h-8 px-2'
                      onClick={() => setPendingRemoveId(member.userId)}
                    >
                      {t('common.buttons.remove')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            <strong className='text-foreground'>{pendingMember?.username}</strong>?
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

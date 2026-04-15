import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  Database,
  FolderOpen,
  Images,
  Lock,
  PanelLeft,
  Settings,
  UserRound,
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
import { AppHeader } from '@/components/app-header.tsx'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
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
import { SettingsSection } from '@/components/ui/settings-section'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  SidebarWrapper,
} from '@/components/ui/sidebar'
import type { GetSpaceQuery } from '@/generated/graphql'
import { useBrand } from '@/hooks/use-brand'
import { getLanguageCodes, getLanguageLabels } from '@/i18n'
import { useAuth } from '@/stores/auth-store'

export type SpaceSettingsData = NonNullable<GetSpaceQuery['space']>

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

type SectionId = 'general' | 'storage' | 'gallery' | 'members'

const VALID_SECTIONS: SectionId[] = ['general', 'storage', 'gallery', 'members']

// ── Page component ────────────────────────────────────────────────────────────

interface SpaceSettingsPageProps {
  loaderData: SpaceSettingsData
  section: string
}

export function SpaceSettingsPage({ loaderData: space, section }: SpaceSettingsPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const { authState, logout } = useAuth()
  const activeSection: SectionId = VALID_SECTIONS.includes(section as SectionId)
    ? (section as SectionId)
    : 'general'
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [galleryRegistry, setGalleryRegistry] = useState<Record<string, string>>({})
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close sheet when navigating between sections
  useEffect(() => {
    setMobileOpen(false)
  }, [activeSection])

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

  const { title: appTitle } = useBrand()
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

  const sectionDescriptions: Partial<Record<SectionId, string>> = {
    general: t('pages.spaceSettings.general.description'),
    storage: t('pages.spaceSettings.storage.description'),
    gallery: t('pages.spaceSettings.gallery.description'),
    members: t('pages.spaceSettings.members.description'),
  }

  const navItems: Array<{ id: SectionId; icon: React.ReactNode; label: string }> = [
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
  ]

  // ── Shared sidebar content ────────────────────────────────────────────────
  const sidebarContent = (
    <>
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
                    asChild
                    isActive={activeSection === item.id}
                    tooltip={item.label}
                    className='data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground'
                  >
                    <Link
                      to='/spaces/$spaceKey/settings/$section'
                      params={{ spaceKey: space.key, section: item.id }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: back + open gallery */}
      <SidebarFooter className='border-t py-2'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t('pages.spaceSettings.backToSpaces')}>
              <Link to='/account/spaces'>
                <ArrowLeft className='h-4 w-4' />
                <span>{t('pages.spaceSettings.backToSpaces')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t('pages.spaceSettings.openGallery')}>
              <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
                <FolderOpen className='h-4 w-4' />
                <span>{t('pages.spaceSettings.openGallery')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )

  return (
    <SidebarWrapper>
      {/* ── Desktop settings sidebar — fixed, bypasses global store ─────────── */}
      <Sidebar
        collapsible='none'
        className='fixed top-14 bottom-0 left-0 z-10 hidden h-auto border-r lg:flex'
      >
        {sidebarContent}
      </Sidebar>

      {/* ── Mobile / tablet sidebar sheet (local state) ──────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side='left'
          className='bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden'
          style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>{space.name}</SheetTitle>
            <SheetDescription>{space.key}</SheetDescription>
          </SheetHeader>
          <div className='flex h-full flex-col'>{sidebarContent}</div>
        </SheetContent>
      </Sheet>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <SidebarInset className='lg:pl-[var(--sidebar-width)]'>
        <AppHeader
          profileLabel={getUserDisplayName()}
          roleLabel={authState.profile?.role}
          onLogout={handleLogout}
          signOutText={t('common.navigation.signOut')}
          moreText={t('common.buttons.more')}
          leftSlot={
            <div className='flex min-w-0 items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='h-9 w-9 shrink-0 lg:hidden [&_svg]:size-5'
                onClick={() => setMobileOpen(true)}
              >
                <PanelLeft />
              </Button>
              <BreadcrumbLink asChild>
                <Link to='/' className='shrink-0 text-xl font-bold'>
                  {appTitle}
                </Link>
              </BreadcrumbLink>
              <div className='hidden min-w-0 sm:flex sm:items-center'>
                <span className='text-border mx-2 shrink-0 select-none'>|</span>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
                          {space.name}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {navItems.find((item) => item.id === activeSection)?.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          }
          mobileTitle={
            <div className='flex min-w-0 items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='h-9 w-9 shrink-0 [&_svg]:size-5'
                onClick={() => setMobileOpen(true)}
              >
                <PanelLeft />
              </Button>
              <BreadcrumbLink asChild>
                <Link to='/' className='shrink-0 text-xl font-bold'>
                  {appTitle}
                </Link>
              </BreadcrumbLink>
              <span className='text-border mx-2 shrink-0 select-none'>|</span>
              <span className='min-w-0 truncate text-sm font-medium'>{space.name}</span>
            </div>
          }
        />

        <main className='relative min-h-screen pt-14'>
          {/* ── Mobile section tab strip (md+ uses sidebar instead) ───── */}
          <div className='bg-background border-b lg:hidden'>
            <div className='flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to='/spaces/$spaceKey/settings/$section'
                  params={{ spaceKey: space.key, section: item.id }}
                  className={[
                    '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                    activeSection === item.id
                      ? 'border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent',
                  ].join(' ')}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
            {/* ── Page heading ──────────────────────────────────────────── */}
            <div className='mb-8'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                {navItems.find((item) => item.id === activeSection)?.label}
              </h1>
              {sectionDescriptions[activeSection] && (
                <p className='text-muted-foreground mt-1 text-sm'>
                  {sectionDescriptions[activeSection]}
                </p>
              )}
            </div>

            {/* ── General ───────────────────────────────────────────────── */}
            {activeSection === 'general' && (
              <SettingsSection>
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
              </SettingsSection>
            )}
            {activeSection === 'general' && (
              <div className='mt-8'>
                <BrandingSettingsSection spaceKey={space.key} initialValues={galleryRegistry} />
              </div>
            )}

            {/* ── Danger Zone (bottom of General) ──────────────────────── */}
            {activeSection === 'general' && (
              <div className='border-destructive/20 mt-10 border-t pt-6'>
                <h3 className='text-destructive text-base font-semibold'>
                  {t('pages.spaceSettings.sections.dangerZone')}
                </h3>
                <div className='mt-4 flex items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <p className='font-medium'>{t('pages.spaceSettings.danger.deleteTitle')}</p>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      {t('pages.spaceSettings.danger.deleteDescription')}
                    </p>
                  </div>
                  <Button
                    variant='destructive'
                    className='shrink-0'
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    {t('pages.spaceSettings.danger.deleteButton')}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Storage & Security ────────────────────────────────────── */}
            {activeSection === 'storage' && (
              <>
                {/* Platform-managed callout — standalone, outside the form card */}
                {!isByob && (
                  <div className='bg-muted/50 mb-6 flex gap-3 rounded-lg p-4 text-sm'>
                    <Database className='text-muted-foreground mt-0.5 h-4 w-4 shrink-0' />
                    <div>
                      <p className='font-medium'>{t('pages.spaceSettings.storage.managedTitle')}</p>
                      <p className='text-muted-foreground mt-0.5'>
                        {t('pages.spaceSettings.storage.managedDescription')}
                      </p>
                    </div>
                  </div>
                )}
                {/* URL Signing subtitle — outside card for non-BYOB */}
                {!isByob && (
                  <div className='mb-4'>
                    <h3 className='text-base font-semibold'>
                      {t('pages.spaceSettings.storage.urlSigning')}
                    </h3>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      {t('pages.spaceSettings.storage.urlSigningDescription')}
                    </p>
                  </div>
                )}

                <SettingsSection>
                  {isByob && (
                    <div className='bg-muted/40 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-3 py-2 text-sm'>
                      <span>
                        <span className='text-muted-foreground'>
                          {t('pages.spaceSettings.storage.bucket')}:{' '}
                        </span>
                        <code className='font-mono font-medium'>{space.bucket}</code>
                      </span>
                      {space.region && (
                        <span>
                          <span className='text-muted-foreground'>
                            {t('pages.spaceSettings.storage.region')}:{' '}
                          </span>
                          <code className='font-mono font-medium'>{space.region}</code>
                        </span>
                      )}
                      <span className='text-muted-foreground text-xs'>
                        {t('pages.spaceSettings.storage.bucketLocked')}
                      </span>
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
                                  description={t(
                                    'pages.spaceSettings.storage.secretKeyDescription',
                                  )}
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
                          {/* AES-256 encryption notice */}
                          <div className='bg-muted/50 mx-4 mb-2 flex items-start gap-2 rounded-md px-3 py-2.5 text-xs text-muted-foreground'>
                            <Lock className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                            <span>{t('pages.spaces.credentialsEncrypted')}</span>
                          </div>
                        </>
                      )}

                      {/* URL Signing sub-heading — inside card only for BYOB */}
                      {isByob && (
                        <div className='mb-1 border-t pt-5'>
                          <p className='text-sm font-semibold'>
                            {t('pages.spaceSettings.storage.urlSigning')}
                          </p>
                          <p className='text-muted-foreground mt-0.5 text-sm'>
                            {t('pages.spaceSettings.storage.urlSigningDescription')}
                          </p>
                        </div>
                      )}

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
                </SettingsSection>
              </>
            )}

            {/* ── Gallery settings ──────────────────────────────────────── */}
            {activeSection === 'gallery' && (
              <GallerySettingsSection spaceKey={space.key} initialValues={galleryRegistry} />
            )}

            {/* ── Members ───────────────────────────────────────────────── */}
            {activeSection === 'members' && <MembersSection />}
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

  const membersContent = isLoading ? (
    <div className='rounded-lg border p-4'>
      <p className='text-muted-foreground text-sm'>{t('common.status.loading')}</p>
    </div>
  ) : members.length === 0 ? (
    <div className='rounded-lg border border-dashed p-6 text-center'>
      <p className='font-medium'>{t('pages.spaceSettings.members.empty')}</p>
      <p className='text-muted-foreground mt-1 text-sm'>
        {t('pages.spaceSettings.members.emptyDescription')}
      </p>
    </div>
  ) : (
    <div className='overflow-hidden rounded-lg border'>
      <div className='bg-muted/40 hidden grid-cols-[minmax(0,1fr)_140px_96px] gap-4 border-b px-4 py-3 text-xs font-medium tracking-wide uppercase md:grid'>
        <span>{t('pages.spaceSettings.members.tableHeaders.member')}</span>
        <span>{t('pages.spaceSettings.members.tableHeaders.role')}</span>
        <span className='text-right'>{t('pages.spaceSettings.members.tableHeaders.action')}</span>
      </div>
      <div className='divide-y'>
        {members.map((member) => (
          <div
            key={member.userId}
            className='grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px_96px] md:items-center md:gap-4'
          >
            <div className='flex min-w-0 items-center gap-3'>
              <div className='bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full'>
                <UserRound className='h-4 w-4' />
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>
                  {member.displayName || member.username}
                </p>
                <p className='text-muted-foreground truncate text-xs'>@{member.username}</p>
              </div>
            </div>
            <div className='space-y-1 md:space-y-0'>
              <p className='text-muted-foreground text-xs font-medium uppercase md:hidden'>
                {t('pages.spaceSettings.members.tableHeaders.role')}
              </p>
              <Select
                value={member.role}
                onValueChange={(role) => handleRoleChange(member.userId, role)}
              >
                <SelectTrigger className='h-9'>
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
            <div className='flex justify-end'>
              <Button
                variant='ghost'
                size='sm'
                className='text-destructive hover:text-destructive h-9 px-3'
                onClick={() => setPendingRemoveId(member.userId)}
              >
                {t('common.buttons.remove')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <p className='text-muted-foreground text-sm'>
            {t('pages.spaceSettings.members.inviteDescription')}
          </p>
          <div className='flex flex-wrap gap-2 sm:flex-nowrap'>
            <Input
              className='min-w-0 flex-1'
              placeholder={t('pages.spaceSettings.members.usernamePlaceholder')}
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              disabled={isAdding}
            />
            <Select value={addRole} onValueChange={setAddRole} disabled={isAdding}>
              <SelectTrigger className='w-32 shrink-0'>
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
            <ButtonWithLoading
              onClick={handleAdd}
              isLoading={isAdding}
              disabled={!addUsername.trim()}
              className='shrink-0'
            >
              {t('pages.spaceSettings.members.addButton')}
            </ButtonWithLoading>
          </div>
        </div>

        {membersContent}
      </div>

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
            <strong className='text-foreground'>
              {pendingMember?.displayName || pendingMember?.username}
            </strong>
            ?
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

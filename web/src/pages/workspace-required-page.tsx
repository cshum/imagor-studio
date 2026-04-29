import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { Building2, LogOut, Mail } from 'lucide-react'
import { toast } from 'sonner'

import { createOrganization } from '@/api/org-api'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { useBrand } from '@/hooks/use-brand'
import { useAuth } from '@/stores/auth-store'

export function WorkspaceRequiredPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const { title: appTitle } = useBrand()
  const { authState, logout, refreshAuthSession } = useAuth()
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)

  const profileLabel =
    authState.profile?.displayName || authState.profile?.username || t('common.status.user')

  const handleSignOut = async () => {
    await logout()
    await router.invalidate()
    navigate({ to: '/login' })
  }

  const handleCreateOrganization = async () => {
    setIsCreatingOrganization(true)
    try {
      await createOrganization()
      await refreshAuthSession()
      await router.invalidate()
      toast.success(t('pages.workspaceRequired.actions.createSuccess'))
      navigate({ to: '/' })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.status.error')
      toast.error(`${t('pages.workspaceRequired.actions.createError')}: ${message}`)
    } finally {
      setIsCreatingOrganization(false)
    }
  }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_40%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]'>
      <AppHeader
        appTitle={appTitle}
        profileLabel={profileLabel}
        avatarUrl={authState.profile?.avatarUrl ?? null}
        onLogout={handleSignOut}
      />

      <main className='mx-auto flex min-h-screen max-w-5xl items-center px-4 pt-24 pb-10 sm:px-6'>
        <div className='grid w-full gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]'>
          <section className='bg-background/85 rounded-3xl border p-8 shadow-sm backdrop-blur sm:p-10'>
            <div className='text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase'>
              <Building2 className='h-3.5 w-3.5' />
              {t('pages.workspaceRequired.eyebrow')}
            </div>

            <h1 className='mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl'>
              {t('pages.workspaceRequired.title')}
            </h1>
            <p className='text-muted-foreground mt-4 max-w-2xl text-base leading-7'>
              {t('pages.workspaceRequired.description')}
            </p>

            <div className='mt-8 flex flex-wrap gap-3'>
              <Button onClick={handleCreateOrganization} disabled={isCreatingOrganization}>
                <Building2 className='mr-2 h-4 w-4' />
                {isCreatingOrganization
                  ? t('pages.workspaceRequired.actions.creatingOrganization')
                  : t('pages.workspaceRequired.actions.createOrganization')}
              </Button>
              <Button onClick={handleSignOut}>
                <LogOut className='mr-2 h-4 w-4' />
                {t('pages.workspaceRequired.actions.signOut')}
              </Button>
            </div>
          </section>

          <aside className='space-y-4'>
            <div className='bg-background/80 rounded-3xl border p-6 shadow-sm backdrop-blur'>
              <div className='flex items-start gap-3'>
                <div className='bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl'>
                  <Mail className='text-muted-foreground h-5 w-5' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold'>
                    {t('pages.workspaceRequired.invite.title')}
                  </h2>
                  <p className='text-muted-foreground mt-2 text-sm leading-6'>
                    {t('pages.workspaceRequired.invite.description')}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-background/80 rounded-3xl border p-6 shadow-sm backdrop-blur'>
              <h2 className='text-lg font-semibold'>
                {t('pages.workspaceRequired.nextSteps.title')}
              </h2>
              <p className='text-muted-foreground mt-2 text-sm leading-6'>
                {t('pages.workspaceRequired.nextSteps.description')}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

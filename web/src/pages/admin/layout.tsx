import { useTranslation } from 'react-i18next'
import { Outlet, useRouterState } from '@tanstack/react-router'

// ── Layout component ───────────────────────────────────────────────────────

export function AdminLayout() {
  const { t } = useTranslation()
  const { location } = useRouterState()

  // Derive heading from the last URL segment
  const segment = location.pathname.split('/').pop() ?? 'general'
  const labelKey = `pages.admin.sections.${segment}` as const
  const descKey = `pages.admin.sectionDescriptions.${segment}` as const
  const description = t(descKey, { defaultValue: '' })

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t(labelKey)}</h1>
        {description && <p className='text-muted-foreground mt-1.5 text-sm'>{description}</p>}
      </div>
      <Outlet />
    </div>
  )
}

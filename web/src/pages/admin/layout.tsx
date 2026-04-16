import { Outlet, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// ── Layout component ───────────────────────────────────────────────────────

export function AdminLayout() {
  const { t } = useTranslation()
  const { location } = useRouterState()

  // Derive heading from the last URL segment
  const segment = location.pathname.split('/').pop() ?? 'general'
  const labelKey = `pages.admin.sections.${segment}` as const

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t(labelKey)}</h1>
      </div>
      <Outlet />
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { Outlet, useMatches, useRouterState } from '@tanstack/react-router'

// ── Layout component ───────────────────────────────────────────────────────

export function AdminLayout() {
  const { t } = useTranslation()
  const matches = useMatches()
  const { location } = useRouterState()

  const activePathname = (matches[matches.length - 1] as { pathname?: string } | undefined)
    ?.pathname
    ? String((matches[matches.length - 1] as { pathname?: string }).pathname)
    : location.pathname

  // Derive heading from the committed route pathname so redirects do not flash
  // the transient parent segment before the concrete section has loaded.
  const segment = activePathname.split('/').pop() ?? 'general'
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

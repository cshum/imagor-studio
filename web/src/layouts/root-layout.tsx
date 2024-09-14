import { PropsWithChildren, useMemo } from 'react'
import { ThemeProvider } from '@/providers/theme-provider.tsx'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage.ts'
import { SidebarToggleProvider } from '@/providers/sidebar-toggle-provider.tsx'

export function RootLayout({ children }: PropsWithChildren) {
  return <div>
    <ThemeProvider
      attribute="class" defaultTheme="system"
      storage={useMemo(() => new LocalConfigStorage('theme'), [])}>
      <SidebarToggleProvider storage={useMemo(() => new LocalConfigStorage('sidebar'), [])}>
        {children}
      </SidebarToggleProvider>
    </ThemeProvider>
  </div>
}

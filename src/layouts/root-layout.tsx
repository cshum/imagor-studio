import { PropsWithChildren, useMemo } from 'react'
import { ThemeProvider } from '@/providers/theme-provider.tsx'
import { LocalStorageConfigStorage } from '@/lib/config-storage/local-storage-config-storage.ts'
import { SidebarToggleProvider } from '@/providers/sidebar-toggle-provider.tsx'

export function RootLayout({children}: PropsWithChildren) {
  return <div>
    <ThemeProvider
      attribute='class' defaultTheme='system'
      storage={useMemo(() => new LocalStorageConfigStorage('theme'), [])}>
      <SidebarToggleProvider storage={useMemo(() => new LocalStorageConfigStorage('sidebar'), [])}>
        {children}
      </SidebarToggleProvider>
    </ThemeProvider>
  </div>
}

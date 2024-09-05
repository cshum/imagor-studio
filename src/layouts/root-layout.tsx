import { PropsWithChildren, useMemo } from 'react'
import { ThemeProvider } from '@/providers/theme-provider.tsx'
import { LocalStorageThemeStorage } from '@/lib/theme-storage/local-storage-theme-storage.ts'

export function RootLayout({children}: PropsWithChildren) {
  return <div>
    <ThemeProvider
      attribute='class' defaultTheme='system'
      storage={useMemo(() => new LocalStorageThemeStorage('theme'), [])}>
      {children}
    </ThemeProvider>
  </div>
}

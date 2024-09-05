import { PropsWithChildren, useMemo } from 'react'
import { ThemeProvider } from '@/providers/theme-provider.tsx'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage.ts'

export function RootLayout({children}: PropsWithChildren) {
  return <div>
    <ThemeProvider
      attribute='class' defaultTheme='system'
      storage={useMemo(() => new LocalConfigStorage('theme'), [])}>
      {children}
    </ThemeProvider>
  </div>
}

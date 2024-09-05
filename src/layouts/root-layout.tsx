import { PropsWithChildren } from 'react'
import { ThemeProvider } from '@/providers/theme-provider.tsx'

export function RootLayout({children}: PropsWithChildren) {
  return <div>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      {children}
    </ThemeProvider>
  </div>
}

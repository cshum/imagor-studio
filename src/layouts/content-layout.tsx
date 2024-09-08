import { PropsWithChildren } from 'react'
import { Navbar } from '@/components/admin-panel/navbar.tsx'

interface ContentLayoutProps {
  title: string;
}

export function ContentLayout({ title, children }: PropsWithChildren<ContentLayoutProps>) {
  return (
    <div>
      <Navbar title={title} />
      <div className="container pt-4 pb-8 px-0 sm:pt-6 sm:px-6">{children}</div>
    </div>
  )
}

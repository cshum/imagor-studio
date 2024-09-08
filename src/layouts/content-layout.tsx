import { PropsWithChildren } from 'react'
import { Navbar } from '@/components/admin-panel/navbar.tsx'

interface ContentLayoutProps {
  title: string;
  isBounded?: boolean;
}

export function ContentLayout({ title, children, isBounded }: PropsWithChildren<ContentLayoutProps>) {
  return (
    <div>
      <Navbar title={title} />
      <div className={`${isBounded === false? '':'container'} pt-4 pb-8 px-0 sm:pt-6 sm:px-6`}>{children}</div>
    </div>
  )
}

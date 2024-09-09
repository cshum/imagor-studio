import { PropsWithChildren } from 'react'
import { Navbar } from '@/components/admin-panel/navbar.tsx'

interface ContentLayoutProps {
  title: string;
  isBounded?: boolean;
  className?: string
}

export function ContentLayout({ title, children, isBounded, className }: PropsWithChildren<ContentLayoutProps>) {
  return (
    <div>
      <Navbar title={title} />
      <div
        className={`${className || ''} ${isBounded === false ? '' : 'container'} pt-4 pb-8 px-0 sm:pt-6 sm:px-6`}>{children}</div>
    </div>
  )
}

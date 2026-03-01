import { PropsWithChildren } from 'react'

import { LicenseBadge } from '@/components/license/license-badge.tsx'

interface ContentLayoutProps {
  title: string
  isBounded?: boolean
  className?: string
}

export function ContentLayout({
  children,
  isBounded,
  className,
}: PropsWithChildren<ContentLayoutProps>) {
  return (
    <div>
      <div
        className={`${className || ''} ${isBounded ? 'container' : ''} relative mt-2 px-0 pt-4 pb-8 sm:px-6`}
      >
        <LicenseBadge />
        {children}
      </div>
    </div>
  )
}

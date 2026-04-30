import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { BrandBar } from '@/components/brand-bar'
import { LanguageSelector } from '@/components/language-selector'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'

type AuthPageShellProps = {
  eyebrow: string
  heroTitle: string
  heroBody?: ReactNode
  formTitle: string
  showHero?: boolean
  showLegalLinks?: boolean
  children: ReactNode
}

export function AuthPageShell({
  eyebrow,
  heroTitle,
  heroBody,
  formTitle,
  showHero = true,
  showLegalLinks = false,
  children,
}: AuthPageShellProps) {
  return (
    <div className='bg-background min-h-screen-safe relative flex flex-col overflow-hidden'>
      <BrandBar
        rightSlot={
          <div className='flex items-center gap-1.5 sm:gap-2'>
            <LicenseBadge />
            <LanguageSelector />
            <ModeToggle />
          </div>
        }
      />

      <div className='relative flex flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
        <div className='flex w-full flex-1 items-start justify-center lg:items-center'>
          <div
            className={
              showHero
                ? 'grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_440px] lg:gap-14'
                : 'w-full max-w-md'
            }
          >
            {showHero ? (
              <section className='relative hidden flex-col justify-center px-2 py-6 sm:px-4 sm:py-8 lg:flex lg:min-h-[640px] lg:px-0'>
                <div className='max-w-xl'>
                  <p className='text-muted-foreground text-sm font-medium tracking-[0.08em]'>
                    {eyebrow}
                  </p>
                  <h1 className='mt-4 max-w-lg text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
                    {heroTitle}
                  </h1>
                  {heroBody}
                </div>
              </section>
            ) : null}

            <section
              className={
                showHero
                  ? 'lg:border-border/40 flex px-2 py-4 sm:px-4 sm:py-6 lg:min-h-[640px] lg:border-l lg:pl-14'
                  : 'flex px-2 py-4 sm:px-4 sm:py-6'
              }
            >
              <div className='flex w-full items-center justify-center'>
                <div className='w-full max-w-md space-y-5'>
                  <div className='space-y-1 text-center'>
                    <h2 className='text-2xl font-semibold tracking-tight'>{formTitle}</h2>
                  </div>

                  {children}
                </div>
              </div>
            </section>
          </div>
        </div>

        {showLegalLinks ? (
          <div className='text-muted-foreground mt-8 flex items-center justify-center gap-4 pt-6 text-xs'>
            <Link to='/privacy' className='hover:text-foreground underline underline-offset-4'>
              Privacy Policy
            </Link>
            <Link to='/terms' className='hover:text-foreground underline underline-offset-4'>
              Terms of Service
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

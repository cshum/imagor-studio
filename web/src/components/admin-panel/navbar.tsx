import { useTranslation } from 'react-i18next'

import { SheetMenu } from '@/components/admin-panel/sheet-menu'
import { UserNav } from '@/components/admin-panel/user-nav'
import { ModeToggle } from '@/components/mode-toggle'

interface NavbarProps {
  title: string
}

export function Navbar({ title }: NavbarProps) {
  const { t } = useTranslation()

  return (
    <header className='bg-background/95 supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary sticky top-0 z-20 w-full shadow backdrop-blur'>
      <div className='mx-4 flex h-14 items-center sm:mx-8'>
        <div className='flex items-center space-x-4 lg:space-x-0'>
          <SheetMenu />
          <h1 className='font-bold'>{t(title)}</h1>
        </div>
        <div className='flex flex-1 items-center justify-end space-x-2'>
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}

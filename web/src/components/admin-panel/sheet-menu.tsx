import { Link } from '@tanstack/react-router'
import { MenuIcon, PanelsTopLeft } from 'lucide-react'

import { Menu } from '@/components/admin-panel/menu'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className='lg:hidden' asChild>
        <Button className='h-8' variant='outline' size='icon'>
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex h-full flex-col px-3 sm:w-72' side='left'>
        <SheetHeader>
          <Button className='flex items-center justify-center pt-1 pb-2' variant='link' asChild>
            <Link to='/' className='flex items-center gap-2'>
              <PanelsTopLeft className='mr-1 h-6 w-6' />
              <SheetTitle className='text-lg font-bold'>Brand</SheetTitle>
            </Link>
          </Button>
        </SheetHeader>
        <Menu isOpen />
      </SheetContent>
    </Sheet>
  )
}

import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { LayoutGrid, LogOut, User } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function UserNav() {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='relative h-8 w-8 rounded-full'>
                <Avatar className='h-8 w-8'>
                  <AvatarImage src='#' alt='Avatar' />
                  <AvatarFallback className='bg-transparent'>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side='bottom'>{t('profile')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>John Doe</p>
            <p className='text-muted-foreground text-xs leading-none'>johndoe@example.com</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className='hover:cursor-pointer' asChild>
            <Link to='/' className='flex items-center'>
              <LayoutGrid className='text-muted-foreground mr-3 h-4 w-4' />
              {t('dashboard')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className='hover:cursor-pointer' asChild>
            <Link to='/account' className='flex items-center'>
              <User className='text-muted-foreground mr-3 h-4 w-4' />
              {t('account')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onClick={() => {
            // Handle sign out logic here
          }}
        >
          <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

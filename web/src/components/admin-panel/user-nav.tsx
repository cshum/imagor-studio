import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { LogOut, MoreVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/stores/auth-store'

export function UserNav() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='relative h-8 w-8 rounded-full'>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side='bottom'>{t('menu')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuItem
          className='hover:cursor-pointer'
          onClick={handleLogout}
        >
          <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { useTranslation } from 'react-i18next'
import { Link, useLocation } from '@tanstack/react-router'
import { Ellipsis, LogOut } from 'lucide-react'

import { CollapseMenuButton } from '@/components/admin-panel/collapse-menu-button'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getMenuList } from '@/lib/menu-list'
import { cn } from '@/lib/utils'

interface MenuProps {
  isOpen: boolean | undefined
}

export function Menu({ isOpen }: MenuProps) {
  const location = useLocation() // Use React Router's useLocation to get the current pathname
  const { t } = useTranslation()
  const menuList = getMenuList(location.pathname) // Pass current pathname to getMenuList

  return (
    <ScrollArea className='[&>div>div[style]]:!block'>
      <nav className='mt-8 h-full w-full'>
        <ul className='flex min-h-[calc(100vh-48px-36px-16px-36px)] flex-col items-start space-y-1 px-2 lg:min-h-[calc(100vh-32px-40px-36px)]'>
          {menuList.map(({ groupLabel, menus }, index) => (
            <li className={cn('w-full', groupLabel ? 'pt-5' : '')} key={index}>
              {(isOpen && groupLabel) || isOpen === undefined ? (
                <p className='text-muted-foreground max-w-[248px] truncate px-4 pb-2 text-sm font-medium'>
                  {groupLabel}
                </p>
              ) : !isOpen && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className='w-full'>
                      <div className='flex w-full items-center justify-center'>
                        <Ellipsis className='h-5 w-5' />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='right'>
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className='pb-2'></p>
              )}
              {menus.map(({ href, label, icon: Icon, active, submenus }, index) =>
                submenus.length === 0 ? (
                  <div className='w-full' key={index}>
                    <TooltipProvider disableHoverableContent>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={active ? 'secondary' : 'ghost'}
                            className='mb-1 h-10 w-full justify-start'
                            asChild
                          >
                            <Link to={href}>
                              <span className={cn(isOpen === false ? '' : 'mr-4')}>
                                <Icon size={18} />
                              </span>
                              <p
                                className={cn(
                                  'max-w-[200px] truncate',
                                  isOpen === false
                                    ? '-translate-x-96 opacity-0'
                                    : 'translate-x-0 opacity-100',
                                )}
                              >
                                {label}
                              </p>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        {isOpen === false && <TooltipContent side='right'>{label}</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className='w-full' key={index}>
                    <CollapseMenuButton
                      icon={Icon}
                      label={label}
                      active={active}
                      submenus={submenus}
                      isOpen={isOpen}
                    />
                  </div>
                ),
              )}
            </li>
          ))}
          <li className='flex w-full grow items-end'>
            <TooltipProvider disableHoverableContent>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {}}
                    variant='outline'
                    className='mt-5 h-10 w-full justify-center'
                  >
                    <span className={cn(isOpen === false ? '' : 'mr-4')}>
                      <LogOut size={18} />
                    </span>
                    <p
                      className={cn(
                        'whitespace-nowrap',
                        isOpen === false ? 'hidden opacity-0' : 'opacity-100',
                      )}
                    >
                      {t('signOut')}
                    </p>
                  </Button>
                </TooltipTrigger>
                {isOpen === false && <TooltipContent side='right'>{t('signOut')}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </li>
        </ul>
      </nav>
    </ScrollArea>
  )
}

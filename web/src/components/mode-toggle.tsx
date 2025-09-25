import { useTranslation } from 'react-i18next'
import { MoonIcon, SunIcon } from '@radix-ui/react-icons'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/stores/theme-store.ts'

export function ModeToggle() {
  const { t } = useTranslation()
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            className='bg-background relative h-10 w-10 rounded-full sm:h-8 sm:w-8'
            variant='outline'
            size='icon'
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <SunIcon className='h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-transform duration-500 ease-in-out dark:scale-100 dark:rotate-0' />
            <MoonIcon className='absolute h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-transform duration-500 ease-in-out dark:scale-0 dark:-rotate-90' />
            <span className='sr-only'>{t('common.buttons.switchTheme')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom'>{t('common.buttons.switchTheme')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

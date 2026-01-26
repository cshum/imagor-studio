import { useTranslation } from 'react-i18next'
import { Check, Languages } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { availableLanguages } from '@/i18n'

interface LanguageSelectorProps {
  onLanguageChange?: (languageCode: string) => void
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onLanguageChange }) => {
  const { t, i18n } = useTranslation()

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode)
    onLanguageChange?.(languageCode)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='h-12 w-12 sm:h-10 sm:w-10'>
          <Languages className='h-4 w-4' />
          <span className='sr-only'>{t('common.language.title')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className='hover:cursor-pointer'
            onSelect={(event) => {
              event.preventDefault()
              handleLanguageChange(lang.code)
            }}
          >
            {lang.name}
            {i18n.language === lang.code && <Check className='ml-auto h-4 w-4' />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

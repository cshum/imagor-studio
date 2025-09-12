import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

export type ImagorType = 'embedded' | 'external'

interface ImagorTypeSelectorProps {
  value: ImagorType
  onChange: (type: ImagorType) => void
  disabled?: boolean
}

export function ImagorTypeSelector({ value, onChange, disabled = false }: ImagorTypeSelectorProps) {
  const { t } = useTranslation()

  const options = [
    {
      value: 'embedded' as const,
      label: t('pages.imagor.embeddedMode'),
      description: t('pages.imagor.embeddedModeDescription'),
      icon: '🔧',
    },
    {
      value: 'external' as const,
      label: t('pages.imagor.externalMode'),
      description: t('pages.imagor.externalModeDescription'),
      icon: '🌐',
    },
  ]

  return (
    <div className='space-y-3'>
      <Label className='text-base font-medium'>{t('pages.imagor.selectMode')}</Label>
      <RadioGroup
        value={value}
        onValueChange={(newValue) => onChange(newValue as ImagorType)}
        disabled={disabled}
        className='grid grid-cols-1 gap-4 md:grid-cols-2'
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              'hover:border-primary/50 cursor-pointer border-2 p-4 transition-all rounded-lg',
              value === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => !disabled && onChange(option.value)}
          >
            <div className='flex items-start space-x-3'>
              <div className='text-2xl'>{option.icon}</div>
              <div className='flex-1'>
                <div className='flex items-center space-x-2'>
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border-2',
                      value === option.value
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground',
                    )}
                  >
                    {value === option.value && (
                      <div className='bg-primary-foreground h-2 w-2 rounded-full' />
                    )}
                  </div>
                  <Label htmlFor={option.value} className='font-medium'>
                    {option.label}
                  </Label>
                </div>
                <p className='text-muted-foreground mt-1 text-sm'>{option.description}</p>
              </div>
            </div>
            <RadioGroupItem value={option.value} id={option.value} className='sr-only' />
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

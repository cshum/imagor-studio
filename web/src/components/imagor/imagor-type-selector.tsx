import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export type ImagorType = 'embedded' | 'external'

interface ImagorTypeSelectorProps {
  value: ImagorType
  onChange: (type: ImagorType) => void
  disabled?: boolean
}

export function ImagorTypeSelector({ value, onChange, disabled = false }: ImagorTypeSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-medium'>{t('pages.imagor.selectMode')}</h3>
        <p className='text-muted-foreground text-sm'>{t('pages.imagor.selectModeDescription')}</p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(newValue) => onChange(newValue as ImagorType)}
        disabled={disabled}
        className='grid grid-cols-1 gap-4 md:grid-cols-2'
      >
        <div className='flex items-center space-x-2 rounded-lg border p-4'>
          <RadioGroupItem value='embedded' id='embedded' />
          <div className='grid gap-1.5 leading-none'>
            <Label htmlFor='embedded' className='font-medium'>
              {t('pages.imagor.embeddedMode')}
            </Label>
            <p className='text-muted-foreground text-xs'>
              {t('pages.imagor.embeddedModeDescription')}
            </p>
          </div>
        </div>

        <div className='flex items-center space-x-2 rounded-lg border p-4'>
          <RadioGroupItem value='external' id='external' />
          <div className='grid gap-1.5 leading-none'>
            <Label htmlFor='external' className='font-medium'>
              {t('pages.imagor.externalMode')}
            </Label>
            <p className='text-muted-foreground text-xs'>
              {t('pages.imagor.externalModeDescription')}
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  )
}

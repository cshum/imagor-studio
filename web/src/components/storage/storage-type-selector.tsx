import { useTranslation } from 'react-i18next'
import { Cloudy, Folders } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

export type StorageType = 'file' | 's3'

interface StorageTypeSelectorProps {
  value: StorageType
  onChange: (type: StorageType) => void
  disabled?: boolean
}

export function StorageTypeSelector({ value, onChange, disabled }: StorageTypeSelectorProps) {
  const { t } = useTranslation()

  const options = [
    {
      value: 'file' as const,
      label: 'File Storage',
      description: t('pages.storage.storageTypeSelector.fileStorageDescription'),
      icon: <Folders />,
    },
    {
      value: 's3' as const,
      label: 'S3 Storage',
      description: t('pages.storage.storageTypeSelector.s3StorageDescription'),
      icon: <Cloudy />,
    },
  ]

  return (
    <div className='space-y-3'>
      <Label className='text-base font-medium'>Storage Type</Label>
      <RadioGroup
        value={value}
        onValueChange={(newValue) => onChange(newValue as StorageType)}
        disabled={disabled}
        className='grid grid-cols-1 gap-4 md:grid-cols-2'
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              'hover-touch:border-primary/50 cursor-pointer rounded-lg border-2 p-4 transition-all',
              value === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover-touch:border-primary/30',
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

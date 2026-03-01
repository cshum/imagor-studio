import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

import { setSystemRegistryObject } from '@/api/registry-api'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { extractErrorMessage } from '@/lib/error-utils'
import { setBrand } from '@/stores/brand-store'
import { setHomeTitle } from '@/stores/folder-tree-store'
import { licenseStore } from '@/stores/license-store'

export interface SystemSetting {
  key: string
  type: 'boolean' | 'text' | 'select' | 'dual-select'
  label: string
  description: string
  defaultValue: string | boolean
  options?: string[] // For select type
  optionLabels?: Record<string, string> // For custom option labels
  secondaryKey?: string // For dual-select type
  secondaryDefaultValue?: string | boolean // For dual-select type
  secondaryOptions?: string[] // For dual-select type
  secondaryOptionLabels?: Record<string, string> // For custom secondary option labels
  primaryLabel?: string // For dual-select primary field label
  secondaryLabel?: string // For dual-select secondary field label
  requiresLicense?: boolean // Field is only editable when the instance is licensed
}

export interface SystemSettingsFormProps {
  title?: string
  description?: string
  settings: SystemSetting[]
  initialValues?: Record<string, string>
  systemRegistryList?: Array<{
    key: string
    value: string
    isOverriddenByConfig: boolean
  }>
  onSuccess?: () => void
  onFormChange?: (values: Record<string, string>) => void
  showCard?: boolean
  hideUpdateButton?: boolean
}

export function SystemSettingsForm({
  title = 'System Settings',
  description = 'Configure system-wide settings. These options are only available to administrators.',
  settings,
  initialValues = {},
  systemRegistryList = [],
  onSuccess,
  onFormChange,
  showCard = true,
  hideUpdateButton = false,
}: SystemSettingsFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const { isLicensed } = licenseStore.useStore()
  const [isUpdating, setIsUpdating] = useState(false)

  // Current form state - map of registry keys to string values
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}

    // Initialize with default values
    settings.forEach((setting) => {
      initial[setting.key] =
        typeof setting.defaultValue === 'boolean'
          ? setting.defaultValue.toString()
          : setting.defaultValue

      // Initialize secondary key for dual-select
      if (setting.type === 'dual-select' && setting.secondaryKey) {
        initial[setting.secondaryKey] =
          typeof setting.secondaryDefaultValue === 'boolean'
            ? setting.secondaryDefaultValue.toString()
            : setting.secondaryDefaultValue || ''
      }
    })

    // Override with initial values
    Object.entries(initialValues).forEach(([key, value]) => {
      initial[key] = value
    })

    return initial
  })

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return settings.some((setting) => {
      // Skip license-gated fields when not licensed
      if (setting.requiresLicense && !isLicensed) return false

      const currentValue = formValues[setting.key]
      const originalValue = initialValues[setting.key]
      if (currentValue !== originalValue) {
        return true
      }

      // Check secondary key for dual-select
      if (setting.type === 'dual-select' && setting.secondaryKey) {
        const currentSecondaryValue = formValues[setting.secondaryKey]
        const originalSecondaryValue = initialValues[setting.secondaryKey]
        if (currentSecondaryValue !== originalSecondaryValue) {
          return true
        }
      }

      return false
    })
  }, [formValues, initialValues, settings, isLicensed])

  const updateSetting = (key: string, value: string) => {
    const newValues = { ...formValues, [key]: value }
    setFormValues(newValues)

    // Call the onFormChange callback if provided
    if (onFormChange) {
      onFormChange(newValues)
    }
  }

  const onUpdateSettings = async () => {
    setIsUpdating(true)

    try {
      // Only send changed values
      const changedValues: Record<string, string> = {}
      settings.forEach((setting) => {
        // Skip license-gated fields when not licensed
        if (setting.requiresLicense && !isLicensed) return

        const currentValue = formValues[setting.key]
        const originalValue = initialValues[setting.key]
        if (currentValue !== originalValue) {
          changedValues[setting.key] = currentValue
        }

        // Check secondary key for dual-select
        if (setting.type === 'dual-select' && setting.secondaryKey) {
          const currentSecondaryValue = formValues[setting.secondaryKey]
          const originalSecondaryValue = initialValues[setting.secondaryKey]
          if (currentSecondaryValue !== originalSecondaryValue) {
            changedValues[setting.secondaryKey] = currentSecondaryValue
          }
        }
      })

      if (Object.keys(changedValues).length > 0) {
        await setSystemRegistryObject(changedValues)

        // Update the store immediately if home title was changed
        if (changedValues['config.app_home_title']) {
          setHomeTitle(changedValues['config.app_home_title'])
        }

        // Update brand store immediately if brand settings changed
        if (
          changedValues['config.app_title'] !== undefined ||
          changedValues['config.app_url'] !== undefined
        ) {
          setBrand(
            changedValues['config.app_title'] ?? formValues['config.app_title'] ?? '',
            changedValues['config.app_url'] ?? formValues['config.app_url'] ?? '',
          )
        }

        toast.success('Settings updated successfully')

        // Invalidate the current route to refresh loader data
        await router.invalidate()

        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      toast.error(`Failed to update settings: ${errorMessage}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const renderSetting = (setting: SystemSetting) => {
    // Check if this setting is overridden by config
    const registryEntry = systemRegistryList.find((item) => item.key === setting.key)
    const isOverridden = registryEntry?.isOverriddenByConfig || false

    // Check if this setting requires a license
    const isLicenseRequired = setting.requiresLicense && !isLicensed
    const isDisabled = isUpdating || isOverridden || isLicenseRequired

    // Get the current effective value
    const getEffectiveValue = () => {
      if (isOverridden && registryEntry) {
        // If overridden by config, show the effective value from config
        return registryEntry.value
      }
      // Otherwise, use the form value (allowing empty strings)
      return setting.key in formValues ? formValues[setting.key] : setting.defaultValue.toString()
    }

    const effectiveValue = getEffectiveValue()

    if (setting.type === 'boolean') {
      const boolValue = effectiveValue === 'true'
      const checkboxId = `${setting.key}-checkbox`

      return (
        <div
          key={setting.key}
          className='flex flex-row items-center justify-between rounded-lg border p-4'
        >
          <div className='space-y-0.5'>
            <label htmlFor={checkboxId} className='cursor-pointer text-base font-medium'>
              {setting.label}
            </label>
            <div className='text-muted-foreground text-sm'>
              {setting.description}
              {isOverridden && (
                <span className='mt-1 block text-orange-600 dark:text-orange-400'>
                  {t('pages.systemSettings.settingOverridden')}
                </span>
              )}
            </div>
          </div>
          <Checkbox
            id={checkboxId}
            checked={boolValue}
            onCheckedChange={(checked) => {
              if (!isOverridden) {
                updateSetting(setting.key, checked ? 'true' : 'false')
              }
            }}
            disabled={isUpdating || isOverridden}
          />
        </div>
      )
    }

    if (setting.type === 'text') {
      return (
        <div key={setting.key} className='space-y-2 rounded-lg border p-4'>
          <Label htmlFor={setting.key} className='text-base font-medium'>
            {setting.label}
          </Label>
          <div className='text-muted-foreground text-sm'>
            {setting.description}
            {isOverridden && (
              <span className='mt-1 block text-orange-600 dark:text-orange-400'>
                {t('pages.systemSettings.settingOverridden')}
              </span>
            )}
            {isLicenseRequired && (
              <a
                href='https://imagor.net/buy/early-bird/'
                target='_blank'
                rel='noopener noreferrer'
                className='mt-1 flex items-center gap-1 text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300'
              >
                <Lock className='h-3 w-3' />
                {t('pages.systemSettings.licenseRequired')}
              </a>
            )}
          </div>
          <Input
            id={setting.key}
            value={isLicenseRequired ? '' : effectiveValue}
            onChange={(e) => {
              if (!isOverridden && !isLicenseRequired) {
                updateSetting(setting.key, e.target.value)
              }
            }}
            disabled={isDisabled}
            placeholder={setting.defaultValue.toString()}
          />
        </div>
      )
    }

    if (setting.type === 'select') {
      return (
        <div key={setting.key} className='space-y-2 rounded-lg border p-4'>
          <Label htmlFor={setting.key} className='text-base font-medium'>
            {setting.label}
          </Label>
          <div className='text-muted-foreground text-sm'>
            {setting.description}
            {isOverridden && (
              <span className='mt-1 block text-orange-600 dark:text-orange-400'>
                {t('pages.systemSettings.settingOverridden')}
              </span>
            )}
          </div>
          <Select
            value={effectiveValue}
            onValueChange={(value: string) => {
              if (!isOverridden) {
                updateSetting(setting.key, value)
              }
            }}
            disabled={isUpdating || isOverridden}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${setting.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {setting.optionLabels?.[option] ||
                    option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (setting.type === 'dual-select' && setting.secondaryKey) {
      // Get secondary setting values
      const secondaryRegistryEntry = systemRegistryList.find(
        (item) => item.key === setting.secondaryKey,
      )
      const isSecondaryOverridden = secondaryRegistryEntry?.isOverriddenByConfig || false

      const getSecondaryEffectiveValue = () => {
        if (isSecondaryOverridden && secondaryRegistryEntry) {
          return secondaryRegistryEntry.value
        }
        return setting.secondaryKey! in formValues
          ? formValues[setting.secondaryKey!]
          : setting.secondaryDefaultValue?.toString() || ''
      }

      const secondaryEffectiveValue = getSecondaryEffectiveValue()

      // Helper function to get option label from settings or fallback
      const getOptionLabel = (option: string, isSecondary: boolean = false) => {
        if (isSecondary && setting.secondaryOptionLabels) {
          return (
            setting.secondaryOptionLabels[option] ||
            option.charAt(0).toUpperCase() + option.slice(1)
          )
        } else if (!isSecondary && setting.optionLabels) {
          return setting.optionLabels[option] || option.charAt(0).toUpperCase() + option.slice(1)
        }
        return option.charAt(0).toUpperCase() + option.slice(1)
      }

      return (
        <div key={setting.key} className='space-y-2 rounded-lg border p-4'>
          <Label className='text-base font-medium'>{setting.label}</Label>
          <div className='text-muted-foreground text-sm'>
            {setting.description}
            {(isOverridden || isSecondaryOverridden) && (
              <span className='mt-1 block text-orange-600 dark:text-orange-400'>
                {t('pages.systemSettings.settingOverridden')}
              </span>
            )}
          </div>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div>
              <Label
                htmlFor={setting.key}
                className='text-muted-foreground pb-1 text-sm font-medium'
              >
                {setting.primaryLabel || 'Primary'}
              </Label>
              <Select
                value={effectiveValue}
                onValueChange={(value: string) => {
                  if (!isOverridden) {
                    updateSetting(setting.key, value)
                  }
                }}
                disabled={isUpdating || isOverridden}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select sort by' />
                </SelectTrigger>
                <SelectContent>
                  {setting.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {getOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor={setting.secondaryKey}
                className='text-muted-foreground pb-1 text-sm font-medium'
              >
                {setting.secondaryLabel || 'Secondary'}
              </Label>
              <Select
                value={secondaryEffectiveValue}
                onValueChange={(value: string) => {
                  if (!isSecondaryOverridden) {
                    updateSetting(setting.secondaryKey!, value)
                  }
                }}
                disabled={isUpdating || isSecondaryOverridden}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select order' />
                </SelectTrigger>
                <SelectContent>
                  {setting.secondaryOptions?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {getOptionLabel(option, true)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const content = (
    <div className='space-y-4'>
      {settings.map(renderSetting)}

      {!hideUpdateButton && (
        <div className='flex justify-end pt-2'>
          <ButtonWithLoading
            onClick={onUpdateSettings}
            isLoading={isUpdating}
            disabled={!hasUnsavedChanges}
          >
            {t('common.buttons.updateSettings')}
          </ButtonWithLoading>
        </div>
      )}
    </div>
  )

  if (!showCard) {
    return content
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}

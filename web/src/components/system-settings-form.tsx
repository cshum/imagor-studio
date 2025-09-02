import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { setSystemRegistryObject } from '@/api/registry-api'
import { extractErrorMessage } from '@/lib/error-utils'

export interface SystemSetting {
  key: string
  type: 'boolean' | 'text' | 'select'
  label: string
  description: string
  defaultValue: string | boolean
  options?: string[] // For select type
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
  showCard = true,
  hideUpdateButton = false,
}: SystemSettingsFormProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Current form state - map of registry keys to string values
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    
    // Initialize with default values
    settings.forEach(setting => {
      const defaultStr = typeof setting.defaultValue === 'boolean' 
        ? setting.defaultValue.toString() 
        : setting.defaultValue
      initial[setting.key] = defaultStr
    })
    
    // Override with initial values
    Object.entries(initialValues).forEach(([key, value]) => {
      initial[key] = value
    })
    
    return initial
  })

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return settings.some(setting => {
      const currentValue = formValues[setting.key]
      const originalValue = initialValues[setting.key]
      return currentValue !== originalValue
    })
  }, [formValues, initialValues, settings])

  const updateSetting = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }

  const onUpdateSettings = async () => {
    setIsUpdating(true)

    try {
      // Only send changed values
      const changedValues: Record<string, string> = {}
      settings.forEach(setting => {
        const currentValue = formValues[setting.key]
        const originalValue = initialValues[setting.key]
        if (currentValue !== originalValue) {
          changedValues[setting.key] = currentValue
        }
      })

      if (Object.keys(changedValues).length > 0) {
        await setSystemRegistryObject(changedValues)
        toast.success('Settings updated successfully!')
        
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
    const registryEntry = systemRegistryList.find(item => item.key === setting.key)
    const isOverridden = registryEntry?.isOverriddenByConfig || false
    
    // Get the current effective value
    const getEffectiveValue = () => {
      if (isOverridden && registryEntry) {
        // If overridden by config, show the effective value from config
        return registryEntry.value
      }
      // Otherwise, use the form value
      return formValues[setting.key] || setting.defaultValue.toString()
    }

    const effectiveValue = getEffectiveValue()

    if (setting.type === 'boolean') {
      const boolValue = effectiveValue === 'true'
      
      return (
        <div key={setting.key} className='flex flex-row items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <div className='text-base font-medium'>{setting.label}</div>
            <div className='text-sm text-muted-foreground'>
              {setting.description}
              {isOverridden && (
                <span className='block text-orange-600 dark:text-orange-400 mt-1'>
                  This setting is overridden by configuration file or environment variable
                </span>
              )}
            </div>
          </div>
          <Checkbox
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

    // Add other setting types (text, select) here in the future
    return null
  }

  const content = (
    <div className='space-y-4'>
      {settings.map(renderSetting)}
      
      {!hideUpdateButton && (
        <div className='flex justify-end pt-4 border-t'>
          <ButtonWithLoading
            onClick={onUpdateSettings}
            isLoading={isUpdating}
            disabled={!hasUnsavedChanges}
          >
            Update Settings
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
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}

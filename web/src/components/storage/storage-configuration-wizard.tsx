import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { configureFileStorage, configureS3Storage, testStorageConfig } from '@/api/storage-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import type { StorageType as GraphQLStorageType, StorageStatusQuery } from '@/generated/graphql'
import { loadRootFolders } from '@/stores/folder-tree-store'

import {
  FileStorageForm,
  type FileStorageFormData,
  type FileStorageFormRef,
} from './file-storage-form'
import { S3StorageForm, type S3StorageFormData, type S3StorageFormRef } from './s3-storage-form'
import { StorageTypeSelector, type StorageType } from './storage-type-selector'

interface StorageConfigurationWizardProps {
  onSuccess?: (restartRequired: boolean) => void
  onError?: (error: string) => void
  onCancel?: () => void
  showCancel?: boolean
  initialConfig?: StorageStatusQuery['storageStatus'] | null
}

export function StorageConfigurationWizard({
  onSuccess,
  onError,
  onCancel,
  showCancel = false,
  initialConfig,
}: StorageConfigurationWizardProps) {
  const { t } = useTranslation()
  const [storageType, setStorageType] = useState<StorageType>('file')
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs to access form data
  const fileFormRef = useRef<FileStorageFormRef>(null)
  const s3FormRef = useRef<S3StorageFormRef>(null)

  // Initialize form with existing configuration
  useEffect(() => {
    if (initialConfig?.configured && initialConfig.type) {
      const type = initialConfig.type.toLowerCase() === 'file' ? 'file' : 's3'
      setStorageType(type)
    }
  }, [initialConfig])

  // Clear error when storage type changes
  useEffect(() => {
    setError(null)
  }, [storageType])

  // Get initial values for file storage form
  const getFileStorageInitialValues = (): Partial<FileStorageFormData> | undefined => {
    if (!initialConfig?.fileConfig) return undefined
    return {
      baseDir: initialConfig.fileConfig.baseDir,
      mkdirPermissions: initialConfig.fileConfig.mkdirPermissions,
      writePermissions: initialConfig.fileConfig.writePermissions,
    }
  }

  // Get initial values for S3 storage form
  const getS3StorageInitialValues = (): Partial<S3StorageFormData> | undefined => {
    if (!initialConfig?.s3Config) return undefined
    return {
      bucket: initialConfig.s3Config.bucket,
      region: initialConfig.s3Config.region || undefined,
      endpoint: initialConfig.s3Config.endpoint || undefined,
      forcePathStyle: initialConfig.s3Config.forcePathStyle || false,
      baseDir: initialConfig.s3Config.baseDir || undefined,
      // Note: We don't pre-populate credentials for security reasons
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
    }
  }

  const handleFileStorageSubmit = async (data: FileStorageFormData) => {
    setIsLoading(true)
    setError(null) // Clear any previous errors
    try {
      const result = await configureFileStorage({
        input: {
          baseDir: data.baseDir,
          mkdirPermissions: data.mkdirPermissions || null,
          writePermissions: data.writePermissions || null,
        },
      })

      if (result.success) {
        // Load root folders if no restart is required
        if (!result.restartRequired) {
          await loadRootFolders()
        }
        onSuccess?.(result.restartRequired)
      } else {
        const errorMessage = result.message || 'Failed to configure file storage'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to configure file storage'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleS3StorageSubmit = async (data: S3StorageFormData) => {
    setIsLoading(true)
    setError(null) // Clear any previous errors
    try {
      const result = await configureS3Storage({
        input: {
          bucket: data.bucket,
          region: data.region || null,
          endpoint: data.endpoint || null,
          forcePathStyle: data.forcePathStyle || null,
          accessKeyId: data.accessKeyId || null,
          secretAccessKey: data.secretAccessKey || null,
          sessionToken: data.sessionToken || null,
          baseDir: data.baseDir || null,
        },
      })

      if (result.success) {
        toast.success(result.message || 'S3 storage configured successfully')
        // Load root folders if no restart is required
        if (!result.restartRequired) {
          await loadRootFolders()
        }
        onSuccess?.(result.restartRequired)
      } else {
        const errorMessage = result.message || 'Failed to configure S3 storage'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure S3 storage'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if storage configuration is overridden by external config
  const isConfigOverridden = initialConfig?.isOverriddenByConfig || false

  const handleTestConfiguration = async () => {
    setIsTesting(true)
    setError(null) // Clear any previous errors
    try {
      const storageTypeMap: Record<StorageType, GraphQLStorageType> = {
        file: 'FILE',
        s3: 'S3',
      }

      // Get actual form data based on storage type
      let testInput
      if (storageType === 'file') {
        const formData = fileFormRef.current?.getValues()
        if (!formData) {
          const errorMessage = t('pages.storage.testConfigFirst', {
            storageType: t('pages.storage.fileStorage'),
          })
          setError(errorMessage)
          return
        }
        testInput = {
          type: storageTypeMap[storageType],
          fileConfig: {
            baseDir: formData.baseDir,
            mkdirPermissions: formData.mkdirPermissions || null,
            writePermissions: formData.writePermissions || null,
          },
          s3Config: null,
        }
      } else {
        const formData = s3FormRef.current?.getValues()
        if (!formData) {
          const errorMessage = t('pages.storage.testConfigFirst', {
            storageType: t('pages.storage.s3Storage'),
          })
          setError(errorMessage)
          return
        }
        testInput = {
          type: storageTypeMap[storageType],
          fileConfig: null,
          s3Config: {
            bucket: formData.bucket,
            region: formData.region || null,
            endpoint: formData.endpoint || null,
            forcePathStyle: formData.forcePathStyle || null,
            accessKeyId: formData.accessKeyId || null,
            secretAccessKey: formData.secretAccessKey || null,
            sessionToken: formData.sessionToken || null,
            baseDir: formData.baseDir || null,
          },
        }
      }

      const result = await testStorageConfig({ input: testInput })

      if (result.success) {
        toast.success(t('pages.storage.testPassed'))
      } else {
        const errorMessage = result.message || t('pages.storage.testFailed')
        setError(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('pages.storage.testError')
      setError(errorMessage)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div>
      {isConfigOverridden && (
        <span className='mb-4 block text-orange-600 dark:text-orange-400'>
          {t('pages.storage.configurationOverridden')}
        </span>
      )}

      <StorageTypeSelector
        value={storageType}
        onChange={setStorageType}
        disabled={isLoading || isConfigOverridden}
      />

      <div className='mt-6'>
        {storageType === 'file' && (
          <div className='space-y-4'>
            <h4 className='font-medium'>{t('pages.storage.fileStorage')}</h4>
            <FileStorageForm
              ref={fileFormRef}
              onSubmit={handleFileStorageSubmit}
              disabled={isLoading || isConfigOverridden}
              initialValues={getFileStorageInitialValues()}
            />
          </div>
        )}

        {storageType === 's3' && (
          <div className='space-y-4'>
            <h4 className='font-medium'>{t('pages.storage.s3Storage')}</h4>
            <S3StorageForm
              ref={s3FormRef}
              onSubmit={handleS3StorageSubmit}
              disabled={isLoading || isConfigOverridden}
              initialValues={getS3StorageInitialValues()}
            />
          </div>
        )}
      </div>

      {error && (
        <div className='text-destructive bg-destructive/10 mt-6 rounded-md p-3 text-sm'>
          {error}
        </div>
      )}

      <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end'>
        {showCancel && (
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isLoading || isTesting}
            className='sm:mr-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
        )}
        <div className='flex flex-col gap-3 sm:flex-row'>
          <ButtonWithLoading
            type='button'
            variant='outline'
            onClick={handleTestConfiguration}
            disabled={isLoading || isConfigOverridden}
            isLoading={isTesting}
          >
            {t('pages.storage.testConfiguration')}
          </ButtonWithLoading>
          <ButtonWithLoading
            type='submit'
            disabled={isTesting || isConfigOverridden}
            isLoading={isLoading}
            onClick={() => {
              // Trigger form submission based on storage type
              const form = document.querySelector('form')
              if (form) {
                form.requestSubmit()
              }
            }}
          >
            {t('pages.storage.configureStorage')}
          </ButtonWithLoading>
        </div>
      </div>
    </div>
  )
}

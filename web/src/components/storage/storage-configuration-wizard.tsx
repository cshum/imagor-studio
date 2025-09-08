import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { configureFileStorage, configureS3Storage, testStorageConfig } from '@/api/storage-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { StorageType as GraphQLStorageType, StorageStatusQuery } from '@/generated/graphql'

import {
  FileStorageForm,
  type FileStorageFormData,
  type FileStorageFormRef,
} from './file-storage-form'
import { S3StorageForm, type S3StorageFormData, type S3StorageFormRef } from './s3-storage-form'
import { StorageTypeSelector, type StorageType } from './storage-type-selector'

interface StorageConfigurationWizardProps {
  onSuccess?: (restartRequired: boolean) => void
  onCancel?: () => void
  showCancel?: boolean
  title?: string
  description?: string
  initialConfig?: StorageStatusQuery['storageStatus'] | null
}

export function StorageConfigurationWizard({
  onSuccess,
  onCancel,
  showCancel = false,
  title = 'Configure Storage',
  description = 'Choose how you want to store your images',
  initialConfig,
}: StorageConfigurationWizardProps) {
  const [storageType, setStorageType] = useState<StorageType>('file')
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

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
      baseDir: initialConfig.s3Config.baseDir || undefined,
      // Note: We don't pre-populate credentials for security reasons
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
    }
  }

  const handleFileStorageSubmit = async (data: FileStorageFormData) => {
    setIsLoading(true)
    try {
      const result = await configureFileStorage({
        input: {
          baseDir: data.baseDir,
          mkdirPermissions: data.mkdirPermissions || null,
          writePermissions: data.writePermissions || null,
        },
      })

      if (result.success) {
        toast.success(result.message || 'File storage configured successfully!')
        onSuccess?.(result.restartRequired)
      } else {
        toast.error(result.message || 'Failed to configure file storage')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to configure file storage')
    } finally {
      setIsLoading(false)
    }
  }

  const handleS3StorageSubmit = async (data: S3StorageFormData) => {
    setIsLoading(true)
    try {
      const result = await configureS3Storage({
        input: {
          bucket: data.bucket,
          region: data.region || null,
          endpoint: data.endpoint || null,
          accessKeyId: data.accessKeyId || null,
          secretAccessKey: data.secretAccessKey || null,
          sessionToken: data.sessionToken || null,
          baseDir: data.baseDir || null,
        },
      })

      if (result.success) {
        toast.success(result.message || 'S3 storage configured successfully!')
        onSuccess?.(result.restartRequired)
      } else {
        toast.error(result.message || 'Failed to configure S3 storage')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to configure S3 storage')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to check if current storage config is overridden
  const isConfigOverridden = () => {
    if (storageType === 'file') {
      return initialConfig?.fileConfig?.isOverriddenByConfig || false
    } else {
      return initialConfig?.s3Config?.isOverriddenByConfig || false
    }
  }

  const handleTestConfiguration = async () => {
    setIsTesting(true)
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
          toast.error('Please fill in the file storage configuration first')
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
          toast.error('Please fill in the S3 storage configuration first')
          return
        }
        testInput = {
          type: storageTypeMap[storageType],
          fileConfig: null,
          s3Config: {
            bucket: formData.bucket,
            region: formData.region || null,
            endpoint: formData.endpoint || null,
            accessKeyId: formData.accessKeyId || null,
            secretAccessKey: formData.secretAccessKey || null,
            sessionToken: formData.sessionToken || null,
            baseDir: formData.baseDir || null,
          },
        }
      }

      const result = await testStorageConfig({ input: testInput })

      if (result.success) {
        toast.success('Storage configuration test passed!')
      } else {
        toast.error(result.message || 'Storage configuration test failed')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to test storage configuration')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card className='mx-auto w-full max-w-2xl'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <StorageTypeSelector value={storageType} onChange={setStorageType} disabled={isLoading} />

        <Separator />

        {storageType === 'file' && (
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>File Storage Configuration</h3>
            <FileStorageForm
              ref={fileFormRef}
              onSubmit={handleFileStorageSubmit}
              disabled={isLoading}
              initialValues={getFileStorageInitialValues()}
              isOverriddenByConfig={initialConfig?.fileConfig?.isOverriddenByConfig}
            />
          </div>
        )}

        {storageType === 's3' && (
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>S3 Storage Configuration</h3>
            <S3StorageForm
              ref={s3FormRef}
              onSubmit={handleS3StorageSubmit}
              disabled={isLoading}
              initialValues={getS3StorageInitialValues()}
              isOverriddenByConfig={initialConfig?.s3Config?.isOverriddenByConfig}
            />
          </div>
        )}

        <Separator />

        <div className='flex flex-col justify-between gap-3 sm:flex-row'>
          <div className='flex gap-3'>
            {showCancel && (
              <Button
                type='button'
                variant='outline'
                onClick={onCancel}
                disabled={isLoading || isTesting}
              >
                Cancel
              </Button>
            )}
            <ButtonWithLoading
              type='button'
              variant='outline'
              onClick={handleTestConfiguration}
              disabled={isLoading || isConfigOverridden()}
              isLoading={isTesting}
            >
              Test Configuration
            </ButtonWithLoading>
          </div>
          <ButtonWithLoading
            type='submit'
            disabled={isTesting || isConfigOverridden()}
            isLoading={isLoading}
            onClick={() => {
              // Trigger form submission based on storage type
              const form = document.querySelector('form')
              if (form) {
                form.requestSubmit()
              }
            }}
          >
            Configure Storage
          </ButtonWithLoading>
        </div>
      </CardContent>
    </Card>
  )
}

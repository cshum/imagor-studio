import { useState } from 'react'
import { toast } from 'sonner'

import { configureFileStorage, configureS3Storage, testStorageConfig } from '@/api/storage-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { StorageType as GraphQLStorageType } from '@/generated/graphql'

import { FileStorageForm, type FileStorageFormData } from './file-storage-form'
import { S3StorageForm, type S3StorageFormData } from './s3-storage-form'
import { StorageTypeSelector, type StorageType } from './storage-type-selector'

interface StorageConfigurationWizardProps {
  onSuccess?: (restartRequired: boolean) => void
  onCancel?: () => void
  showCancel?: boolean
  title?: string
  description?: string
}

export function StorageConfigurationWizard({
  onSuccess,
  onCancel,
  showCancel = false,
  title = 'Configure Storage',
  description = 'Choose how you want to store your images',
}: StorageConfigurationWizardProps) {
  const [storageType, setStorageType] = useState<StorageType>('file')
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

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

  const handleTestConfiguration = async () => {
    setIsTesting(true)
    try {
      const storageTypeMap: Record<StorageType, GraphQLStorageType> = {
        file: 'FILE',
        s3: 'S3',
      }

      // Get form data based on storage type
      const testInput = {
        type: storageTypeMap[storageType],
        fileConfig:
          storageType === 'file'
            ? {
                baseDir: './storage',
                mkdirPermissions: null,
                writePermissions: null,
              }
            : null,
        s3Config:
          storageType === 's3'
            ? {
                bucket: 'test-bucket',
                region: null,
                endpoint: null,
                accessKeyId: null,
                secretAccessKey: null,
                sessionToken: null,
                baseDir: null,
              }
            : null,
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
            <FileStorageForm onSubmit={handleFileStorageSubmit} disabled={isLoading} />
          </div>
        )}

        {storageType === 's3' && (
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>S3 Storage Configuration</h3>
            <S3StorageForm onSubmit={handleS3StorageSubmit} disabled={isLoading} />
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
            <Button
              type='button'
              variant='outline'
              onClick={handleTestConfiguration}
              disabled={isLoading || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Configuration'}
            </Button>
          </div>
          <Button
            type='submit'
            disabled={isLoading || isTesting}
            onClick={() => {
              // Trigger form submission based on storage type
              const form = document.querySelector('form')
              if (form) {
                form.requestSubmit()
              }
            }}
          >
            {isLoading ? 'Configuring...' : 'Configure Storage'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

import { getStorageStatus } from '@/api/storage-api'
import { getAuth } from '@/stores/auth-store.ts'
import type { StorageStatusQuery } from '@/types/generated-shared'

export interface AdminSetupLoaderData {
  storageStatus?: StorageStatusQuery['storageStatus']
}

export const adminSetupLoader = async (): Promise<AdminSetupLoaderData> => {
  if (!getAuth().accessToken) {
    return {}
  }
  const storageStatus = await getStorageStatus()
  return { storageStatus }
}

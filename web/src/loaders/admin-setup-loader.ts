import { getStorageStatus } from '@/api/storage-api'
import type { StorageStatusQuery } from '@/types/generated-shared'
import { getAuth } from '@/stores/auth-store.ts'

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

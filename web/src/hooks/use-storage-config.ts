import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storageConfigApi, StorageConfigInput } from '@/api/storage-config-api'

export function useStorageConfigs() {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['storageConfigs'],
    queryFn: storageConfigApi.list,
  })

  const addMutation = useMutation({
    mutationFn: storageConfigApi.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageConfigs'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, config }: { key: string; config: StorageConfigInput }) =>
      storageConfigApi.update(key, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageConfigs'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: storageConfigApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageConfigs'] })
    },
  })

  return {
    storageConfigs: listQuery.data,
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    addStorageConfig: addMutation.mutate,
    updateStorageConfig: updateMutation.mutate,
    deleteStorageConfig: deleteMutation.mutate,
  }
}

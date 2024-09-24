import { gql } from 'graphql-request'
import { graphqlClient } from '@/lib/graphql-client'

export interface StorageConfig {
  name: string
  key: string
  type: string
  config: string
}

export interface StorageConfigInput {
  name: string
  key: string
  type: string
  config: string
}

const LIST_STORAGE_CONFIGS = gql`
    query ListStorageConfigs {
        listStorageConfigs {
            name
            key
            type
            config
        }
    }
`

const GET_STORAGE_CONFIG = gql`
    query GetStorageConfig($key: String!) {
        getStorageConfig(key: $key) {
            name
            key
            type
            config
        }
    }
`

const ADD_STORAGE_CONFIG = gql`
    mutation AddStorageConfig($config: StorageConfigInput!) {
        addStorageConfig(config: $config) {
            name
            key
            type
            config
        }
    }
`

const UPDATE_STORAGE_CONFIG = gql`
    mutation UpdateStorageConfig($key: String!, $config: StorageConfigInput!) {
        updateStorageConfig(key: $key, config: $config) {
            name
            key
            type
            config
        }
    }
`

const DELETE_STORAGE_CONFIG = gql`
    mutation DeleteStorageConfig($key: String!) {
        deleteStorageConfig(key: $key)
    }
`

export const storageConfigApi = {
  list: async () => {
    const { listStorageConfigs } = await graphqlClient.request<{ listStorageConfigs: StorageConfig[] }>(LIST_STORAGE_CONFIGS)
    return listStorageConfigs
  },
  get: async (key: string) => {
    const { getStorageConfig } = await graphqlClient.request<{ getStorageConfig: StorageConfig }>(GET_STORAGE_CONFIG, { key })
    return getStorageConfig
  },
  add: async (config: StorageConfigInput) => {
    const { addStorageConfig } = await graphqlClient.request<{ addStorageConfig: StorageConfig }>(ADD_STORAGE_CONFIG, { config })
    return addStorageConfig
  },
  update: async (key: string, config: StorageConfigInput) => {
    const { updateStorageConfig } = await graphqlClient.request<{ updateStorageConfig: StorageConfig }>(UPDATE_STORAGE_CONFIG, { key, config })
    return updateStorageConfig
  },
  delete: async (key: string) => {
    const { deleteStorageConfig } = await graphqlClient.request<{ deleteStorageConfig: boolean }>(DELETE_STORAGE_CONFIG, { key })
    return deleteStorageConfig
  },
}

import type {
  GetResolvedGalleryDisplayPreferencesQuery,
  SortOption,
  SortOrder,
} from '@/generated/graphql'
import { getSdk } from '@/generated/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'
import { buildSpaceScopedUserConfigKey } from '@/lib/user-config'

const GALLERY_DISPLAY_PREFERENCE_KEYS = [
  'config.app_default_sort_by',
  'config.app_default_sort_order',
  'config.app_show_file_names',
] as const

type PreferenceKey = (typeof GALLERY_DISPLAY_PREFERENCE_KEYS)[number]

interface GalleryDisplayPreferenceDefaults {
  sortBy: SortOption
  sortOrder: SortOrder
  showFileNames: boolean
}

interface LoadGalleryDisplayPreferencesOptions {
  userID?: string
  spaceID?: string
  defaults?: GalleryDisplayPreferenceDefaults
}

export interface GalleryDisplayPreferences {
  sortBy: SortOption
  sortOrder: SortOrder
  showFileNames: boolean
}

const DEFAULT_GALLERY_DISPLAY_PREFERENCES: GalleryDisplayPreferenceDefaults = {
  sortBy: 'MODIFIED_TIME',
  sortOrder: 'DESC',
  showFileNames: false,
}

const galleryDisplayPreferencesCache = new Map<string, Promise<GalleryDisplayPreferences>>()

const getRegistryValue = (
  entries:
    | GetResolvedGalleryDisplayPreferencesQuery['userRegistryEntries']
    | GetResolvedGalleryDisplayPreferencesQuery['spaceRegistryEntries']
    | GetResolvedGalleryDisplayPreferencesQuery['systemRegistryEntries']
    | undefined,
  key: string,
) => entries?.find((entry) => entry.key === key)?.value

const getGalleryDisplayPreferencesCacheKey = ({
  userID,
  spaceID,
  defaults,
}: {
  userID: string
  spaceID: string
  defaults: GalleryDisplayPreferenceDefaults
}) =>
  JSON.stringify({
    userID,
    spaceID,
    defaults,
  })

export function invalidateGalleryDisplayPreferencesCache() {
  galleryDisplayPreferencesCache.clear()
}

export async function loadGalleryDisplayPreferences({
  userID,
  spaceID,
  defaults = DEFAULT_GALLERY_DISPLAY_PREFERENCES,
}: LoadGalleryDisplayPreferencesOptions = {}): Promise<GalleryDisplayPreferences> {
  const cacheKey = getGalleryDisplayPreferencesCacheKey({
    userID: userID ?? '',
    spaceID: spaceID ?? '',
    defaults,
  })
  const cachedPreferences = galleryDisplayPreferencesCache.get(cacheKey)

  if (cachedPreferences) {
    return cachedPreferences
  }

  const sdk = getSdk(getGraphQLClient())
  const request = (async () => {
    const scopedUserKeyMap = Object.fromEntries(
      GALLERY_DISPLAY_PREFERENCE_KEYS.map((key) => [
        key,
        spaceID ? buildSpaceScopedUserConfigKey(spaceID, key) : key,
      ]),
    ) as Record<PreferenceKey, string>

    const includeUser = Boolean(userID)
    const includeSpace = Boolean(spaceID)
    const response = await sdk.GetResolvedGalleryDisplayPreferences({
      includeUser,
      includeSpace,
      systemKeys: [...GALLERY_DISPLAY_PREFERENCE_KEYS],
      userKeys: includeUser
        ? GALLERY_DISPLAY_PREFERENCE_KEYS.map((key) => scopedUserKeyMap[key])
        : undefined,
      ownerID: includeUser ? userID : undefined,
      spaceID: spaceID ?? '',
    })

    const userSortBy = includeUser
      ? getRegistryValue(
          response.userRegistryEntries,
          scopedUserKeyMap['config.app_default_sort_by'],
        )
      : undefined
    const userSortOrder = includeUser
      ? getRegistryValue(
          response.userRegistryEntries,
          scopedUserKeyMap['config.app_default_sort_order'],
        )
      : undefined
    const userShowFileNames = includeUser
      ? getRegistryValue(
          response.userRegistryEntries,
          scopedUserKeyMap['config.app_show_file_names'],
        )
      : undefined

    const spaceSortBy = getRegistryValue(
      response.spaceRegistryEntries,
      'config.app_default_sort_by',
    )
    const spaceSortOrder = getRegistryValue(
      response.spaceRegistryEntries,
      'config.app_default_sort_order',
    )
    const spaceShowFileNames = getRegistryValue(
      response.spaceRegistryEntries,
      'config.app_show_file_names',
    )

    const systemSortBy = getRegistryValue(
      response.systemRegistryEntries,
      'config.app_default_sort_by',
    )
    const systemSortOrder = getRegistryValue(
      response.systemRegistryEntries,
      'config.app_default_sort_order',
    )
    const systemShowFileNames = getRegistryValue(
      response.systemRegistryEntries,
      'config.app_show_file_names',
    )

    return {
      sortBy: (userSortBy || spaceSortBy || systemSortBy || defaults.sortBy) as SortOption,
      sortOrder: (userSortOrder ||
        spaceSortOrder ||
        systemSortOrder ||
        defaults.sortOrder) as SortOrder,
      showFileNames:
        (userShowFileNames ||
          spaceShowFileNames ||
          systemShowFileNames ||
          String(defaults.showFileNames)) === 'true',
    }
  })().catch((error) => {
    galleryDisplayPreferencesCache.delete(cacheKey)
    throw error
  })

  galleryDisplayPreferencesCache.set(cacheKey, request)

  return request
}

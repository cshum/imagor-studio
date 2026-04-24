import {
  getUserRegistryMultiple,
  setUserRegistry,
  setUserRegistryMultiple,
} from '@/api/registry-api'

type UserRegistryEntryInput = {
  key: string
  value: string
  isEncrypted?: boolean
}

type UserConfigScope = {
  spaceID?: string
}

export function buildSpaceScopedUserConfigKey(spaceID: string, key: string): string {
  return `space.${spaceID}.${key}`
}

export async function resolveScopedUserConfigKeys(
  baseKeys: string[],
  scope?: UserConfigScope,
): Promise<Record<string, string>> {
  return Object.fromEntries(
    baseKeys.map((baseKey) => [
      baseKey,
      scope?.spaceID
        ? buildSpaceScopedUserConfigKey(scope.spaceID, baseKey)
        : baseKey,
    ]),
  )
}

export async function getScopedUserRegistryValues(
  baseKeys: string[],
  userID: string,
  scope?: UserConfigScope,
): Promise<Record<string, string | undefined>> {
  const scopedKeyMap = await resolveScopedUserConfigKeys(baseKeys, scope)

  const registryEntries = await getUserRegistryMultiple(Object.values(scopedKeyMap), userID)

  return Object.fromEntries(
    baseKeys.map((baseKey) => [
      baseKey,
      registryEntries.find((entry) => entry.key === scopedKeyMap[baseKey])?.value,
    ]),
  )
}

export async function setScopedUserRegistryValue(
  baseKey: string,
  value: string,
  isEncrypted: boolean,
  userID: string,
  scope?: UserConfigScope,
): Promise<void> {
  const scopedKeyMap = await resolveScopedUserConfigKeys([baseKey], scope)

  await setUserRegistry(scopedKeyMap[baseKey], value, isEncrypted, userID)
}

export async function setScopedUserRegistryMultiple(
  entries: UserRegistryEntryInput[],
  userID: string,
  scope?: UserConfigScope,
): Promise<void> {
  const scopedKeyMap = await resolveScopedUserConfigKeys(
    entries.map((entry) => entry.key),
    scope,
  )

  await setUserRegistryMultiple(
    entries.map((entry) => ({
      ...entry,
      key: scopedKeyMap[entry.key],
    })),
    userID,
  )
}

import { getSpace } from '@/api/org-api'
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
  spaceKey?: string
}

type ResolvedUserConfigScope =
  | { mode: 'global' }
  | { mode: 'space'; spaceID: string }
  | { mode: 'unresolved-space' }

export function buildSpaceScopedUserConfigKey(spaceID: string, key: string): string {
  return `space.${spaceID}.${key}`
}

async function resolveScope(scope?: UserConfigScope): Promise<ResolvedUserConfigScope> {
  if (scope?.spaceID) {
    return { mode: 'space', spaceID: scope.spaceID }
  }

  if (!scope?.spaceKey) {
    return { mode: 'global' }
  }

  try {
    const space = await getSpace(scope.spaceKey)
    if (space?.id) {
      return { mode: 'space', spaceID: space.id }
    }
  } catch {
    return { mode: 'unresolved-space' }
  }

  return { mode: 'unresolved-space' }
}

export async function resolveScopedUserConfigKeys(
  baseKeys: string[],
  scope?: UserConfigScope,
): Promise<Record<string, string> | null> {
  const resolvedScope = await resolveScope(scope)

  if (resolvedScope.mode === 'unresolved-space') {
    return null
  }

  return Object.fromEntries(
    baseKeys.map((baseKey) => [
      baseKey,
      resolvedScope.mode === 'space'
        ? buildSpaceScopedUserConfigKey(resolvedScope.spaceID, baseKey)
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

  if (!scopedKeyMap) {
    return Object.fromEntries(baseKeys.map((baseKey) => [baseKey, undefined]))
  }

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

  if (!scopedKeyMap) {
    throw new Error('Unable to resolve space-scoped user configuration key')
  }

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

  if (!scopedKeyMap) {
    throw new Error('Unable to resolve space-scoped user configuration keys')
  }

  await setUserRegistryMultiple(
    entries.map((entry) => ({
      ...entry,
      key: scopedKeyMap[entry.key],
    })),
    userID,
  )
}
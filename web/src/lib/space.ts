import { getSpace } from '@/api/org-api'
import type { GetSpaceQuery } from '@/generated/graphql'

export type ResolvedSpace = NonNullable<GetSpaceQuery['space']>

export interface SpaceIdentity {
  spaceKey: string
  spaceID: string
  spaceName?: string
}

export async function resolveSpace(spaceKey: string): Promise<ResolvedSpace> {
  const space = await getSpace(spaceKey)
  if (!space) {
    throw new Error(`Space "${spaceKey}" not found`)
  }
  return space
}

export function getSpaceIdentity(space: Pick<ResolvedSpace, 'id' | 'key' | 'name'>): SpaceIdentity {
  return {
    spaceKey: space.key,
    spaceID: space.id,
    spaceName: space.name,
  }
}

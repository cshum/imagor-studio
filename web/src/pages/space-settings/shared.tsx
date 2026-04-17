import type { GetSpaceQuery } from '@/generated/graphql'

export { SecretField } from '@/components/ui/secret-field'

export type SpaceSettingsData = NonNullable<GetSpaceQuery['space']>

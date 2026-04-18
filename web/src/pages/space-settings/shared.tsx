import type { GetSpaceQuery } from '@/types/generated-cloud'

export { SecretField } from '@/components/ui/secret-field'

export type SpaceSettingsData = NonNullable<GetSpaceQuery['space']>

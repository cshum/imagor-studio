export type RuntimeMode = 'embedded' | 'processing' | 'self_hosted' | 'cloud'

export const EMBEDDED_MODE = import.meta.env.VITE_EMBEDDED_MODE === 'true'

export const CLOUD_BUILD = import.meta.env.VITE_PRODUCT_MODE === 'cloud'

export const SELF_HOSTED_BUILD = !EMBEDDED_MODE && !CLOUD_BUILD

export function detectRuntimeMode(multiTenant: boolean): RuntimeMode {
  if (EMBEDDED_MODE) {
    return 'embedded'
  }
  if (multiTenant) {
    return 'cloud'
  }
  return 'self_hosted'
}

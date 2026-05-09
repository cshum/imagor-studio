import { authStore } from '@/stores/auth-store'
import { licenseStore } from '@/stores/license-store'

const DEFAULT_TITLE_CLOUD = 'Imagor Cloud'
const DEFAULT_TITLE_SELF_HOSTED = 'Imagor Studio'
const DEFAULT_URL = 'https://imagor.net'

/**
 * Returns the effective brand title and URL.
 * In multi-tenant (cloud) mode the default title is "Imagor Cloud".
 * In self-hosted mode the default title is "Imagor Studio".
 * Custom values are only applied when the instance is licensed.
 */
export function useBrand(): { title: string; url: string } {
  const { multiTenant } = authStore.useStore()
  const { isLicensed, appTitle, appUrl } = licenseStore.useStore()

  const defaultTitle = multiTenant ? DEFAULT_TITLE_CLOUD : DEFAULT_TITLE_SELF_HOSTED

  if (!isLicensed) {
    return { title: defaultTitle, url: DEFAULT_URL }
  }

  return {
    title: appTitle || defaultTitle,
    url: appUrl || DEFAULT_URL,
  }
}

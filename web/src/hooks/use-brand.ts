import { brandStore } from '@/stores/brand-store'
import { licenseStore } from '@/stores/license-store'

const DEFAULT_TITLE = 'Imagor Studio'
const DEFAULT_URL = 'https://imagor.net'

/**
 * Returns the effective brand title and URL.
 * Custom values are only applied when the instance is licensed;
 * otherwise falls back to the Imagor Studio defaults.
 */
export function useBrand(): { title: string; url: string } {
  const { isLicensed } = licenseStore.useStore()
  const { appTitle, appUrl } = brandStore.useStore()

  if (!isLicensed) {
    return { title: DEFAULT_TITLE, url: DEFAULT_URL }
  }

  return {
    title: appTitle || DEFAULT_TITLE,
    url: appUrl || DEFAULT_URL,
  }
}

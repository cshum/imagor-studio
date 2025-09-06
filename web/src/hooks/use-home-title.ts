import { useState, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { getSystemRegistryObject } from '@/api/registry-api'

const HOME_TITLE_KEY = 'config.home_title'
const DEFAULT_HOME_TITLE = 'Home'

/**
 * Hook to get the customizable home title from system registry
 * Falls back to "Home" if not configured or on error
 */
export function useHomeTitle(): string {
  const [homeTitle, setHomeTitle] = useState<string>(DEFAULT_HOME_TITLE)
  const router = useRouter()

  useEffect(() => {
    const fetchHomeTitle = async () => {
      try {
        const registry = await getSystemRegistryObject('config.')
        const customTitle = registry[HOME_TITLE_KEY]

        if (customTitle && customTitle.trim()) {
          setHomeTitle(customTitle.trim())
        } else {
          setHomeTitle(DEFAULT_HOME_TITLE)
        }
      } catch (error) {
        // On error, fall back to default
        console.warn('Failed to fetch home title from registry:', error)
        setHomeTitle(DEFAULT_HOME_TITLE)
      }
    }

    fetchHomeTitle()
  }, [router.state.location.pathname]) // Re-fetch when route changes

  return homeTitle
}

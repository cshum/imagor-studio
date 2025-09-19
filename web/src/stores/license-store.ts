import { activateLicense as activateLicenseAPI } from '@/api/license-api'
import { getBaseUrl } from '@/lib/api-utils.ts'
import { createStore } from '@/lib/create-store'

const BASE_URL = getBaseUrl()

export interface LicenseState {
  isLicensed: boolean
  licenseType: string
  features: string[]
  email: string
  message: string
  isOverriddenByConfig: boolean
  supportMessage: string | null
  maskedLicenseKey: string | null
  activatedAt: string | null
  isLoading: boolean
  showDialog: boolean
}

export type LicenseAction =
  | {
      type: 'SET_LICENSE_STATUS'
      payload: {
        isLicensed: boolean
        licenseType?: string
        features?: string[]
        email?: string
        message: string
        isOverriddenByConfig?: boolean
        supportMessage?: string
        maskedLicenseKey?: string
        activatedAt?: string
      }
    }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_SHOW_DIALOG'; payload: { showDialog: boolean } }
  | {
      type: 'ACTIVATE_LICENSE_SUCCESS'
      payload: {
        licenseType: string
        features: string[]
        email: string
        message: string
      }
    }
  | { type: 'ACTIVATE_LICENSE_ERROR'; payload: { message: string } }

const initialState: LicenseState = {
  isLicensed: false,
  licenseType: '',
  features: [],
  email: '',
  message: '',
  isOverriddenByConfig: false,
  supportMessage: null,
  maskedLicenseKey: null,
  activatedAt: null,
  isLoading: false,
  showDialog: false,
}

const reducer = (state: LicenseState, action: LicenseAction): LicenseState => {
  switch (action.type) {
    case 'SET_LICENSE_STATUS':
      return {
        ...state,
        isLicensed: action.payload.isLicensed,
        licenseType: action.payload.licenseType || '',
        features: action.payload.features || [],
        email: action.payload.email || '',
        message: action.payload.message,
        isOverriddenByConfig: action.payload.isOverriddenByConfig || false,
        supportMessage: action.payload.supportMessage || null,
        maskedLicenseKey: action.payload.maskedLicenseKey || null,
        activatedAt: action.payload.activatedAt || null,
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      }

    case 'SET_SHOW_DIALOG':
      return {
        ...state,
        showDialog: action.payload.showDialog,
      }

    case 'ACTIVATE_LICENSE_SUCCESS':
      return {
        ...state,
        isLicensed: true,
        licenseType: action.payload.licenseType,
        features: action.payload.features,
        email: action.payload.email,
        message: action.payload.message,
        supportMessage: null,
        isLoading: false,
      }

    case 'ACTIVATE_LICENSE_ERROR':
      return {
        ...state,
        message: action.payload.message,
        isLoading: false,
      }

    default:
      return state
  }
}

// Create the store
export const licenseStore = createStore(initialState, reducer)

/**
 * Check license status using public endpoint (no auth required)
 */
export const checkPublicLicense = async () => {
  licenseStore.dispatch({ type: 'SET_LOADING', payload: { isLoading: true } })

  try {
    const response = await fetch(`${BASE_URL}/api/public/license-status`)
    const data = await response.json()

    licenseStore.dispatch({
      type: 'SET_LICENSE_STATUS',
      payload: {
        isLicensed: data.isLicensed,
        licenseType: data.licenseType || undefined,
        email: undefined, // Public endpoint doesn't expose email
        message: data.message,
        supportMessage: data.supportMessage || undefined,
      },
    })
  } catch (error) {
    console.error('Failed to check public license status:', error)
    // Fallback for public access
    licenseStore.dispatch({
      type: 'SET_LICENSE_STATUS',
      payload: {
        isLicensed: false,
        message: 'Support ongoing development',
        supportMessage: 'From the creator of imagor & vipsgen',
      },
    })
  } finally {
    licenseStore.dispatch({ type: 'SET_LOADING', payload: { isLoading: false } })
  }
}

/**
 * Check license status (auth-aware)
 */
export const checkLicense = async () => {
  // For now, always use public endpoint
  // TODO: Add auth-aware logic when GraphQL cleanup is complete
  return checkPublicLicense()
}

/**
 * Activate license with key
 */
export const activateLicense = async (
  key: string,
): Promise<{ success: boolean; message: string }> => {
  licenseStore.dispatch({ type: 'SET_LOADING', payload: { isLoading: true } })

  try {
    const response = await activateLicenseAPI(key)

    if (response.isLicensed) {
      licenseStore.dispatch({
        type: 'ACTIVATE_LICENSE_SUCCESS',
        payload: {
          licenseType: response.licenseType || 'personal',
          features: response.features || [],
          email: response.email || '',
          message: response.message,
        },
      })

      return {
        success: true,
        message: response.message,
      }
    } else {
      licenseStore.dispatch({
        type: 'ACTIVATE_LICENSE_ERROR',
        payload: {
          message: response.message,
        },
      })

      return {
        success: false,
        message: response.message,
      }
    }
  } catch (error) {
    console.error('Failed to activate license:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to activate license'

    licenseStore.dispatch({
      type: 'ACTIVATE_LICENSE_ERROR',
      payload: {
        message: errorMessage,
      },
    })

    return {
      success: false,
      message: errorMessage,
    }
  }
}

/**
 * Show support dialog
 */
export const showSupportDialog = () => {
  licenseStore.dispatch({ type: 'SET_SHOW_DIALOG', payload: { showDialog: true } })
}

/**
 * Set dialog visibility
 */
export const setShowDialog = (show: boolean) => {
  licenseStore.dispatch({ type: 'SET_SHOW_DIALOG', payload: { showDialog: show } })
}

/**
 * Get current license state
 */
export const getLicenseState = (): LicenseState => {
  return licenseStore.getState()
}

// Hook for components to use the license store
export const useLicense = () => {
  const state = licenseStore.useStore()

  return {
    ...state,
    checkLicense,
    activateLicense,
    showSupportDialog,
    setShowDialog,
  }
}

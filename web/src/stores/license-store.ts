import { createStore } from '@/lib/create-store'

export interface LicenseState {
  isLicensed: boolean
  licenseType: string | null
  email: string | null
  message: string
  supportMessage: string | null
  isLoading: boolean
  showDialog: boolean
}

export type LicenseAction =
  | { type: 'SET_LICENSE_STATUS'; payload: { isLicensed: boolean; licenseType?: string; email?: string; message: string; supportMessage?: string } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_SHOW_DIALOG'; payload: { showDialog: boolean } }
  | { type: 'ACTIVATE_LICENSE_SUCCESS'; payload: { licenseType: string; email: string; message: string } }
  | { type: 'ACTIVATE_LICENSE_ERROR'; payload: { message: string } }

const initialState: LicenseState = {
  isLicensed: false,
  licenseType: null,
  email: null,
  message: '',
  supportMessage: null,
  isLoading: false,
  showDialog: false,
}

const reducer = (state: LicenseState, action: LicenseAction): LicenseState => {
  switch (action.type) {
    case 'SET_LICENSE_STATUS':
      return {
        ...state,
        isLicensed: action.payload.isLicensed,
        licenseType: action.payload.licenseType || null,
        email: action.payload.email || null,
        message: action.payload.message,
        supportMessage: action.payload.supportMessage || null,
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
 * Check license status
 */
export const checkLicense = async () => {
  licenseStore.dispatch({ type: 'SET_LOADING', payload: { isLoading: true } })
  
  try {
    // TODO: Implement GraphQL query when resolvers are ready
    // For now, return unlicensed state
    licenseStore.dispatch({
      type: 'SET_LICENSE_STATUS',
      payload: {
        isLicensed: false,
        message: 'No license found',
        supportMessage: 'Support ongoing development with a license',
      },
    })
  } catch (error) {
    licenseStore.dispatch({
      type: 'SET_LICENSE_STATUS',
      payload: {
        isLicensed: false,
        message: 'Error checking license',
      },
    })
  } finally {
    licenseStore.dispatch({ type: 'SET_LOADING', payload: { isLoading: false } })
  }
}

/**
 * Activate license with key
 */
export const activateLicense = async (key: string): Promise<{ success: boolean; message: string }> => {
  licenseStore.dispatch({ type: 'SET_LOADING', payload: { isLoading: true } })
  
  try {
    // TODO: Implement GraphQL mutation when resolvers are ready
    // For now, simulate activation
    if (key.startsWith('IMGR-')) {
      licenseStore.dispatch({
        type: 'ACTIVATE_LICENSE_SUCCESS',
        payload: {
          licenseType: 'personal',
          email: 'user@example.com',
          message: 'License activated successfully! Thank you for supporting development.',
        },
      })
      
      return {
        success: true,
        message: 'License activated successfully! Thank you for supporting development.',
      }
    } else {
      licenseStore.dispatch({
        type: 'ACTIVATE_LICENSE_ERROR',
        payload: {
          message: 'Invalid license key format',
        },
      })
      
      return {
        success: false,
        message: 'Invalid license key format',
      }
    }
  } catch (error) {
    licenseStore.dispatch({
      type: 'ACTIVATE_LICENSE_ERROR',
      payload: {
        message: 'Failed to activate license',
      },
    })
    
    return {
      success: false,
      message: 'Failed to activate license',
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

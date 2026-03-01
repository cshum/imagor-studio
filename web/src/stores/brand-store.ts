import { createStore } from '@/lib/create-store'

export interface BrandState {
  appTitle: string
  appUrl: string
  isBrandLoaded: boolean
}

export type BrandAction = { type: 'SET_BRAND'; title: string; url: string }

const initialState: BrandState = {
  appTitle: '',
  appUrl: '',
  isBrandLoaded: false,
}

const reducer = (state: BrandState, action: BrandAction): BrandState => {
  switch (action.type) {
    case 'SET_BRAND':
      return {
        ...state,
        appTitle: action.title,
        appUrl: action.url,
        isBrandLoaded: true,
      }
    default:
      return state
  }
}

export const brandStore = createStore(initialState, reducer)

export const setBrand = (title: string, url: string) => {
  brandStore.dispatch({ type: 'SET_BRAND', title, url })
}

export interface EmbeddedQueryParams {
  image?: string
  token?: string
}

export function parseQueryParams(): EmbeddedQueryParams {
  const searchParams = new URLSearchParams(window.location.search)
  
  return {
    image: searchParams.get('image') || undefined,
    token: searchParams.get('token') || undefined,
  }
}

export function updateQueryParams(params: Partial<EmbeddedQueryParams>) {
  const searchParams = new URLSearchParams(window.location.search)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value)
    } else {
      searchParams.delete(key)
    }
  })
  
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`
  window.history.replaceState({}, '', newUrl)
}

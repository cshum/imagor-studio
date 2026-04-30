export function getInviteTokenSearchValue(search: Record<string, unknown>): string | undefined {
  return typeof search.invite_token === 'string' ? search.invite_token : undefined
}

export function appendSearchParams(pathname: string, search: Record<string, unknown>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          params.append(key, String(item))
        }
      }
      continue
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.append(key, String(value))
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

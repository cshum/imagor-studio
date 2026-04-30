export function getInviteTokenSearchValue(search: Record<string, unknown>): string | undefined {
  return typeof search.invite_token === 'string' ? search.invite_token : undefined
}

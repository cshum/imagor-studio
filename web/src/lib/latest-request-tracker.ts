export interface LatestRequestTracker {
  begin: (requestKey: string) => number
  isLatest: (requestKey: string, generation: number) => boolean
  clear: () => void
}

export const createLatestRequestTracker = (): LatestRequestTracker => {
  let generation = 0
  const latestRequests = new Map<string, number>()

  return {
    begin(requestKey) {
      generation += 1
      latestRequests.set(requestKey, generation)
      return generation
    },
    isLatest(requestKey, requestGeneration) {
      return latestRequests.get(requestKey) === requestGeneration
    },
    clear() {
      latestRequests.clear()
    },
  }
}
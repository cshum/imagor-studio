/**
 * Calculate effective zoom levels by filtering out levels too close to the fit scale.
 * Only returns levels significantly larger than fit (with minimum 15% distance).
 *
 * @param fitScale - The current fit scale (0-1)
 * @returns Array of effective zoom levels including 'fit' and larger numeric levels
 */
export function getEffectiveZoomLevels(fitScale: number): Array<number | 'fit'> {
  const baseLevels = [0.25, 0.5, 0.75, 1.0]

  // Filter to only keep levels significantly larger than fit (5% minimum distance)
  const MIN_DISTANCE = 0.05
  const largerLevels = baseLevels.filter((level) => level > fitScale + MIN_DISTANCE)

  // Effective levels: fit + larger levels
  return ['fit', ...largerLevels]
}

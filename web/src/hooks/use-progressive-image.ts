import { useEffect, useRef, useState } from 'react'

export interface ImageSource {
  /** URL of the image at this resolution tier */
  src: string
  /**
   * Minimum display pixels (scale × displayWidth × devicePixelRatio) required
   * to upgrade to this tier. Use 0 for the initial/lowest tier.
   */
  threshold: number
}

/**
 * useProgressiveImage — silently upgrades displayed image resolution as the
 * user zooms in, based on a list of resolution tiers with pixel thresholds.
 *
 * Sources should be ordered from lowest quality (threshold 0) to highest.
 * The hook starts at the first tier and upgrades whenever the current display
 * pixels exceed the next tier's threshold, loading the new image in the
 * background before swapping the src.
 *
 * @param sources  Ordered list of resolution tiers (lowest → highest quality)
 * @param displayWidth  Rendered CSS width of the image at current zoom level
 * @param scale  Current zoom scale factor
 * @returns  The URL to use for the <img> src at the current moment
 */
export function useProgressiveImage(
  sources: ImageSource[],
  displayWidth: number,
  scale: number,
): string {
  const [displaySrc, setDisplaySrc] = useState(sources[0]?.src ?? '')
  const loadedRef = useRef<Set<string>>(new Set())

  // Reset when the base image (lowest tier) changes
  useEffect(() => {
    const baseSrc = sources[0]?.src ?? ''
    setDisplaySrc(baseSrc)
    loadedRef.current = new Set()
  }, [sources[0]?.src]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check all tiers whenever scale or displayWidth changes and trigger background loads
  useEffect(() => {
    if (!sources.length || !displayWidth) return
    const physicalPixels = scale * displayWidth * (window.devicePixelRatio || 1)

    sources.forEach(({ src, threshold }) => {
      if (!src || loadedRef.current.has(src)) return
      if (threshold === 0 || physicalPixels > threshold) {
        const img = new Image()
        img.onload = () => {
          loadedRef.current.add(src)
          // Pick the highest-quality tier that is both loaded and eligible
          setDisplaySrc((current) => {
            const currentIndex = sources.findIndex((s) => s.src === current)
            const newIndex = sources.findIndex((s) => s.src === src)
            return newIndex > currentIndex ? src : current
          })
        }
        img.src = src
      }
    })
  }, [scale, displayWidth, sources])

  return displaySrc
}

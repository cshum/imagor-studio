import { useEffect, useRef, useState } from 'react'

export interface ImageSource {
  /** URL of the image at this resolution tier */
  src: string
  /**
   * Maximum pixels on the longest edge this image covers.
   * The next tier is loaded when the displayed pixels (longest edge × scale × DPR)
   * exceed this value. Use Infinity for the highest/original tier.
   */
  maxWidth: number
}

/**
 * useProgressiveImage — silently upgrades displayed image resolution as the
 * user zooms in, based on an ordered list of resolution tiers.
 *
 * Sources should be ordered from lowest quality (smallest maxWidth) to highest
 * (maxWidth = Infinity for original). The hook starts at the preloaded src and
 * upgrades whenever the current displayed pixels exceed the current tier's maxWidth,
 * loading the new image in the background before swapping.
 *
 * Uses the longest displayed dimension (max of width/height) to correctly handle
 * both landscape and portrait images.
 *
 * @param sources       Ordered resolution tiers, each with src and maxWidth
 * @param displayWidth  Rendered CSS width of the image at current zoom
 * @param displayHeight Rendered CSS height of the image at current zoom
 * @param scale         Current zoom scale factor
 * @param preloadedSrc  Src already preloaded (skips initial fetch, shown immediately)
 * @returns  The URL to render in <img src> at the current moment
 */
export function useProgressiveImage(
  sources: ImageSource[],
  displayWidth: number,
  displayHeight: number,
  scale: number,
  preloadedSrc?: string,
): string {
  const initialSrc = preloadedSrc ?? sources[0]?.src ?? ''
  const [displaySrc, setDisplaySrc] = useState(initialSrc)
  const loadedRef = useRef<Set<string>>(new Set(preloadedSrc ? [preloadedSrc] : []))

  // Reset when the base image or preloaded src changes
  useEffect(() => {
    const baseSrc = preloadedSrc ?? sources[0]?.src ?? ''
    setDisplaySrc(baseSrc)
    loadedRef.current = new Set(baseSrc ? [baseSrc] : [])
  }, [preloadedSrc ?? sources[0]?.src]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check tiers whenever scale or dimensions change and trigger background loads
  useEffect(() => {
    if (!sources.length || (!displayWidth && !displayHeight)) return

    // Use longest displayed edge × scale × DPR for aspect-ratio-safe comparison
    const longestEdge = Math.max(displayWidth, displayHeight)
    const physicalPixels = scale * longestEdge * (window.devicePixelRatio || 1)

    sources.forEach(({ src }, index) => {
      if (!src || loadedRef.current.has(src)) return
      // Upgrade threshold: previous tier's maxWidth (tier[0] is always eligible)
      const threshold = index === 0 ? 0 : (sources[index - 1].maxWidth ?? 0)
      if (physicalPixels > threshold) {
        const img = new Image()
        img.onload = () => {
          loadedRef.current.add(src)
          // Upgrade displaySrc only if this is a higher tier than currently shown
          setDisplaySrc((current) => {
            const currentIndex = sources.findIndex((s) => s.src === current)
            return index > currentIndex ? src : current
          })
        }
        img.src = src
      }
    })
  }, [scale, displayWidth, displayHeight, sources])

  return displaySrc
}

/**
 * Calculates new scroll position by preserving the proportional scroll ratio
 * from the old scroll dimensions. Used when the user has already scrolled away
 * from the default position and we want to maintain about the same visible region
 * after a zoom level change.
 */
export function calculateProportionalScroll({
  scrollLeft,
  scrollTop,
  oldScrollWidth,
  oldScrollHeight,
  newScrollWidth,
  newScrollHeight,
}: {
  scrollLeft: number
  scrollTop: number
  oldScrollWidth: number
  oldScrollHeight: number
  newScrollWidth: number
  newScrollHeight: number
}): { scrollLeft: number; scrollTop: number } {
  const ratioX = scrollLeft / oldScrollWidth
  const ratioY = scrollTop / oldScrollHeight

  return {
    scrollLeft: ratioX * newScrollWidth,
    scrollTop: ratioY * newScrollHeight,
  }
}

/**
 * Calculates the scroll position needed to center the image inside the scroll
 * container. The container uses symmetric padding equal to half the image size on
 * every side, so the center of the image content is at:
 *   paddingWidth + imageWidth / 2  (horizontally)
 *   paddingHeight + imageHeight / 2 (vertically)
 *
 * Scroll positions are clamped to [0, maxScroll] to avoid over-scrolling.
 */
export function calculateCenteredScroll({
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  newScrollWidth,
  newScrollHeight,
}: {
  imageWidth: number
  imageHeight: number
  containerWidth: number
  containerHeight: number
  newScrollWidth: number
  newScrollHeight: number
}): { scrollLeft: number; scrollTop: number } {
  // Padding equals half the image size on each side (matches the JSX wrapper style)
  const paddingWidth = imageWidth * 0.5
  const paddingHeight = imageHeight * 0.5

  const imageCenterX = paddingWidth + imageWidth / 2
  const imageCenterY = paddingHeight + imageHeight / 2

  const centerScrollLeft = imageCenterX - containerWidth / 2
  const centerScrollTop = imageCenterY - containerHeight / 2

  return {
    scrollLeft: Math.max(0, Math.min(centerScrollLeft, newScrollWidth)),
    scrollTop: Math.max(0, Math.min(centerScrollTop, newScrollHeight)),
  }
}

/**
 * Decides which scroll adjustment (if any) to apply after a zoom-level change.
 *
 * Returns `null` when no adjustment is needed (old and new scroll extents are
 * identical), otherwise returns the target `{ scrollLeft, scrollTop }`.
 */
export function calculateScrollAdjustment({
  hasScrolled,
  scrollLeft,
  scrollTop,
  oldScrollWidth,
  oldScrollHeight,
  newScrollWidth,
  newScrollHeight,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
}: {
  hasScrolled: boolean
  scrollLeft: number
  scrollTop: number
  oldScrollWidth: number
  oldScrollHeight: number
  newScrollWidth: number
  newScrollHeight: number
  imageWidth: number
  imageHeight: number
  containerWidth: number
  containerHeight: number
}): { scrollLeft: number; scrollTop: number } | null {
  // Nothing to do if the scrollable area hasn't changed
  if (newScrollWidth === oldScrollWidth && newScrollHeight === oldScrollHeight) {
    return null
  }

  if (hasScrolled && oldScrollWidth > 0 && oldScrollHeight > 0) {
    return calculateProportionalScroll({
      scrollLeft,
      scrollTop,
      oldScrollWidth,
      oldScrollHeight,
      newScrollWidth,
      newScrollHeight,
    })
  }

  return calculateCenteredScroll({
    imageWidth,
    imageHeight,
    containerWidth,
    containerHeight,
    newScrollWidth,
    newScrollHeight,
  })
}

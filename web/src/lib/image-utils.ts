/**
 * Compute the CSS display dimensions of an image fitted inside a container,
 * preserving aspect ratio using "contain" (letterbox) semantics.
 *
 * If the image is smaller than the container it is shown at its natural size.
 * Otherwise it is scaled down to fit, constrained by whichever axis is tighter.
 *
 * Used by both the imageLoader (for initial resolution-tier selection) and
 * ImageView.calculateDimensions (for the live display size), so both always
 * apply the exact same fit logic.
 */
export function computeFitDimensions(
  imageW: number,
  imageH: number,
  containerW: number,
  containerH: number,
): { width: number; height: number } {
  // Image fits inside container without scaling
  if (imageW <= containerW && imageH <= containerH) {
    return { width: imageW, height: imageH }
  }
  const imageAspect = imageW / imageH
  const containerAspect = containerW / containerH
  if (imageAspect > containerAspect) {
    // Width-constrained (landscape image in portrait container, or any wider-than-tall fit)
    return { width: containerW, height: containerW / imageAspect }
  }
  // Height-constrained (portrait image, or taller-than-wide fit)
  return { width: containerH * imageAspect, height: containerH }
}

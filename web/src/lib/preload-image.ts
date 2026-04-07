/**
 * Preloads an image and returns the loaded HTMLImageElement.
 *
 * Also injects a <link rel="preload" as="image"> into the document head so that
 * Safari (and other browsers) share a single preload cache entry between this
 * JavaScript Image() request and any subsequent <img> DOM elements using the
 * same URL.  Without the link hint, Safari maintains separate in-memory caches
 * for new Image() and <img src>, causing a visible re-download / flash when the
 * route renders the image element after the loader resolves.
 */
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  // Inject the preload hint first so the browser fetch lands in the shared cache
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = src
  document.head.appendChild(link)

  return new Promise((resolve, reject) => {
    const img = new Image()
    const cleanup = () => link.remove()
    img.onload = () => {
      cleanup()
      resolve(img)
    }
    img.onerror = (e) => {
      cleanup()
      reject(e)
    }
    img.onabort = (e) => {
      cleanup()
      reject(e)
    }
    img.src = src
  })
}

/**
 * Same as preloadImage but only for background/progressive upgrades — uses a
 * <link rel="preload"> hint so the loaded image lands in the shared browser
 * cache and renders flicker-free when assigned to an <img> src.
 */
export const preloadImageBackground = (src: string): Promise<HTMLImageElement> => preloadImage(src)

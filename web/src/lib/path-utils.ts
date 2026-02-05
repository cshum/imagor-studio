/**
 * Path utility functions for handling image paths
 * Provides conversion between galleryKey/imageKey pairs and full imagePath
 */

/**
 * Combine galleryKey and imageKey into a full image path
 * @param galleryKey - Folder path (empty string for root)
 * @param imageKey - Image filename
 * @returns Full image path
 *
 * @example
 * joinImagePath("gallery1", "image.jpg") // "gallery1/image.jpg"
 * joinImagePath("", "image.jpg") // "image.jpg"
 * joinImagePath("a/b/c", "image.jpg") // "a/b/c/image.jpg"
 */
export function joinImagePath(galleryKey: string, imageKey: string): string {
  return galleryKey ? `${galleryKey}/${imageKey}` : imageKey
}

/**
 * Split an image path into galleryKey and imageKey components
 * @param imagePath - Full image path (e.g., "gallery1/subfolder/image.jpg" or "image.jpg")
 * @returns Object with galleryKey (folder path) and imageKey (filename)
 *
 * @example
 * splitImagePath("gallery1/image.jpg") // { galleryKey: "gallery1", imageKey: "image.jpg" }
 * splitImagePath("image.jpg") // { galleryKey: "", imageKey: "image.jpg" }
 * splitImagePath("a/b/c/image.jpg") // { galleryKey: "a/b/c", imageKey: "image.jpg" }
 */
export function splitImagePath(imagePath: string): { galleryKey: string; imageKey: string } {
  const lastSlashIndex = imagePath.lastIndexOf('/')

  if (lastSlashIndex < 0) {
    // No slash found - root level image
    return { galleryKey: '', imageKey: imagePath }
  }

  return {
    galleryKey: imagePath.substring(0, lastSlashIndex),
    imageKey: imagePath.substring(lastSlashIndex + 1),
  }
}

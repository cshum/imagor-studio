const DEFAULT_VIDEO_EXTENSIONS = '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg'

/**
 * Check if a file is a video file based on its extension
 * @param filename - The filename to check
 * @param videoExtensions - Optional comma-separated list of video extensions
 * @returns true if the file is a video file
 */
export function isVideoFile(filename: string, videoExtensions?: string): boolean {
  const extensions = videoExtensions || DEFAULT_VIDEO_EXTENSIONS
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return extensions.toLowerCase().includes(ext)
}

/**
 * Check if a file is an image file based on its extension
 * @param filename - The filename to check
 * @param imageExtensions - Optional comma-separated list of image extensions
 * @returns true if the file is an image file
 */
export function isImageFile(filename: string, imageExtensions?: string): boolean {
  const defaultImageExtensions =
    '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif'
  const extensions = imageExtensions || defaultImageExtensions
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return extensions.toLowerCase().includes(ext)
}

/**
 * Get the file type (image, video, or unknown) based on the filename
 * @param filename - The filename to check
 * @param imageExtensions - Optional comma-separated list of image extensions
 * @param videoExtensions - Optional comma-separated list of video extensions
 * @returns 'image', 'video', or 'unknown'
 */
export function getFileType(
  filename: string,
  imageExtensions?: string,
  videoExtensions?: string,
): 'image' | 'video' | 'unknown' {
  if (isVideoFile(filename, videoExtensions)) {
    return 'video'
  }
  if (isImageFile(filename, imageExtensions)) {
    return 'image'
  }
  return 'unknown'
}

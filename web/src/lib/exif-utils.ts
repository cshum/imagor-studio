import { ImageInfo } from '@/components/image-gallery/image-view-info.tsx'

export interface ImagorMetadata {
  width?: number
  height?: number
  format?: string
  exif?: {
    [key: string]: string
  }
  // Video metadata fields
  content_type?: string
  orientation?: number
  duration?: number // milliseconds
  title?: string
  fps?: number
  has_video?: boolean
  has_audio?: boolean
}

/**
 * Fetch EXIF data from imagor meta API
 */
export const fetchImageMetadata = async (metaUrl: string): Promise<ImagorMetadata | null> => {
  try {
    const response = await fetch(metaUrl)
    if (!response.ok) {
      console.warn(`Failed to fetch metadata from ${metaUrl}: ${response.status}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn(`Error fetching metadata from ${metaUrl}:`, error)
    return null
  }
}

/**
 * Convert imagor metadata to ImageInfo format
 * Simply uses the EXIF data as-is from imagor (string to string)
 */
export const convertMetadataToImageInfo = (
  metadata: ImagorMetadata | null,
  imageName: string,
  galleryKey?: string,
): ImageInfo => {
  const exifData: { [key: string]: string } = {
    'File Name': imageName,
    Gallery: galleryKey || 'Unknown',
  }

  // Add basic image/video info
  if (metadata) {
    if (metadata.width) exifData.Width = metadata.width.toString()
    if (metadata.height) exifData.Height = metadata.height.toString()
    if (metadata.format) exifData.Format = metadata.format

    // Add video-specific metadata
    if (metadata.content_type) exifData['Content Type'] = metadata.content_type
    if (metadata.duration) {
      const durationSeconds = Math.round(metadata.duration / 1000)
      const minutes = Math.floor(durationSeconds / 60)
      const seconds = durationSeconds % 60
      exifData.Duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    if (metadata.fps) exifData['Frame Rate'] = `${metadata.fps.toFixed(1)} fps`
    if (metadata.has_video !== undefined) exifData['Has Video'] = metadata.has_video ? 'Yes' : 'No'
    if (metadata.has_audio !== undefined) exifData['Has Audio'] = metadata.has_audio ? 'Yes' : 'No'
    if (metadata.title) exifData.Title = metadata.title
    if (metadata.orientation) exifData.Orientation = metadata.orientation.toString()
  }

  // Add all EXIF data from imagor as-is (string to string)
  if (metadata?.exif) {
    Object.entries(metadata.exif).forEach(([key, value]) => {
      // Convert camelCase or PascalCase to readable format by adding spaces
      // Handle acronyms properly (e.g., GPSAltitude -> GPS Altitude, not G P S Altitude)
      const readableKey = key
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Add space between acronym and word
        .trim()
      exifData[readableKey] = value
    })
  }

  return {
    exif: exifData,
  }
}

import { ImageInfo } from '@/components/image-gallery/image-view-info.tsx'

export interface ImagorMetadata {
  width?: number
  height?: number
  format?: string
  exif?: {
    [key: string]: string
  }
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

  // Add basic image info
  if (metadata) {
    if (metadata.width) exifData.Width = metadata.width.toString()
    if (metadata.height) exifData.Height = metadata.height.toString()
    if (metadata.format) exifData.Format = metadata.format
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

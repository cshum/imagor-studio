import { ImageInfo } from '@/components/image-gallery/image-info-view'

// Types for loader data
export interface ImageProps {
  id: string;
  src: string;
  alt: string;
}

export interface FolderProps {
  id: string;
  name: string;
}

export interface HomeLoaderData {
  images: ImageProps[];
  folders: FolderProps[];
}

export interface ImageLoaderData extends HomeLoaderData {
  selectedImage: (ImageProps & { info?: ImageInfo }) | null;
  selectedImageIndex: number | null;
  preloadedFullSizeImage?: string;
}

export const generateDummyImages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    src: `https://picsum.photos/id/${(i + 1) % 1000}/300/225`,
    alt: `Random image ${i + 1}`,
  }))
}


// Helper function to generate folders
const generateDummyFolders = (): FolderProps[] => [
  { id: '1', name: 'Vacation Photos' },
  { id: '2', name: 'Work Projects' },
  { id: '3', name: 'Family Events' },
  { id: '4', name: 'Hobbies' },
  { id: '5', name: 'Miscellaneous' },
  { id: '6', name: 'Documents' },
  { id: '7', name: 'Music' },
  { id: '8', name: 'Videos' },
]

// Helper function to generate image info
const generateImageInfo = (): ImageInfo => ({
  exif: {
    "Camera": "Canon EOS 5D Mark IV",
    "Lens": "EF 24-70mm f/2.8L II USM",
    "Focal Length": "50mm",
    "Aperture": "f/4.0",
    "Shutter Speed": "1/250s",
    "ISO": "100",
    "Date Taken": "2023-09-15 14:30:22",
    "GPS Coordinates": "40°42'46.0\"N 74°00'21.0\"W",
    "File Size": "24.5 MB",
    "Color Space": "sRGB",
    "Software": "Adobe Lightroom Classic 10.0"
  }
})

// Helper function to preload an image
const preloadImage = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(src)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Loader for the home page
 * Generates dummy images and folders data
 */
export const homeLoader = async (): Promise<HomeLoaderData> => {
  try {
    // Generate dummy data
    const images = generateDummyImages(10000)
    const folders = generateDummyFolders()

    return {
      images,
      folders
    }
  } catch (error) {
    console.error('Error loading home data:', error)
    // Return empty arrays as fallback
    return {
      images: [],
      folders: []
    }
  }
}

/**
 * Loader for the image detail page
 * Generates data and preloads the selected image
 */
export const imageLoader = async ({
                                    params,
                                    location
                                  }: {
  params: { id: string };
  location: { state?: { direction?: -1 | 1 } }
}): Promise<ImageLoaderData> => {
  // Generate all images and folders (same as home route)
  const images = generateDummyImages(10000)
  const folders = generateDummyFolders()

  // Find the selected image
  const selectedImageData = images.find(img => img.id === params.id)

  if (!selectedImageData) {
    return {
      images,
      folders,
      selectedImage: null,
      selectedImageIndex: null,
    }
  }

  const selectedImageIndex = images.findIndex(img => img.id === params.id)

  // Create full-size image URL
  const fullSizeSrc = selectedImageData.src.replace('/300/225', '/1200/900')

  // Preload the full-size image only if not coming from navigation with direction
  // (i.e., when directly accessing the URL or refreshing)
  let preloadedFullSizeImage: string | undefined

  if (!location.state?.direction) {
    await preloadImage(fullSizeSrc)
  }

  const selectedImage: ImageProps & { info?: ImageInfo } = {
    ...selectedImageData,
    src: fullSizeSrc,
    info: generateImageInfo()
  }

  return {
    images,
    folders,
    selectedImage,
    selectedImageIndex,
    preloadedFullSizeImage,
  }
}

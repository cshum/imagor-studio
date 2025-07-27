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

export interface GalleryLoaderData {
  images: ImageProps[];
  folders: FolderProps[];
  galleryKey: string;
}

export interface ImageLoaderData {
  selectedImage: (ImageProps & { info?: ImageInfo });
  selectedImageIndex: number;
  galleryKey: string;
}

export const generateDummyImages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    src: `https://placedog.net/300/225?id=${(i + 1) % 1000}`,
    alt: `Random image ${i + 1}`,
  }))
}

// Helper function to generate folders based on gallery key
const generateDummyFolders = (galleryKey?: string): FolderProps[] => {
  const baseFolders = [
    { id: '1', name: 'Vacation Photos' },
    { id: '2', name: 'Work Projects' },
    { id: '3', name: 'Family Events' },
    { id: '4', name: 'Hobbies' },
    { id: '5', name: 'Miscellaneous' },
    { id: '6', name: 'Documents' },
    { id: '7', name: 'Music' },
    { id: '8', name: 'Videos' },
  ]

  // Customize folder names based on gallery key
  if (galleryKey) {
    return baseFolders.map(folder => ({
      ...folder,
      name: `${galleryKey} - ${folder.name}`
    }))
  }

  return baseFolders
}

// Helper function to generate image info
const generateImageInfo = (galleryKey?: string): ImageInfo => ({
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
    "Software": "Adobe Lightroom Classic 10.0",
    "Gallery": galleryKey || "Unknown"
  }
})

// Helper function to preload an image
const preloadImage = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img.src)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Updated loader for the gallery page with galleryKey support
 * Generates dummy images and folders data based on gallery key
 */
export const galleryLoader = async (galleryKey: string): Promise<GalleryLoaderData> => {
  // Generate different content based on gallery key
  const imageCount = galleryKey === 'favorites' ? 123 :
    galleryKey === 'recent' ? 89 :
      246 // default count

  const images = generateDummyImages(imageCount)
  const folders = generateDummyFolders(galleryKey)

  return {
    images,
    folders,
    galleryKey
  }
}

/**
 * Updated loader for the image detail page with galleryKey support
 * Generates data and preloads the selected image
 */
export const imageLoader = async ({ params }: {
  params: { id: string; galleryKey: string };
}): Promise<ImageLoaderData> => {
  const { id, galleryKey } = params

  // Generate all images for this gallery (same as gallery route)
  const imageCount = galleryKey === 'favorites' ? 123 :
    galleryKey === 'recent' ? 89 :
      246 // default count

  const images = generateDummyImages(imageCount)

  // Find the selected image
  const selectedImageData = images.find(img => img.id === id)

  if (!selectedImageData) {
    throw new Error('not found')
  }

  const selectedImageIndex = images.findIndex(img => img.id === id)

  const fullSizeSrc = selectedImageData.src.replace('/300/225', '/1200/900')

  await preloadImage(fullSizeSrc)

  const selectedImage: ImageProps & { info?: ImageInfo } = {
    ...selectedImageData,
    src: fullSizeSrc,
    info: generateImageInfo(galleryKey)
  }

  return {
    selectedImage,
    selectedImageIndex,
    galleryKey
  }
}

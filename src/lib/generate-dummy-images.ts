export const generateDummyImages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    src: `https://picsum.photos/id/${(i + 1) % 1000}/300/225`,
    alt: `Random image ${i + 1}`,
  }))
}

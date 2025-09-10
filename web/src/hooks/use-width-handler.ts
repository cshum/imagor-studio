import { RefObject, useCallback, useEffect, useState } from 'react'

export const useWidthHandler = (
  contentRef: RefObject<HTMLDivElement | null>,
  sidebarOpen = false,
  padding: number = 48, // Add padding argument with default value
) => {
  const [contentWidth, setContentWidth] = useState(0)

  const updateWidth = useCallback(() => {
    if (contentRef.current) {
      const calculatedWidth = contentRef.current.offsetWidth - padding // Use the padding argument
      setContentWidth(calculatedWidth)
    }
  }, [contentRef, padding])

  useEffect(() => {
    updateWidth()

    const transitionDuration = 200 // sidebar transition duration
    const timeoutId = setTimeout(() => {
      updateWidth() // Recalculate width after sidebar transition
    }, transitionDuration)

    return () => clearTimeout(timeoutId) // Cleanup timeout on unmount
  }, [updateWidth, sidebarOpen])

  return {
    contentWidth,
    updateWidth, // Return the updateWidth function so it can be used in resize handling
  }
}

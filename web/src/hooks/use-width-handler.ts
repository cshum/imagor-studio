import { RefObject, useCallback, useEffect, useState } from 'react'

export const useWidthHandler = (
  contentRef: RefObject<HTMLDivElement | null>,
  padding: number = 48, // Add padding argument with default value
) => {
  const [contentWidth, setContentWidth] = useState(0)

  const updateWidth = useCallback(() => {
    if (contentRef.current) {
      const calculatedWidth = contentRef.current.offsetWidth - padding // Use the padding argument
      setContentWidth(calculatedWidth)
    }
  }, [contentRef, padding])

  return {
    contentWidth,
    updateWidth, // Return the updateWidth function so it can be used in resize handling
  }
}

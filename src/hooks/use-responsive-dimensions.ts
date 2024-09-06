import { useCallback, useEffect, useRef, useState } from 'react'
import { debounce } from '@/lib/debounce'
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider'

export function useResponsiveDimensions() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isOpen } = useSidebarToggle();

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  const debouncedUpdateDimensions = useCallback(() => {
    return debounce(() => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }, 250);
  }, []);

  useEffect(() => {
    const handleResize = debouncedUpdateDimensions();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [debouncedUpdateDimensions]);

  useEffect(() => {
    const timeoutId = setTimeout(updateDimensions, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, updateDimensions]);

  useEffect(() => {
    updateDimensions();
  }, [updateDimensions]);

  return { dimensions, containerRef };
}

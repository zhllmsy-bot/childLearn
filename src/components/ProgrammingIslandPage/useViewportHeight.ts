import { useEffect, useState } from 'react';

export function useViewportHeight(fallback = 820) {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? fallback : window.innerHeight,
  );

  useEffect(() => {
    const handleResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return height;
}

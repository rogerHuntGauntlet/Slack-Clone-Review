import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Create a MediaQueryList object
    const media = window.matchMedia(query)
    
    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    // Define listener function
    const listener = () => setMatches(media.matches)

    // Add listener for subsequent changes
    media.addEventListener('change', listener)

    // Clean up function
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
} 
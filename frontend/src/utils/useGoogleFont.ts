import { useEffect } from "react";

export function useGoogleFont(fonts: string | string[]): void {
  useEffect(() => {
    // Normalize input to always be an array for consistent handling
    const fontList = Array.isArray(fonts) ? fonts : [fonts];
    if (fontList.length === 0) return;

    // Generate a unique, deterministic ID based on the font names to prevent duplicate injections
    const fontId = `gfont-${fontList.map(f => f.replace(/[^a-zA-Z0-9]/g, '')).join('-')}`;
    
    // If the font is already loaded, skip
    if (document.getElementById(fontId)) return;

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    
    // Dynamically build the Google Fonts query string
    const familyQuery = fontList.map(font => `family=${encodeURIComponent(font)}`).join('&');
    link.href = `https://fonts.googleapis.com/css2?${familyQuery}&display=swap`;
    
    document.head.appendChild(link);

    // Cleanup: remove the <link> tag when the component unmounts
    return () => {
      const element = document.getElementById(fontId);
      if (element) {
        document.head.removeChild(element);
      }
    };
  }, [fonts]);
}
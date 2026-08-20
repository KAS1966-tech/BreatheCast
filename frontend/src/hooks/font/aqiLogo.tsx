import React from "react";

/* ============================================================================
 * AQI Logo System — BreatheCast
 * ==========================================================================*/

/* --------------------------------------------------------------------------
 * AqiMark — Icon Only (Shield + Wind + Spectrum)
 * --------------------------------------------------------------------------
 * The core brand mark featuring the protective shield with flowing
 * wind waves and the AQI spectrum gradient.
 *
 * Usage:
 *   <AqiMark className="h-8 w-8" />
 *   <AqiMark className="h-12 text-[var(--bc-accent-strong)]" />
 * ----------------------------------------------------------------------- */
export const AqiMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 512 512"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      {/* AQI Spectrum Gradient — matches app's clean→polluted range */}
      <linearGradient
        id="aqiSpectrum"
        x1="60"
        y1="120"
        x2="450"
        y2="390"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="45%" stopColor="#06B6D4" />
        <stop offset="75%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
      {/* Subtle glow for the shield */}
      <filter id="aqiGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Weather Radar Outer Ring */}
    <circle
      cx="256"
      cy="256"
      r="180"
      stroke="url(#aqiSpectrum)"
      strokeWidth="6"
      strokeOpacity="0.25"
      strokeDasharray="16 12"
    />

    {/* Weather Shield Base Contour */}
    <path
      d="M256 100 C320 100 370 115 370 115 V240 C370 330 290 395 256 412 C222 395 142 330 142 240 V115 C142 115 192 100 256 100 Z"
      stroke="url(#aqiSpectrum)"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      filter="url(#aqiGlow)"
    />

    {/* Shifting Dynamic Wind Wave 1 (Upper Flow) */}
    <path
      d="M110 230 C 180 180, 230 290, 310 210 C 340 180, 390 200, 410 220"
      stroke="url(#aqiSpectrum)"
      strokeWidth="16"
      strokeLinecap="round"
      fill="none"
    />

    {/* Shifting Dynamic Wind Wave 2 (Lower Wind Loop) */}
    <path
      d="M100 280 C 170 230, 220 340, 310 270 C 350 240, 380 260, 400 270"
      stroke="url(#aqiSpectrum)"
      strokeWidth="10"
      strokeLinecap="round"
      strokeOpacity="0.85"
      fill="none"
    />

    {/* Embedded Sleek Wind Swirl Feature */}
    <path
      d="M280 210 C 300 190, 330 190, 340 210 C 348 226, 332 240, 318 232"
      stroke="url(#aqiSpectrum)"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />

    {/* AQI Data Points / Orbiting Particles */}
    <circle cx="310" cy="210" r="7" fill="#10B981" />
    <circle cx="370" cy="115" r="5" fill="#EF4444" opacity="0.8" />
    <circle cx="142" cy="115" r="5" fill="#10B981" opacity="0.8" />
  </svg>
);

/* --------------------------------------------------------------------------
 * AqiMarkSimple — Simplified Icon (No Background)
 * --------------------------------------------------------------------------
 * A cleaner version without the radar ring, optimized for small sizes
 * and when you need a minimal mark.
 *
 * Usage:
 *   <AqiMarkSimple className="h-6 w-6" />
 * ----------------------------------------------------------------------- */
export const AqiMarkSimple: React.FC<{ className?: string }> = ({
  className,
}) => (
  <svg
    viewBox="0 0 512 512"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="aqiSpectrumSimple"
        x1="60"
        y1="120"
        x2="450"
        y2="390"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="45%" stopColor="#06B6D4" />
        <stop offset="75%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>

    {/* Shield Contour */}
    <path
      d="M256 100 C320 100 370 115 370 115 V240 C370 330 290 395 256 412 C222 395 142 330 142 240 V115 C142 115 192 100 256 100 Z"
      stroke="url(#aqiSpectrumSimple)"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* Primary Wind Wave */}
    <path
      d="M110 230 C 180 180, 230 290, 310 210 C 340 180, 390 200, 410 220"
      stroke="url(#aqiSpectrumSimple)"
      strokeWidth="16"
      strokeLinecap="round"
      fill="none"
    />

    {/* Data Point */}
    <circle cx="310" cy="210" r="7" fill="#10B981" />
  </svg>
);

/* --------------------------------------------------------------------------
 * AqiLogo — Full Logo (Icon + Wordmark)
 * --------------------------------------------------------------------------
 * The complete horizontal logo with the AQI mark and "BreatheCast"
 * wordmark using your app's Fraunces display font.
 *
 * Usage:
 *   <AqiLogo className="h-10" />
 *   <AqiLogo className="h-16 w-auto" />
 * ----------------------------------------------------------------------- */
export const AqiLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 640 120"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="BreatheCast"
    role="img"
  >
    <defs>
      <linearGradient
        id="aqiSpectrumLogo"
        x1="0"
        y1="0"
        x2="120"
        y2="120"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="45%" stopColor="#06B6D4" />
        <stop offset="75%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>

    {/* Icon (scaled down) */}
    <g transform="translate(0, 0) scale(0.23)">
      <path
        d="M256 100 C320 100 370 115 370 115 V240 C370 330 290 395 256 412 C222 395 142 330 142 240 V115 C142 115 192 100 256 100 Z"
        stroke="url(#aqiSpectrumLogo)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M110 230 C 180 180, 230 290, 310 210 C 340 180, 390 200, 410 220"
        stroke="url(#aqiSpectrumLogo)"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="310" cy="210" r="7" fill="#10B981" />
    </g>

    {/* Wordmark */}
    <text
      x="135"
      y="78"
      fontFamily="Fraunces, Georgia, serif"
      fontSize="52"
      fontWeight="600"
      fill="currentColor"
      letterSpacing="0.01em"
    >
      Breathe
      <tspan fontWeight="400" opacity="0.75">
        Cast
      </tspan>
    </text>
  </svg>
);

/* --------------------------------------------------------------------------
 * AqiWordmark — Text Only
 * --------------------------------------------------------------------------
 * Just the "BreatheCast" wordmark for tight spaces or when paired
 * with a separate icon.
 *
 * Usage:
 *   <AqiWordmark className="h-8" />
 * ----------------------------------------------------------------------- */
export const AqiWordmark: React.FC<{ className?: string }> = ({
  className,
}) => (
  <svg
    viewBox="0 0 280 60"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="BreatheCast"
    role="img"
  >
    <text
      x="0"
      y="48"
      fontFamily="Fraunces, Georgia, serif"
      fontSize="52"
      fontWeight="600"
      fill="currentColor"
      letterSpacing="0.01em"
    >
      Breathe
      <tspan fontWeight="400" opacity="0.75">
        Cast
      </tspan>
    </text>
  </svg>
);

/* ============================================================================
 * AQI Favicon System
 * ==========================================================================*/

/* --------------------------------------------------------------------------
 * AqiFavicon — Core Favicon Component
 * --------------------------------------------------------------------------
 * Optimized for 16x16, 32x32, 48x48 sizes.
 * Uses simplified geometry for clarity at small scales.
 *
 * Props:
 *   size   — Icon size in pixels (default: 32)
 *   theme  — 'light' | 'dark' | 'color' (default: 'color')
 *            'light' = white icon on transparent (for dark backgrounds)
 *            'dark' = dark icon on transparent (for light backgrounds)
 *            'color' = full AQI spectrum gradient
 *
 * Usage:
 *   <AqiFavicon size={32} theme="color" />
 *   <AqiFavicon size={16} theme="light" />
 * ----------------------------------------------------------------------- */
export const AqiFavicon: React.FC<{
  size?: 16 | 32 | 48 | 64;
  theme?: "light" | "dark" | "color";
}> = ({ size = 32, theme = "color" }) => {
  const viewBoxSize = 32;
  const strokeWidth = size <= 16 ? 2 : size <= 32 ? 2.5 : 3;

  if (theme === "color") {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="BreatheCast AQI"
      >
        <defs>
          <linearGradient id="aqiFaviconGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>

        {/* Shield outline */}
        <path
          d="M16 4 C20 4 23 5 23 5 V15 C23 21 19 25 16 27 C13 25 9 21 9 15 V5 C9 5 12 4 16 4 Z"
          fill="none"
          stroke="url(#aqiFaviconGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Wind wave */}
        <path
          d="M8 14 C11 12, 14 17, 18 13 C20 11, 22 12, 23 13"
          fill="none"
          stroke="url(#aqiFaviconGrad)"
          strokeWidth={strokeWidth * 0.8}
          strokeLinecap="round"
        />

        {/* Data point */}
        <circle cx="18" cy="13" r={size <= 16 ? 1.5 : 2} fill="#10B981" />
      </svg>
    );
  }

  // Monochrome versions for light/dark themes
  const strokeColor = theme === "light" ? "#FFFFFF" : "#1F2937";
  const fillColor = theme === "light" ? "#FFFFFF" : "#10B981";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BreatheCast AQI"
    >
      {/* Shield outline */}
      <path
        d="M16 4 C20 4 23 5 23 5 V15 C23 21 19 25 16 27 C13 25 9 21 9 15 V5 C9 5 12 4 16 4 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Wind wave */}
      <path
        d="M8 14 C11 12, 14 17, 18 13 C20 11, 22 12, 23 13"
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Data point */}
      <circle cx="18" cy="13" r={size <= 16 ? 1.5 : 2} fill={fillColor} />
    </svg>
  );
};

/* --------------------------------------------------------------------------
 * AqiFaviconSVG — Raw SVG String for HTML Head
 * --------------------------------------------------------------------------
 * Returns a data URI-compatible SVG string for use in <link> tags.
 * Best for static favicons that don't need React rendering.
 *
 * Usage in HTML:
 *   <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,..." />
 *
 * Or save as /favicon.svg and reference:
 *   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
 * ----------------------------------------------------------------------- */
const AQI_FAVICON_SVG = `
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs>
    <linearGradient id="aqiGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="50%" stop-color="#06B6D4"/>
        <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
    </defs>
    
    <!-- Shield -->
    <path d="M16 4 C20 4 23 5 23 5 V15 C23 21 19 25 16 27 C13 25 9 21 9 15 V5 C9 5 12 4 16 4 Z" 
        fill="none" 
        stroke="url(#aqiGrad)" 
        stroke-width="2.5" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
    
    <!-- Wind -->
    <path d="M8 14 C11 12, 14 17, 18 13 C20 11, 22 12, 23 13" 
        fill="none" 
        stroke="url(#aqiGrad)" 
        stroke-width="2" 
        stroke-linecap="round"/>
    
    <!-- Data point -->
    <circle cx="18" cy="13" r="2" fill="#10B981"/>
</svg>
`.trim();

/* --------------------------------------------------------------------------
 * AqiFaviconSet — Complete Favicon Set Component
 * --------------------------------------------------------------------------
 * Renders multiple sizes for different device contexts.
 * Use this in your layout/header for comprehensive favicon support.
 *
 * Usage:
 *   <AqiFaviconSet />
 * ----------------------------------------------------------------------- */
export const AqiFaviconSet: React.FC = () => {
  return (
    <>
      {/* Standard favicon for browsers */}
      <link
        rel="icon"
        type="image/svg+xml"
        href={`data:image/svg+xml,${encodeURIComponent(AQI_FAVICON_SVG)}`}
      />

      {/* Apple Touch Icon (180x180 for iOS) */}
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href={`data:image/svg+xml,${encodeURIComponent(
          generateAppleTouchIcon(),
        )}`}
      />

      {/* Android Chrome Icon (192x192) */}
      <link
        rel="icon"
        type="image/svg+xml"
        sizes="192x192"
        href={`data:image/svg+xml,${encodeURIComponent(
          generateAndroidIcon(192),
        )}`}
      />

      {/* Android Chrome Icon (512x512) */}
      <link
        rel="icon"
        type="image/svg+xml"
        sizes="512x512"
        href={`data:image/svg+xml,${encodeURIComponent(
          generateAndroidIcon(512),
        )}`}
      />
    </>
  );
};

/* --------------------------------------------------------------------------
 * Helper: Generate Apple Touch Icon SVG
 * ----------------------------------------------------------------------- */
function generateAppleTouchIcon(): string {
  return `
<svg width="180" height="180" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="appleGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="50%" stop-color="#06B6D4"/>
        <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
    </defs>
    <rect width="32" height="32" rx="6" fill="#0F172A"/>
    <g transform="translate(0, 0) scale(0.9) translate(1.6, 1.6)">
        <path d="M16 4 C20 4 23 5 23 5 V15 C23 21 19 25 16 27 C13 25 9 21 9 15 V5 C9 5 12 4 16 4 Z" 
            fill="none" stroke="url(#appleGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 14 C11 12, 14 17, 18 13 C20 11, 22 12, 23 13" 
            fill="none" stroke="url(#appleGrad)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="18" cy="13" r="2" fill="#10B981"/>
    </g>
    </svg>
        `.trim();
}

/* --------------------------------------------------------------------------
 * Helper: Generate Android Icon SVG
 * ----------------------------------------------------------------------- */
function generateAndroidIcon(size: number): string {
  const scale = size / 32;
  const strokeWidth = 2.5 * scale;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="androidGrad${size}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="50%" stop-color="#06B6D4"/>
        <stop offset="100%" stop-color="#EF4444"/>
        </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${6 * scale}" fill="#0F172A"/>
    <g transform="scale(${scale * 0.9}) translate(${(size / scale - size) / 2}, ${(size / scale - size) / 2})">
        <path d="M16 4 C20 4 23 5 23 5 V15 C23 21 19 25 16 27 C13 25 9 21 9 15 V5 C9 5 12 4 16 4 Z" 
            fill="none" stroke="url(#androidGrad${size})" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 14 C11 12, 14 17, 18 13 C20 11, 22 12, 23 13" 
          fill="none" stroke="url(#androidGrad${size})" stroke-width="${strokeWidth * 0.8}" stroke-linecap="round"/>
    <circle cx="18" cy="13" r="${2 * scale}" fill="#10B981"/>
    </g>
    </svg>
        `.trim();
}

/* --------------------------------------------------------------------------
 * AqiMaskableIcon — For Android Adaptive Icons
 * --------------------------------------------------------------------------
 * A version optimized for maskable icons (safe zone centered).
 *
 * Usage:
 *   <AqiMaskableIcon size={192} />
 * ----------------------------------------------------------------------- */
export const AqiMaskableIcon: React.FC<{ size?: number }> = ({
    size = 192,
    }) => {
    const viewBoxSize = 32;

    return (
        <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        xmlns="http://www.w3.org/2000/svg"
        >
        <defs>
            <linearGradient id="maskableGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
        </defs>

        {/* Background */}
        <rect width={viewBoxSize} height={viewBoxSize} rx="4" fill="#0F172A" />

        {/* Shield - centered with safe zone padding */}
        <g transform="translate(2, 2) scale(0.875)">
            <path
            d="M16 4 C20 4 23 5 23 5 V15 C23 21 19 25 16 27 C13 25 9 21 9 15 V5 C9 5 12 4 16 4 Z"
            fill="none"
            stroke="url(#maskableGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            />
            <path
            d="M8 14 C11 12, 14 17, 18 13 C20 11, 22 12, 23 13"
            fill="none"
            stroke="url(#maskableGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            />
            <circle cx="18" cy="13" r="2" fill="#10B981" />
        </g>
        </svg>
    );
    };

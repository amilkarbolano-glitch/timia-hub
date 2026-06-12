import React from 'react';

// ─── Timia Logo components ────────────────────────────────────────────────────
//
// TimiaWordmark  — full "TIMIA" wordmark (light = white text for dark bg)
// TimiaMark      — compact A-mark icon (used where space is tight)

// ── Wordmark ──────────────────────────────────────────────────────────────────
// Uses the official SVG from timia.ai for the light (white) variant.
// Dark variant is an inline SVG recreation for white backgrounds.

interface WordmarkProps {
  /** 'light' = white text for dark backgrounds (uses official asset)
   *  'dark'  = dark text for light backgrounds (inline SVG recreation)  */
  variant?: 'light' | 'dark';
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TimiaWordmark({ variant = 'dark', height = 32, className, style }: WordmarkProps) {
  if (variant === 'light') {
    // Official asset — white text, works on dark backgrounds
    return (
      <img
        src="https://timia.ai/wp-content/uploads/2026/01/Logo-Timia-Claro.svg"
        alt="TIMIA"
        height={height}
        style={{ display: 'block', ...style }}
        className={className}
      />
    );
  }

  // Dark variant — inline SVG, works on white / light backgrounds
  // Approximates the brand: bold geometric sans-serif + crimson bar under the A
  const w = Math.round(height * 3.8);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 190 46"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TIMIA"
      className={className}
      style={style}
    >
      <text
        x="0"
        y="38"
        fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="900"
        fontSize="44"
        fill="#0d0d0d"
        letterSpacing="-1"
      >
        TIMIA
      </text>
      {/* Crimson accent bar under the "A" */}
      <rect x="143" y="41" width="47" height="5" rx="1.5" fill="#881337" />
    </svg>
  );
}

// ── A-mark icon ───────────────────────────────────────────────────────────────
// Compact icon — the distinctive stylised A + crimson bar.
// Used in the header logo area, mobile login, and favicon.

interface MarkProps {
  size?: number;
  /** Background style: 'circle' (white circle, matches favicon)
   *                    'rounded' (dark rounded square, login-style)
   *                    'none'    (transparent)  */
  bg?: 'circle' | 'rounded' | 'none';
  className?: string;
  style?: React.CSSProperties;
}

export function TimiaMark({ size = 32, bg = 'none', className, style }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TIMIA"
      className={className}
      style={style}
    >
      {bg === 'circle' && <circle cx="50" cy="50" r="50" fill="white" />}
      {bg === 'rounded' && <rect width="100" height="100" rx="20" fill="#1a1a2e" />}

      {/* Outer A shape (flat-top, bold legs) */}
      <path d="M 18,74 L 40,22 L 60,22 L 82,74 Z" fill={bg === 'rounded' ? '#ffffff' : '#0d0d0d'} />
      {/* Inner hollow */}
      <path d="M 29,68 L 43,30 L 57,30 L 71,68 Z" fill={bg === 'rounded' ? '#1a1a2e' : 'white'} />
      {/* Crimson accent bar */}
      <rect x="14" y="78" width="72" height="12" rx="2" fill="#881337" />
    </svg>
  );
}

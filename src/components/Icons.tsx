'use client';

import type { CSSProperties } from 'react';

interface IconProps extends React.HTMLAttributes<SVGSVGElement> {
  size?: number | string;
}

const svgBase: CSSProperties = {
  display: 'inline-flex',
  verticalAlign: 'middle' as const,
};

/* ═══════════════ Cross/Close icon (❌) ═══════════════ */

export function CrossIcon({ size = 18 }: IconProps = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ ...svgBase }}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6 L18 18 M6 18 L18 6" />
    </svg>
  );
}

/* ═══════════════ Play icon (▶️) ═══════════════ */

export function PlayIcon({ size = 20 }: IconProps = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ ...svgBase }}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="7,5 19,13 7,19" fill="currentColor" />
    </svg>
  );
}

/* ═══════════════ Pause icon (⏸) ═══════════════ */

export function PauseIcon({ size = 20 }: IconProps = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ ...svgBase }}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
    </svg>
  );
}

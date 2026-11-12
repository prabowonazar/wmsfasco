import React from 'react';

interface IsometricPackageBoxProps {
  type?: 'small' | 'cube' | 'medium' | 'flat' | 'large';
  size?: 'small' | 'cube' | 'medium' | 'flat' | 'large' | number;
  className?: string;
  hasLabel?: boolean;
  hasTape?: boolean;
}

export const IsometricPackageBox: React.FC<IsometricPackageBoxProps> = ({
  type,
  size = 'cube',
  className,
  hasLabel = true,
  hasTape = true,
}) => {
  // Normalize variant key
  const variant = (type || (typeof size === 'string' ? size : 'cube')) as
    | 'small'
    | 'cube'
    | 'medium'
    | 'flat'
    | 'large';

  // Dimension ratios based on box size
  const config = {
    small: { w: 100, h: 70, depth: 35, topY: 18, colorTop: '#DDB17D', colorLeft: '#C89B66', colorRight: '#AF8350' },
    cube: { w: 110, h: 95, depth: 45, topY: 26, colorTop: '#DEB37E', colorLeft: '#C99C67', colorRight: '#B08451' },
    medium: { w: 110, h: 95, depth: 45, topY: 26, colorTop: '#DEB37E', colorLeft: '#C99C67', colorRight: '#B08451' },
    flat: { w: 120, h: 60, depth: 32, topY: 14, colorTop: '#DEB37E', colorLeft: '#C99C67', colorRight: '#B08451' },
    large: { w: 120, h: 105, depth: 50, topY: 30, colorTop: '#DEB37E', colorLeft: '#C99C67', colorRight: '#B08451' },
  }[variant] || { w: 110, h: 95, depth: 45, topY: 26, colorTop: '#DEB37E', colorLeft: '#C99C67', colorRight: '#B08451' };

  const customStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : undefined;

  return (
    <div
      style={customStyle}
      className={`relative flex items-center justify-center select-none ${className || (typeof size === 'number' ? '' : 'w-24 h-24')}`}
    >
      <svg
        viewBox="0 0 140 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md overflow-visible"
      >
        {/* Soft Isometric Ground Shadow */}
        <ellipse
          cx="70"
          cy="98"
          rx="52"
          ry="15"
          fill="rgba(0,0,0,0.18)"
          filter="blur(3px)"
        />

        {/* --- Top Face (Lightest cardboard) --- */}
        <path
          d="M70 18 L116 42 L70 66 L24 42 Z"
          fill={config.colorTop}
          stroke="#9E7342"
          strokeWidth="0.8"
        />

        {/* Top Tape Strip */}
        {hasTape && (
          <path
            d="M63 22 L77 29 L77 62 L63 55 Z"
            fill="#B98953"
            opacity="0.85"
          />
        )}

        {/* --- Left Face (Medium shade) --- */}
        <path
          d="M24 42 L70 66 L70 102 L24 78 Z"
          fill={config.colorLeft}
          stroke="#9E7342"
          strokeWidth="0.8"
        />

        {/* Left Tape Extension */}
        {hasTape && (
          <path
            d="M63 62 L70 66 L70 85 L63 81 Z"
            fill="#B98953"
            opacity="0.85"
          />
        )}

        {/* Shipping Label on Left Face */}
        {hasLabel && (
          <g transform="translate(32, 54) skewY(26) scale(0.85)">
            <rect width="22" height="15" fill="#FFFFFF" rx="1.5" />
            <rect x="2" y="2" width="18" height="2" fill="#18181B" />
            <rect x="2" y="5" width="14" height="1.5" fill="#52525B" />
            <rect x="2" y="8" width="10" height="1" fill="#71717A" />
            {/* Mini barcode lines */}
            <rect x="2" y="10" width="1.5" height="3" fill="#18181B" />
            <rect x="4.5" y="10" width="1" height="3" fill="#18181B" />
            <rect x="6.5" y="10" width="2" height="3" fill="#18181B" />
            <rect x="9.5" y="10" width="1" height="3" fill="#18181B" />
            <rect x="11.5" y="10" width="1.5" height="3" fill="#18181B" />
          </g>
        )}

        {/* Fragile Arrow / Glass Logo Symbol */}
        <g transform="translate(34, 76) skewY(26) scale(0.65)" opacity="0.4">
          <path d="M4 10 L4 4 L1 4 L5 0 L9 4 L6 4 L6 10 Z" fill="#451A03" />
          <path d="M12 10 L12 4 L9 4 L13 0 L17 4 L14 4 L14 10 Z" fill="#451A03" />
        </g>

        {/* --- Right Face (Darkest shade / in shadow) --- */}
        <path
          d="M70 66 L116 42 L116 78 L70 102 Z"
          fill={config.colorRight}
          stroke="#8A5F2E"
          strokeWidth="0.8"
        />

        {/* Right Tape Extension */}
        {hasTape && (
          <path
            d="M70 66 L77 62 L77 81 L70 85 Z"
            fill="#9E703B"
            opacity="0.85"
          />
        )}

        {/* Right Side Handle Cutout or Print */}
        <path
          d="M86 64 L102 56 L102 61 L86 69 Z"
          fill="#784E20"
          opacity="0.45"
          rx="1"
        />

        {/* Corner highlights */}
        <line x1="70" y1="66" x2="70" y2="102" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.3" />
        <line x1="24" y1="42" x2="70" y2="66" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.2" />
      </svg>
    </div>
  );
};

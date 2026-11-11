import React from 'react';

export const LabFlaskArtwork: React.FC<{ className?: string }> = ({ className = 'w-48 sm:w-56 md:w-64 h-auto' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-radial from-[#7554D9]/20 via-[#22C5D9]/15 to-transparent rounded-full blur-2xl transform translate-x-4 translate-y-4" />

      <svg
        viewBox="0 0 240 220"
        className="w-full h-auto drop-shadow-[0_12px_24px_rgba(117,84,217,0.25)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="flaskLiquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B50E8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#7554D9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#5B21B6" stopOpacity="0.98" />
          </linearGradient>

          <linearGradient id="flaskGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#E6F4F8" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#22C5D9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#EDE9FA" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="pillCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C5D9" />
            <stop offset="50%" stopColor="#0891B2" />
            <stop offset="100%" stopColor="#164E63" />
          </linearGradient>

          <linearGradient id="pillGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#CFFAFE" stopOpacity="0.5" />
          </linearGradient>

          <filter id="glassReflection" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ERLENMEYER FLASK */}
        <g transform="translate(60, 10)">
          {/* Flask Shadow */}
          <ellipse cx="60" cy="180" rx="55" ry="10" fill="#7554D9" fillOpacity="0.15" filter="url(#glassReflection)" />

          {/* Liquid Inside Flask */}
          <path
            d="M 28 135 L 12 170 C 10 176 16 182 24 182 L 96 182 C 104 182 110 176 108 170 L 92 135 C 80 138 40 138 28 135 Z"
            fill="url(#flaskLiquid)"
          />
          {/* Liquid Meniscus */}
          <ellipse cx="60" cy="135" rx="32" ry="4" fill="#A855F7" fillOpacity="0.8" />

          {/* Bubbles in Liquid */}
          <circle cx="48" cy="155" r="3" fill="#FFFFFF" fillOpacity="0.7" />
          <circle cx="68" cy="162" r="2" fill="#FFFFFF" fillOpacity="0.6" />
          <circle cx="56" cy="170" r="2.5" fill="#FFFFFF" fillOpacity="0.7" />
          <circle cx="76" cy="148" r="1.5" fill="#FFFFFF" fillOpacity="0.8" />

          {/* Flask Outer Glass Outline */}
          <path
            d="M 52 20 L 52 70 L 10 168 C 6 176 12 184 22 184 L 98 184 C 108 184 114 176 110 168 L 68 70 L 68 20"
            stroke="url(#flaskGlass)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Flask Lip / Rim */}
          <ellipse cx="60" cy="20" rx="10" ry="3.5" stroke="#FFFFFF" strokeWidth="3" fill="#FFFFFF" fillOpacity="0.4" />

          {/* Volumetric Graduations / Tick Marks */}
          <line x1="38" y1="120" x2="48" y2="120" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.8" />
          <line x1="32" y1="140" x2="45" y2="140" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.8" />
          <line x1="26" y1="160" x2="42" y2="160" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.8" />

          {/* Specular Light Reflection Streak */}
          <path
            d="M 54 28 L 54 68 L 18 165 C 16 170 19 174 24 175"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        </g>

        {/* PHARMACEUTICAL CAPSULES FLOATING IN FOREGROUND */}
        {/* Capsule 1: Blue/Cyan Capsule */}
        <g transform="translate(160, 165) rotate(-22)">
          {/* Cyan Half */}
          <rect x="-18" y="-7" width="18" height="14" rx="7" fill="url(#pillCyan)" />
          {/* Glass White Half */}
          <rect x="0" y="-7" width="18" height="14" rx="7" fill="url(#pillGlass)" stroke="#FFFFFF" strokeWidth="1" />
          {/* Center Dividing Ring */}
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#22C5D9" strokeWidth="1.5" />
          {/* Specular Highlight */}
          <line x1="-12" y1="-4" x2="12" y2="-4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.9" />
        </g>

        {/* Capsule 2: Translucent Mini Capsule behind */}
        <g transform="translate(195, 140) rotate(18) scale(0.85)">
          <rect x="-18" y="-7" width="36" height="14" rx="7" fill="url(#pillGlass)" stroke="#22C5D9" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#22C5D9" strokeWidth="1" />
          <line x1="-10" y1="-3" x2="8" y2="-3" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.9" />
        </g>
      </svg>
    </div>
  );
};

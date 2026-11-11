import React from 'react';

export const AICapsuleArtwork: React.FC<{ className?: string }> = ({ className = 'w-64 sm:w-72 md:w-80 h-auto' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Luminous background glow */}
      <div className="absolute inset-0 bg-radial from-[#22C5D9]/25 via-[#7554D9]/15 to-transparent rounded-full blur-2xl transform -translate-y-2 scale-120" />

      <svg
        viewBox="0 0 320 380"
        className="w-full h-auto drop-shadow-[0_15px_30px_rgba(34,197,217,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="capsuleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#087E8B" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#7554D9" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="capsuleGlass" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="25%" stopColor="#E6F4F8" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#22C5D9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#082746" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="dnaStrand1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22C5D9" />
            <stop offset="50%" stopColor="#7554D9" />
            <stop offset="100%" stopColor="#22C5D9" />
          </linearGradient>

          <linearGradient id="dnaStrand2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B50E8" />
            <stop offset="50%" stopColor="#22C5D9" />
            <stop offset="100%" stopColor="#8B50E8" />
          </linearGradient>

          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- DNA DOUBLE HELIX STRANDS BEHIND CAPSULE --- */}
        <g opacity="0.65" filter="url(#neonGlow)">
          {/* Back helix curve */}
          <path
            d="M90 60 C140 100 140 160 90 200 C40 240 40 300 90 340"
            stroke="url(#dnaStrand1)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M90 100 C40 140 40 200 90 240 C140 280 140 340 90 380"
            stroke="url(#dnaStrand2)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Rung connectors */}
          <line x1="75" y1="80" x2="105" y2="80" stroke="#22C5D9" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="60" y1="140" x2="120" y2="140" stroke="#7554D9" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="70" y1="200" x2="110" y2="200" stroke="#22C5D9" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="60" y1="260" x2="120" y2="260" stroke="#8B50E8" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="75" y1="320" x2="105" y2="320" stroke="#22C5D9" strokeWidth="2" strokeDasharray="3 3" />
        </g>

        {/* --- MOLECULAR CONNECTIVITY NODES --- */}
        <g>
          <circle cx="50" cy="90" r="7" fill="#22C5D9" filter="url(#neonGlow)" />
          <circle cx="50" cy="90" r="3" fill="#FFFFFF" />

          <circle cx="120" cy="140" r="8" fill="#7554D9" filter="url(#neonGlow)" />
          <circle cx="120" cy="140" r="3.5" fill="#FFFFFF" />

          <circle cx="45" cy="220" r="6.5" fill="#22C5D9" filter="url(#neonGlow)" />
          <circle cx="45" cy="220" r="2.5" fill="#FFFFFF" />

          <circle cx="85" cy="330" r="9" fill="#8B50E8" filter="url(#neonGlow)" />
          <circle cx="85" cy="330" r="4" fill="#FFFFFF" />

          <circle cx="140" cy="300" r="7" fill="#22C5D9" filter="url(#neonGlow)" />
          <circle cx="140" cy="300" r="3" fill="#FFFFFF" />

          {/* Molecular bonds */}
          <line x1="50" y1="90" x2="120" y2="140" stroke="#22C5D9" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="45" y1="220" x2="85" y2="330" stroke="#8B50E8" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="85" y1="330" x2="140" y2="300" stroke="#22C5D9" strokeWidth="1.5" strokeOpacity="0.4" />
        </g>

        {/* --- 3D CAPSULE (TILTED) --- */}
        <g transform="translate(180, 160) rotate(26)">
          {/* Ambient Outer Halo */}
          <rect
            x="-48"
            y="-105"
            width="96"
            height="210"
            rx="48"
            fill="none"
            stroke="#22C5D9"
            strokeWidth="3"
            filter="url(#neonGlow)"
            opacity="0.8"
          />

          {/* Main Capsule Body */}
          <rect
            x="-44"
            y="-100"
            width="88"
            height="200"
            rx="44"
            fill="url(#capsuleGlass)"
            stroke="url(#capsuleGlow)"
            strokeWidth="3.5"
          />

          {/* Top Half of Capsule (Cyan Glass) */}
          <path
            d="M-44 -12 C-44 -60 -20 -100 0 -100 C20 -100 44 -60 44 -12 L44 -2 L-44 -2 Z"
            fill="#22C5D9"
            fillOpacity="0.25"
          />

          {/* Center Dividing Ring */}
          <line x1="-44" y1="-2" x2="44" y2="-2" stroke="#22C5D9" strokeWidth="3" opacity="0.9" />

          {/* Specular Edge Highlights */}
          <path
            d="M-36 -85 C-36 -50 -36 50 -36 85"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M-30 -92 C-20 -98 0 -100 12 -98"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* AI MICROCHIP EMBEDDED INSIDE CAPSULE */}
          <g transform="translate(0, 32)">
            {/* Chip Board */}
            <rect
              x="-24"
              y="-24"
              width="48"
              height="48"
              rx="8"
              fill="#082746"
              stroke="#22C5D9"
              strokeWidth="2.5"
              filter="url(#neonGlow)"
            />

            {/* Neural Traces / Pins */}
            <line x1="-24" y1="-12" x2="-32" y2="-12" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="-24" y1="0" x2="-34" y2="0" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="-24" y1="12" x2="-32" y2="12" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />

            <line x1="24" y1="-12" x2="32" y2="-12" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="0" x2="34" y2="0" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="12" x2="32" y2="12" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />

            <line x1="-12" y1="-24" x2="-12" y2="-32" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="-24" x2="0" y2="-34" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="-24" x2="12" y2="-32" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />

            <line x1="-12" y1="24" x2="-12" y2="32" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="24" x2="0" y2="34" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="24" x2="12" y2="32" stroke="#22C5D9" strokeWidth="2" strokeLinecap="round" />

            {/* Central "AI" Monogram */}
            <text
              x="0"
              y="7"
              textAnchor="middle"
              fontSize="16"
              fontWeight="900"
              fill="#22C5D9"
              letterSpacing="1"
              fontFamily="sans-serif"
            >
              AI
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

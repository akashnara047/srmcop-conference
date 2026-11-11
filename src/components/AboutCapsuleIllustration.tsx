import React from 'react';

export const AboutCapsuleIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 sm:w-52 lg:w-60 h-auto',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-radial from-[#22C5D9]/25 via-[#7554D9]/15 to-transparent rounded-full blur-2xl transform scale-125" />

      <svg
        viewBox="0 0 260 260"
        className="w-full h-auto drop-shadow-[0_12px_24px_rgba(34,197,217,0.3)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Orbital Rings Gradients */}
          <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#7554D9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22C5D9" stopOpacity="0.1" />
          </linearGradient>

          {/* Capsule Top Cyan Gradient */}
          <linearGradient id="capsuleTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="35%" stopColor="#22C5D9" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>

          {/* Capsule Bottom Deep Violet Gradient */}
          <linearGradient id="capsuleBottom" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="45%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>

          {/* Specular Edge Highlight */}
          <linearGradient id="capsuleHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- ORBITAL RINGS --- */}
        <g transform="translate(110, 150) rotate(-18)">
          {/* Ring 1 - Outer */}
          <ellipse cx="0" cy="0" rx="95" ry="32" stroke="url(#orbitGrad)" strokeWidth="1.5" opacity="0.65" />
          {/* Ring 2 - Middle */}
          <ellipse cx="0" cy="0" rx="72" ry="24" stroke="#22C5D9" strokeWidth="1.5" opacity="0.8" />
          {/* Ring 3 - Inner */}
          <ellipse cx="0" cy="0" rx="50" ry="16" stroke="#7554D9" strokeWidth="1.5" opacity="0.5" />
        </g>

        {/* --- 3D CAPSULE (TILTED) --- */}
        <g transform="translate(130, 130) rotate(-28)">
          {/* Capsule Drop Shadow */}
          <rect
            x="-28"
            y="-65"
            width="56"
            height="130"
            rx="28"
            fill="#082746"
            opacity="0.25"
            filter="url(#softGlow)"
            transform="translate(10, 15)"
          />

          {/* Capsule Body Base */}
          <rect
            x="-26"
            y="-62"
            width="52"
            height="124"
            rx="26"
            fill="#1E1B4B"
          />

          {/* Bottom Half - Deep Violet */}
          <path
            d="M-26,0 L26,0 L26,36 C26,50.36 14.36,62 0,62 C-14.36,62 -26,50.36 -26,36 Z"
            fill="url(#capsuleBottom)"
          />

          {/* Top Half - Glowing Cyan */}
          <path
            d="M-26,-36 C-26,-50.36 -14.36,-62 0,-62 C14.36,-62 26,-50.36 26,-36 L26,0 L-26,0 Z"
            fill="url(#capsuleTop)"
          />

          {/* Center Dividing Groove */}
          <rect x="-26.5" y="-1.5" width="53" height="3" fill="#0C4A6E" opacity="0.7" />
          <line x1="-26" y1="0" x2="26" y2="0" stroke="#E0F2FE" strokeWidth="0.8" opacity="0.75" />

          {/* 3D Specular Highlight Strip */}
          <path
            d="M-20,-50 C-18,-35 -18,25 -20,45"
            stroke="url(#capsuleHighlight)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Top Dome Specular Curved Dot */}
          <path
            d="M-12,-55 C-5,-58 5,-58 12,-55"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* AI Monogram on the Bottom Half */}
          <g transform="translate(0, 32)">
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fontSize="19"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
              fill="#FFFFFF"
              letterSpacing="1"
              filter="url(#softGlow)"
            >
              AI
            </text>
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fontSize="19"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
              fill="#FFFFFF"
              letterSpacing="1"
            >
              AI
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

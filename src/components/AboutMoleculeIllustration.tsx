import React from 'react';

export const AboutMoleculeIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 sm:w-52 lg:w-60 h-auto',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-radial from-[#7554D9]/20 via-[#22C5D9]/15 to-transparent rounded-full blur-2xl transform scale-125" />

      <svg
        viewBox="0 0 260 260"
        className="w-full h-auto drop-shadow-[0_12px_24px_rgba(117,84,217,0.25)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Cyan/Blue Sphere Radial Gradient */}
          <radialGradient id="sphereCyan" cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#A5F3FC" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="85%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </radialGradient>

          {/* Ice Blue Sphere Radial Gradient */}
          <radialGradient id="sphereIce" cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#BAE6FD" />
            <stop offset="60%" stopColor="#60A5FA" />
            <stop offset="90%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </radialGradient>

          {/* Violet Sphere Radial Gradient */}
          <radialGradient id="sphereViolet" cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#E9D5FF" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="85%" stopColor="#7E22CE" />
            <stop offset="100%" stopColor="#581C87" />
          </radialGradient>

          {/* Deep Violet Sphere Radial Gradient */}
          <radialGradient id="sphereDeepViolet" cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#DDD6FE" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="85%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#4C1D95" />
          </radialGradient>

          {/* Translucent Cylindrical Bond Gradients */}
          <linearGradient id="bondGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#E0E7FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="bondGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#E0E7FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.8" />
          </linearGradient>

          <filter id="atomGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- MOLECULAR BONDS (CYLINDERS) --- */}
        <g strokeLinecap="round" opacity="0.85">
          {/* Bond: Central to Top */}
          <line x1="165" y1="120" x2="185" y2="72" stroke="url(#bondGrad1)" strokeWidth="6" />
          {/* Bond: Top to Top-Right */}
          <line x1="185" y1="72" x2="225" y2="60" stroke="url(#bondGrad1)" strokeWidth="5.5" />
          {/* Bond: Central to Bottom-Left */}
          <line x1="165" y1="120" x2="115" y2="162" stroke="url(#bondGrad2)" strokeWidth="6.5" />
          {/* Bond: Bottom-Left to Far-Left-Up */}
          <line x1="115" y1="162" x2="68" y2="135" stroke="url(#bondGrad2)" strokeWidth="5.5" />
          {/* Bond: Bottom-Left to Far-Left-Down */}
          <line x1="115" y1="162" x2="78" y2="210" stroke="url(#bondGrad2)" strokeWidth="5.5" />
          {/* Bond: Central to Bottom-Right */}
          <line x1="165" y1="120" x2="205" y2="185" stroke="url(#bondGrad1)" strokeWidth="6" />
        </g>

        {/* --- 3D SPHERICAL ATOMS --- */}
        {/* Far Left Bottom Node (Cyan) */}
        <g transform="translate(78, 210)">
          <circle cx="0" cy="0" r="14" fill="url(#sphereCyan)" />
          <ellipse cx="-4" cy="-4" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.8" />
        </g>

        {/* Far Left Top Node (Ice Blue) */}
        <g transform="translate(68, 135)">
          <circle cx="0" cy="0" r="15" fill="url(#sphereIce)" />
          <ellipse cx="-4" cy="-5" rx="4.5" ry="3" fill="#FFFFFF" opacity="0.85" />
        </g>

        {/* Mid-Left Connector Node (Ice/Cyan) */}
        <g transform="translate(115, 162)">
          <circle cx="0" cy="0" r="17" fill="url(#sphereIce)" />
          <ellipse cx="-5" cy="-5" rx="5" ry="3" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* Center Hub Node (Deep Violet) */}
        <g transform="translate(165, 120)">
          <circle cx="0" cy="0" r="21" fill="url(#sphereDeepViolet)" />
          <ellipse cx="-6" cy="-6" rx="6" ry="3.5" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* Bottom Right Node (Violet) */}
        <g transform="translate(205, 185)">
          <circle cx="0" cy="0" r="15" fill="url(#sphereViolet)" />
          <ellipse cx="-4" cy="-4" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.85" />
        </g>

        {/* Top Node (Violet) */}
        <g transform="translate(185, 72)">
          <circle cx="0" cy="0" r="14" fill="url(#sphereDeepViolet)" />
          <ellipse cx="-3.5" cy="-4" rx="3.5" ry="2" fill="#FFFFFF" opacity="0.85" />
        </g>

        {/* Far Top-Right Node (Translucent Lavender) */}
        <g transform="translate(225, 60)">
          <circle cx="0" cy="0" r="12" fill="url(#sphereViolet)" />
          <ellipse cx="-3" cy="-3" rx="3" ry="2" fill="#FFFFFF" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
};

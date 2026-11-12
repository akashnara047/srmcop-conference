import React from 'react';

export const TrackIllustration: React.FC<{ type: string; className?: string }> = ({
  type,
  className = 'w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36',
}) => {
  switch (type) {
    case 'analytics-flask':
    case 'laptop-ai':
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="laptopLid" x1="0" y1="0" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <linearGradient id="laptopScreen" x1="0" y1="0" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="50%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#082746" />
            </linearGradient>
            <linearGradient id="laptopBase" x1="0" y1="0" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="50%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <filter id="neonGlowAI" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Ambient Glow */}
          <ellipse cx="80" cy="115" rx="65" ry="14" fill="#38BDF8" fillOpacity="0.25" filter="url(#neonGlowAI)" />
          {/* Laptop Base (3D Perspective) */}
          <path d="M12 108 L148 108 L160 124 C161 126 159 128 156 128 L4 128 C1 128 -1 126 0.5 124 L12 108 Z" fill="url(#laptopBase)" filter="drop-shadow(0 8px 12px rgba(8,39,70,0.22))" />
          <path d="M60 125 L100 125 L98 127 L62 127 Z" fill="#64748B" />
          {/* Keyboard Surface Accent */}
          <polygon points="24,110 136,110 144,121 16,121" fill="#475569" fillOpacity="0.25" />
          {/* Laptop Lid / Bezel */}
          <rect x="22" y="16" width="116" height="92" rx="8" fill="url(#laptopLid)" stroke="#94A3B8" strokeWidth="1.5" />
          {/* Glossy Screen Display */}
          <rect x="28" y="22" width="104" height="80" rx="4" fill="url(#laptopScreen)" />
          {/* AI Computational Molecule Graphic on Screen */}
          <g transform="translate(80, 62)">
            {/* Center AI Chip Monogram */}
            <rect x="-18" y="-15" width="36" height="30" rx="6" fill="#087E8B" stroke="#22C5D9" strokeWidth="2" filter="url(#neonGlowAI)" />
            <text x="0" y="6" textAnchor="middle" fontSize="14" fontWeight="900" fill="#FFFFFF" fontFamily="system-ui, sans-serif" letterSpacing="1">AI</text>
            {/* Connecting Circuit / Molecular Lines */}
            <line x1="-18" y1="-8" x2="-32" y2="-18" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="18" y1="-8" x2="32" y2="-18" stroke="#818CF8" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="-18" y1="8" x2="-30" y2="20" stroke="#818CF8" strokeWidth="2" />
            <line x1="18" y1="8" x2="30" y2="20" stroke="#38BDF8" strokeWidth="2" />
            {/* Molecular Nodes */}
            <circle cx="-32" cy="-18" r="5" fill="#38BDF8" filter="url(#neonGlowAI)" />
            <circle cx="-32" cy="-18" r="2.5" fill="#FFFFFF" />
            <circle cx="32" cy="-18" r="5" fill="#C084FC" filter="url(#neonGlowAI)" />
            <circle cx="32" cy="-18" r="2.5" fill="#FFFFFF" />
            <circle cx="-30" cy="20" r="4.5" fill="#818CF8" />
            <circle cx="30" cy="20" r="4.5" fill="#38BDF8" />
          </g>
          {/* Screen Glare Highlight */}
          <path d="M30 24 L85 24 L45 98 L30 98 Z" fill="#FFFFFF" fillOpacity="0.08" />
        </svg>
      );

    case 'dna-target':
    case 'target-protein':
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="prot1" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#BAE6FD" />
              <stop offset="60%" stopColor="#38BDF8" />
              <stop offset="90%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#075985" />
            </radialGradient>
            <radialGradient id="prot2" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#A5F3FC" />
              <stop offset="65%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#164E63" />
            </radialGradient>
            <radialGradient id="ligandBall" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#FBBF24" />
              <stop offset="75%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#9A3412" />
            </radialGradient>
            <filter id="ligandGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Ambient Shadow */}
          <ellipse cx="82" cy="120" rx="50" ry="12" fill="#0284C7" fillOpacity="0.25" filter="blur(6px)" />
          {/* 3D Protein Surface Subunit Globules */}
          <g filter="drop-shadow(0 8px 16px rgba(2,132,199,0.3))">
            <circle cx="58" cy="48" r="24" fill="url(#prot1)" />
            <circle cx="94" cy="46" r="22" fill="url(#prot2)" />
            <circle cx="112" cy="72" r="20" fill="url(#prot1)" />
            <circle cx="86" cy="94" r="24" fill="url(#prot2)" />
            <circle cx="52" cy="86" r="21" fill="url(#prot1)" />
            <circle cx="44" cy="62" r="19" fill="url(#prot2)" />
            <circle cx="76" cy="66" r="18" fill="#0369A1" opacity="0.6" />
          </g>
          {/* Bound Molecular Ligand In Receptor Pocket (Golden Orange) */}
          <g transform="translate(80, 68)" filter="url(#ligandGlow)">
            <ellipse cx="0" cy="0" rx="20" ry="10" fill="url(#ligandBall)" transform="rotate(-18)" />
            <circle cx="-12" cy="-3" r="6.5" fill="url(#ligandBall)" />
            <circle cx="12" cy="3" r="6.5" fill="url(#ligandBall)" />
            <circle cx="0" cy="0" r="5" fill="#FEF08A" />
            <line x1="-12" y1="-3" x2="0" y2="0" stroke="#FFFFFF" strokeWidth="2" />
            <line x1="0" y1="0" x2="12" y2="3" stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </svg>
      );

    case 'chemistry-flask':
    case 'antibody-modality':
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="abStem" x1="0" y1="0" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#7554D9" />
            </linearGradient>
            <radialGradient id="viralSphere" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#E9D5FF" />
              <stop offset="60%" stopColor="#A855F7" />
              <stop offset="90%" stopColor="#6B21A8" />
              <stop offset="100%" stopColor="#3B0764" />
            </radialGradient>
          </defs>
          {/* Shadow */}
          <ellipse cx="80" cy="120" rx="52" ry="12" fill="#7554D9" fillOpacity="0.22" filter="blur(6px)" />
          {/* 3D Y-shaped Monoclonal Antibody */}
          <g filter="drop-shadow(0 8px 16px rgba(99,102,241,0.35))" strokeLinecap="round" strokeLinejoin="round">
            {/* Main Stem */}
            <path d="M72 112 L72 70" stroke="url(#abStem)" strokeWidth="12" />
            {/* Left Binding Arm */}
            <path d="M72 70 L42 30" stroke="url(#abStem)" strokeWidth="12" />
            {/* Right Binding Arm */}
            <path d="M72 70 L102 30" stroke="url(#abStem)" strokeWidth="12" />
            {/* Tips / Binding Paratopes */}
            <circle cx="42" cy="30" r="7.5" fill="#38BDF8" />
            <circle cx="102" cy="30" r="7.5" fill="#38BDF8" />
            <circle cx="72" cy="112" r="7" fill="#7554D9" />
            {/* Specular Highlights */}
            <line x1="70" y1="108" x2="70" y2="74" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.75" />
            <line x1="44" y1="34" x2="68" y2="66" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.75" />
            <line x1="100" y1="34" x2="76" y2="66" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.75" />
          </g>
          {/* Viral / Biologic Antigen Sphere with Spikes */}
          <g transform="translate(118, 92)" filter="drop-shadow(0 6px 12px rgba(168,85,247,0.4))">
            <circle cx="0" cy="0" r="18" fill="url(#viralSphere)" />
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg, i) => (
              <g key={i} transform={`rotate(${deg})`}>
                <line x1="0" y1="0" x2="24" y2="0" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="24" cy="0" r="3" fill="#E879F9" />
              </g>
            ))}
          </g>
        </svg>
      );

    case 'formulation-pill':
    case 'liposome-carrier':
      return (
        <img
          src="/images/tracks/pharmaceutics.png"
          alt="Pharmaceutical Technology & Pharmaceutics"
          className={`${className} object-contain`}
          loading="lazy"
        />
      );

    case 'clinical-hospital':
    case 'preclinical-mouse':
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chartScreenGrad" x1="0" y1="0" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ECFEFF" />
              <stop offset="50%" stopColor="#CFFAFE" />
              <stop offset="100%" stopColor="#A5F3FC" />
            </linearGradient>
            <radialGradient id="mouse3D" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F8FAFC" />
              <stop offset="85%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </radialGradient>
          </defs>
          {/* Shadow */}
          <ellipse cx="80" cy="120" rx="54" ry="11" fill="#087E8B" fillOpacity="0.2" filter="blur(6px)" />
          {/* Telemetry Chart Screen In Background */}
          <g filter="drop-shadow(0 6px 12px rgba(8,126,139,0.22))">
            <rect x="70" y="22" width="76" height="58" rx="8" fill="url(#chartScreenGrad)" stroke="#22C5D9" strokeWidth="2" />
            {/* Grid Bars & Graph Area */}
            <path d="M78 64 L92 54 L104 60 L120 42 L138 34" stroke="#087E8B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M78 64 L92 54 L104 60 L120 42 L138 34 L138 72 L78 72 Z" fill="#22C5D9" fillOpacity="0.25" />
            {/* Peak Target Marker */}
            <circle cx="138" cy="34" r="3.5" fill="#EF4444" />
          </g>
          {/* 3D Preclinical White Lab Mouse */}
          <g filter="drop-shadow(0 8px 16px rgba(8,39,70,0.25))">
            {/* Long Pink Tail */}
            <path d="M30 102 C20 96 12 102 6 106" stroke="#FDA4AF" strokeWidth="3.5" strokeLinecap="round" />
            {/* Body */}
            <ellipse cx="58" cy="90" rx="28" ry="19" fill="url(#mouse3D)" />
            {/* Head */}
            <path d="M76 84 C84 81 96 87 99 90 C94 98 80 101 74 98 Z" fill="url(#mouse3D)" />
            {/* Ear */}
            <ellipse cx="72" cy="78" rx="6.5" ry="8" fill="#FECDD3" stroke="#F43F5E" strokeWidth="1" strokeOpacity="0.4" />
            {/* Eye */}
            <circle cx="89" cy="88" r="2.2" fill="#E11D48" />
            {/* Nose */}
            <circle cx="99" cy="91" r="1.8" fill="#FB7185" />
            {/* Front & Back Paws */}
            <ellipse cx="50" cy="106" rx="5.5" ry="3" fill="#E2E8F0" />
            <ellipse cx="74" cy="105" rx="5.5" ry="3" fill="#E2E8F0" />
          </g>
        </svg>
      );

    case 'natural-leaf':
    case 'human-dna':
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dnaStrandLeft" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id="dnaStrandRight" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#22C5D9" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="bodyBlue" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stopColor="#A5F3FC" />
              <stop offset="35%" stopColor="#38BDF8" />
              <stop offset="75%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <filter id="humanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Shadow */}
          <ellipse cx="80" cy="122" rx="48" ry="10" fill="#2563EB" fillOpacity="0.22" filter="blur(6px)" />
          {/* DNA Double Helix Behind Silhouette */}
          <g opacity="0.85">
            <path d="M44 18 C58 34 58 50 44 66 C30 82 30 98 44 114" stroke="url(#dnaStrandLeft)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M44 34 C30 50 30 66 44 82 C58 98 58 114 44 122" stroke="url(#dnaStrandRight)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="38" y1="40" x2="50" y2="40" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <line x1="33" y1="58" x2="55" y2="58" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
            <line x1="38" y1="76" x2="50" y2="76" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <line x1="33" y1="94" x2="55" y2="94" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* 3D Holographic Human Anatomical Silhouette */}
          <g transform="translate(86, 14)" filter="url(#humanGlow)">
            {/* Head */}
            <circle cx="20" cy="10" r="9.5" fill="url(#bodyBlue)" />
            {/* Torso & Shoulders */}
            <path d="M14 24 C8 27 2 37 0 50 C5 52 10 48 13 40 L13 70 L27 70 L27 40 C30 48 35 52 40 50 C38 37 32 27 26 24 Z" fill="url(#bodyBlue)" />
            {/* Lower Body & Legs */}
            <path d="M13 70 L10 106 L18 106 L20 76 L22 76 L24 106 L32 106 L27 70 Z" fill="url(#bodyBlue)" />
            {/* Cellular Meridian Bio-Nodes */}
            <circle cx="20" cy="34" r="3" fill="#FFFFFF" />
            <circle cx="20" cy="46" r="2.5" fill="#E0F2FE" />
            <circle cx="20" cy="58" r="2.5" fill="#E0F2FE" />
            <circle cx="10" cy="38" r="2" fill="#A5F3FC" />
            <circle cx="30" cy="38" r="2" fill="#A5F3FC" />
          </g>
        </svg>
      );

    case 'regulatory-scale':
    case 'regulatory-shield':
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="shield3D" x1="0" y1="0" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="40%" stopColor="#8B5CF6" />
              <stop offset="85%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
            <linearGradient id="clipBoard" x1="0" y1="0" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Shadow */}
          <ellipse cx="80" cy="124" rx="52" ry="11" fill="#6366F1" fillOpacity="0.25" filter="blur(6px)" />
          {/* 3D Medical/Regulatory Checklist Clipboard */}
          <g filter="drop-shadow(0 8px 16px rgba(15,23,42,0.18))">
            {/* Clipboard Base */}
            <rect x="26" y="20" width="76" height="98" rx="10" fill="url(#clipBoard)" stroke="#CBD5E1" strokeWidth="2" />
            {/* Metal Clip */}
            <rect x="46" y="14" width="36" height="13" rx="4" fill="#64748B" />
            <rect x="54" y="10" width="20" height="7" rx="2.5" fill="#94A3B8" />
            {/* Checkmark Rows */}
            {[42, 58, 74, 90].map((y, idx) => (
              <g key={idx}>
                {/* Checkmark */}
                <path d={`M34 ${y + 5} L39 ${y + 10} L47 ${y + 2}`} stroke="#7554D9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Text Line Placeholder */}
                <rect x="52" y={y + 4} width={idx === 3 ? 24 : 38} height="5" rx="2.5" fill="#CBD5E1" />
              </g>
            ))}
          </g>
          {/* 3D Glossy Security & Compliance Shield */}
          <g transform="translate(86, 62)" filter="url(#shieldGlow)">
            <path
              d="M24 2 C38 2 46 10 48 16 C48 38 34 54 24 60 C14 54 0 38 0 16 C2 10 10 2 24 2 Z"
              fill="url(#shield3D)"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
            {/* Specular Highlight Arc */}
            <path
              d="M24 6 C34 6 42 12 44 18 C44 32 36 44 26 52 C24 38 24 24 24 6 Z"
              fill="#FFFFFF"
              fillOpacity="0.2"
            />
            {/* Crisp White Checkmark */}
            <path d="M15 28 L21 34 L33 22" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};

import React from 'react';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';
import { IMAGES } from '../lib/images';
import { Layers, ArrowRight } from 'lucide-react';

interface TracksViewProps {
  onNavigate: (tab: string, trackId?: string) => void;
}

// 3D Scientific Illustration Badges (Target: 75–90 px) matching the approved reference mockup
const TrackIllustration: React.FC<{ trackNumber: string }> = ({ trackNumber }) => {
  const sizeClass = 'w-[74px] h-[74px] sm:w-[80px] sm:h-[80px] lg:w-[86px] lg:h-[86px]';

  switch (trackNumber) {
    case '01':
      return (
        <img
          src="/images/tracks/pharmaceutics.png"
          alt="Pharmaceutical Technology & Pharmaceutics"
          className={`${sizeClass} object-contain`}
          loading="lazy"
        />
      );

    case '02':
      // 3D DNA Helix Illustration with gradient spheres and glowing rungs
      return (
        <svg viewBox="0 0 120 120" className={`${sizeClass} drop-shadow-[0_8px_16px_rgba(117,84,217,0.25)]`} fill="none">
          <defs>
            <radialGradient id="t2DnaBall1" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#C084FC" />
              <stop offset="80%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#581C87" />
            </radialGradient>
            <radialGradient id="t2DnaBall2" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#67E8F9" />
              <stop offset="80%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#0E7490" />
            </radialGradient>
          </defs>
          <ellipse cx="60" cy="106" rx="38" ry="8" fill="#7554D9" fillOpacity="0.18" filter="blur(5px)" />
          {/* Base pair connections */}
          <line x1="38" y1="26" x2="82" y2="32" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
          <line x1="46" y1="42" x2="74" y2="48" stroke="#DDD6FE" strokeWidth="3" strokeLinecap="round" />
          <line x1="56" y1="58" x2="64" y2="62" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
          <line x1="74" y1="74" x2="46" y2="80" stroke="#DDD6FE" strokeWidth="3" strokeLinecap="round" />
          <line x1="82" y1="90" x2="38" y2="96" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
          {/* 3D Helical nodes */}
          <circle cx="38" cy="26" r="9.5" fill="url(#t2DnaBall1)" />
          <circle cx="82" cy="32" r="9.5" fill="url(#t2DnaBall2)" />
          <circle cx="46" cy="42" r="8" fill="url(#t2DnaBall1)" />
          <circle cx="74" cy="48" r="8" fill="url(#t2DnaBall2)" />
          <circle cx="60" cy="60" r="7" fill="url(#t2DnaBall1)" />
          <circle cx="74" cy="74" r="8" fill="url(#t2DnaBall2)" />
          <circle cx="46" cy="80" r="8" fill="url(#t2DnaBall1)" />
          <circle cx="82" cy="90" r="9.5" fill="url(#t2DnaBall2)" />
          <circle cx="38" cy="96" r="9.5" fill="url(#t2DnaBall1)" />
        </svg>
      );

    case '03':
      // 3D Molecular / Protein Cluster with glossy cyan and purple spherical nodes
      return (
        <svg viewBox="0 0 120 120" className={`${sizeClass} drop-shadow-[0_8px_16px_rgba(13,148,136,0.25)]`} fill="none">
          <defs>
            <radialGradient id="t3MolPurple" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#C084FC" />
              <stop offset="75%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#581C87" />
            </radialGradient>
            <radialGradient id="t3MolCyan" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#5EEAD4" />
              <stop offset="75%" stopColor="#0D9488" />
              <stop offset="100%" stopColor="#115E59" />
            </radialGradient>
            <radialGradient id="t3MolBlue" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#67E8F9" />
              <stop offset="75%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </radialGradient>
          </defs>
          <ellipse cx="60" cy="104" rx="40" ry="8" fill="#0D9488" fillOpacity="0.18" filter="blur(5px)" />
          {/* Covalent Connecting Rods */}
          <line x1="48" y1="40" x2="80" y2="50" stroke="#99F6E4" strokeWidth="4" strokeLinecap="round" />
          <line x1="48" y1="40" x2="34" y2="74" stroke="#E9D5FF" strokeWidth="4" strokeLinecap="round" />
          <line x1="80" y1="50" x2="88" y2="82" stroke="#99F6E4" strokeWidth="4" strokeLinecap="round" />
          <line x1="34" y1="74" x2="64" y2="90" stroke="#E9D5FF" strokeWidth="4" strokeLinecap="round" />
          <line x1="88" y1="82" x2="64" y2="90" stroke="#BAE6FD" strokeWidth="4" strokeLinecap="round" />
          {/* 3D Glossy Spheres */}
          <circle cx="48" cy="40" r="14" fill="url(#t3MolPurple)" />
          <circle cx="80" cy="50" r="15" fill="url(#t3MolCyan)" />
          <circle cx="34" cy="74" r="12" fill="url(#t3MolBlue)" />
          <circle cx="88" cy="82" r="12.5" fill="url(#t3MolPurple)" />
          <circle cx="64" cy="90" r="16" fill="url(#t3MolCyan)" />
        </svg>
      );

    case '04':
      // Erlenmeyer Flask with gradient liquid, analytical bubbles, and floating molecular ring
      return (
        <svg viewBox="0 0 120 120" className={`${sizeClass} drop-shadow-[0_8px_16px_rgba(117,84,217,0.25)]`} fill="none">
          <defs>
            <linearGradient id="t4FlaskLiq" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#6B21A8" />
            </linearGradient>
            <radialGradient id="t4MolSphere" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#67E8F9" />
              <stop offset="100%" stopColor="#0284C7" />
            </radialGradient>
          </defs>
          <ellipse cx="56" cy="106" rx="36" ry="8" fill="#7554D9" fillOpacity="0.2" filter="blur(5px)" />
          {/* Glass Flask Body */}
          <path
            d="M48,22 L64,22 L64,48 L88,90 C92,97 87,104 79,104 L33,104 C25,104 20,97 24,90 L48,48 Z"
            fill="#FFFFFF"
            fillOpacity="0.85"
            stroke="#94A3B8"
            strokeWidth="3"
          />
          {/* Purple Gradient Liquid */}
          <path
            d="M29,82 L83,82 L87,89 C90,95 86,102 79,102 L33,102 C26,102 22,95 25,89 Z"
            fill="url(#t4FlaskLiq)"
            fillOpacity="0.92"
          />
          {/* Lip */}
          <rect x="44" y="18" width="24" height="6" rx="3" fill="#FFFFFF" stroke="#64748B" strokeWidth="2.5" />
          {/* Liquid highlight line */}
          <line x1="33" y1="82" x2="79" y2="82" stroke="#E9D5FF" strokeWidth="2" strokeLinecap="round" />
          {/* Bubbles */}
          <circle cx="56" cy="92" r="4" fill="#FFFFFF" fillOpacity="0.8" />
          <circle cx="68" cy="88" r="3" fill="#FFFFFF" fillOpacity="0.8" />
          <circle cx="46" cy="94" r="2.5" fill="#FFFFFF" fillOpacity="0.8" />
          {/* Connected Molecular Node */}
          <line x1="80" y1="36" x2="100" y2="46" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="46" r="9" fill="url(#t4MolSphere)" />
        </svg>
      );

    case '05':
      // Big Data 3D Storage Database Cylinders with Analytics Bar Chart Overlay
      return (
        <svg viewBox="0 0 120 120" className={`${sizeClass} drop-shadow-[0_8px_16px_rgba(2,132,199,0.25)]`} fill="none">
          <defs>
            <linearGradient id="t5DbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="t5BarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
          </defs>
          <ellipse cx="50" cy="104" rx="36" ry="8" fill="#0284C7" fillOpacity="0.2" filter="blur(5px)" />
          {/* Top Cylinder */}
          <ellipse cx="50" cy="34" rx="26" ry="9" fill="url(#t5DbGrad)" />
          <path d="M24,34 L24,50 C24,55 36,59 50,59 C64,59 76,55 76,50 L76,34 Z" fill="#0369A1" />
          <ellipse cx="50" cy="50" rx="26" ry="9" fill="url(#t5DbGrad)" />
          {/* Bottom Cylinder */}
          <path d="M24,50 L24,66 C24,71 36,75 50,75 C64,75 76,71 76,66 L76,50 Z" fill="#075985" />
          <ellipse cx="50" cy="66" rx="26" ry="9" fill="url(#t5DbGrad)" />
          {/* Third Cylinder Tier */}
          <path d="M24,66 L24,82 C24,87 36,91 50,91 C64,91 76,87 76,82 L76,66 Z" fill="#0C4A6E" />
          <ellipse cx="50" cy="82" rx="26" ry="9" fill="url(#t5DbGrad)" />
          {/* Analytics Bar Chart Overlay */}
          <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.15))">
            <rect x="74" y="70" width="8" height="24" rx="2.5" fill="url(#t5BarGrad)" />
            <rect x="86" y="56" width="8" height="38" rx="2.5" fill="url(#t5BarGrad)" />
            <rect x="98" y="44" width="8" height="50" rx="2.5" fill="url(#t5BarGrad)" />
          </g>
        </svg>
      );

    case '06':
      // 3D Bi-color Pharmaceutical Capsule with Connected Phytochemical Molecular Nodes
      return (
        <svg viewBox="0 0 120 120" className={`${sizeClass} drop-shadow-[0_8px_16px_rgba(234,88,12,0.22)]`} fill="none">
          <defs>
            <linearGradient id="t6CapOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDBA74" />
              <stop offset="60%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
            <linearGradient id="t6CapPurple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#DDD6FE" />
              <stop offset="60%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
            <radialGradient id="t6MolNode" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </radialGradient>
          </defs>
          <ellipse cx="64" cy="106" rx="36" ry="8" fill="#EA580C" fillOpacity="0.18" filter="blur(5px)" />
          {/* Angled 3D Capsule */}
          <g transform="translate(68, 62) rotate(-35)">
            <rect x="-16" y="-36" width="32" height="72" rx="16" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2.5" />
            <path d="M-16,0 L16,0 L16,20 C16,28.8 8.8,36 0,36 C-8.8,36 -16,28.8 -16,20 Z" fill="url(#t6CapOrange)" />
            <path d="M-16,0 L16,0 L16,-20 C16,-28.8 8.8,-36 0,-36 C-8.8,-36 -16,-28.8 -16,-20 Z" fill="url(#t6CapPurple)" />
            {/* Highlight Sheen */}
            <line x1="-8" y1="-28" x2="-8" y2="28" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.6" strokeLinecap="round" />
          </g>
          {/* Phytochemical Covalent Nodes */}
          <line x1="26" y1="44" x2="48" y2="34" stroke="#FDBA74" strokeWidth="3" strokeLinecap="round" />
          <line x1="26" y1="44" x2="22" y2="72" stroke="#DDD6FE" strokeWidth="3" strokeLinecap="round" />
          <circle cx="26" cy="44" r="7.5" fill="url(#t6MolNode)" />
          <circle cx="48" cy="34" r="6.5" fill="#8B5CF6" />
          <circle cx="22" cy="72" r="6.5" fill="#F97316" />
        </svg>
      );

    case '07':
    default:
      // Scales of Justice with 3D AI Security Shield
      return (
        <svg viewBox="0 0 120 120" className={`${sizeClass} drop-shadow-[0_8px_16px_rgba(37,99,235,0.25)]`} fill="none">
          <defs>
            <linearGradient id="t7ShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="106" rx="42" ry="8" fill="#1D4ED8" fillOpacity="0.2" filter="blur(5px)" />
          {/* Scales Beam */}
          <line x1="22" y1="42" x2="80" y2="42" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          <line x1="51" y1="32" x2="51" y2="82" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          <circle cx="51" cy="32" r="5" fill="#0369A1" />
          {/* Left Pan */}
          <line x1="24" y1="42" x2="15" y2="66" stroke="#94A3B8" strokeWidth="2" />
          <line x1="24" y1="42" x2="33" y2="66" stroke="#94A3B8" strokeWidth="2" />
          <path d="M12,66 C15,76 30,76 33,66 Z" fill="#BAE6FD" stroke="#0284C7" strokeWidth="2.5" />
          {/* Right Pan */}
          <line x1="78" y1="42" x2="69" y2="66" stroke="#94A3B8" strokeWidth="2" />
          <line x1="78" y1="42" x2="87" y2="66" stroke="#94A3B8" strokeWidth="2" />
          <path d="M66,66 C69,76 84,76 87,66 Z" fill="#BAE6FD" stroke="#0284C7" strokeWidth="2.5" />
          {/* AI Security Shield */}
          <g filter="drop-shadow(0 6px 12px rgba(29,78,216,0.35))">
            <path
              d="M78,54 L102,54 C102,76 90,90 78,98 C66,90 54,76 54,54 Z"
              fill="url(#t7ShieldGrad)"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
            <text x="78" y="79" textAnchor="middle" fontSize="16" fontWeight="900" fill="#FFFFFF" fontFamily="system-ui, sans-serif" letterSpacing="1">
              AI
            </text>
          </g>
        </svg>
      );
  }
};

// Card styling configuration for each of the 7 tracks matching the approved reference mockup
const TRACK_CARD_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    hoverBorder: string;
    badgeBg: string;
    badgeText: string;
    dividerColor: string;
  }
> = {
  '01': {
    bg: 'bg-gradient-to-br from-[#EBF9FA] via-[#E2F7F9] to-[#D5F4F8]',
    border: 'border-[#BEEBF2]',
    hoverBorder: 'hover:border-[#087E8B]/60',
    badgeBg: 'bg-[#D2F3F8]',
    badgeText: 'text-[#087E8B]',
    dividerColor: 'border-cyan-200/60',
  },
  '02': {
    bg: 'bg-gradient-to-br from-[#F5F2FD] via-[#ECE6FD] to-[#E3D9FB]',
    border: 'border-[#DDD2FA]',
    hoverBorder: 'hover:border-[#7554D9]/60',
    badgeBg: 'bg-[#EAE2FB]',
    badgeText: 'text-[#7554D9]',
    dividerColor: 'border-purple-200/60',
  },
  '03': {
    bg: 'bg-gradient-to-br from-[#E6FAF7] via-[#D8F6F1] to-[#C8F2EB]',
    border: 'border-[#B6ECE3]',
    hoverBorder: 'hover:border-[#0D9488]/60',
    badgeBg: 'bg-[#CDF2EC]',
    badgeText: 'text-[#0D9488]',
    dividerColor: 'border-teal-200/60',
  },
  '04': {
    bg: 'bg-gradient-to-br from-[#F6F1FD] via-[#ECE4FC] to-[#E1D4FB]',
    border: 'border-[#DCD0FA]',
    hoverBorder: 'hover:border-[#7554D9]/60',
    badgeBg: 'bg-[#E9E0FA]',
    badgeText: 'text-[#7554D9]',
    dividerColor: 'border-purple-200/60',
  },
  '05': {
    bg: 'bg-gradient-to-br from-[#EEF7FE] via-[#E2F0FD] to-[#D5E9FC]',
    border: 'border-[#C6E2FA]',
    hoverBorder: 'hover:border-[#0284C7]/60',
    badgeBg: 'bg-[#D9ECFC]',
    badgeText: 'text-[#0284C7]',
    dividerColor: 'border-sky-200/60',
  },
  '06': {
    bg: 'bg-gradient-to-br from-[#FFF5F0] via-[#FEEDEA] to-[#FDE1DC]',
    border: 'border-[#FCD3CB]',
    hoverBorder: 'hover:border-[#EA580C]/60',
    badgeBg: 'bg-[#FCE1DC]',
    badgeText: 'text-[#EA580C]',
    dividerColor: 'border-orange-200/60',
  },
  '07': {
    bg: 'bg-gradient-to-br from-[#EEF5FF] via-[#E2EDFF] to-[#D5E4FD]',
    border: 'border-[#C6DBFB]',
    hoverBorder: 'hover:border-[#2563EB]/60',
    badgeBg: 'bg-[#D8E6FC]',
    badgeText: 'text-[#2563EB]',
    dividerColor: 'border-blue-200/60',
  },
};

export const TracksView: React.FC<TracksViewProps> = ({ onNavigate }) => {
  return (
    <div className="w-full bg-[#FAF9FD] relative overflow-hidden">
      {/* =====================================================================
          BACKGROUND ARTWORK: CAMPUS BUILDING PHOTO & 3D MOLECULAR DNA CAPSULE
         ===================================================================== */}

      {/* Top-Left: SRM College of Pharmacy Campus Building Photograph with Soft Architectural Fade */}
      <div className="absolute left-0 top-0 w-[360px] sm:w-[480px] lg:w-[620px] xl:w-[700px] h-[260px] sm:h-[300px] lg:h-[340px] pointer-events-none overflow-hidden z-0">
        <img
          src={IMAGES.srmPharmacyBuilding}
          alt="SRM College of Pharmacy Building"
          className="w-full h-full object-cover object-left-top opacity-55 lg:opacity-60"
        />
        {/* Horizontal Gradient Fade from left to right */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FAF9FD]/70 to-[#FAF9FD]" />
        {/* Vertical Gradient Fade from top to bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAF9FD]/50 to-[#FAF9FD]" />
      </div>

      {/* Top-Right: 3D Scientific Illustration (Covalent Molecular Network, AI Capsule & DNA Double Helix) */}
      <div className="absolute right-0 sm:right-4 lg:right-8 top-0 w-44 sm:w-56 lg:w-72 xl:w-80 h-auto pointer-events-none opacity-95 hidden sm:block z-0">
        <svg viewBox="0 0 280 230" className="w-full h-auto drop-shadow-[0_12px_24px_rgba(117,84,217,0.2)]" fill="none">
          <defs>
            <radialGradient id="heroMolPurple" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#C084FC" />
              <stop offset="70%" stopColor="#8B50E8" />
              <stop offset="100%" stopColor="#581C87" />
            </radialGradient>
            <radialGradient id="heroMolCyan" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#67E8F9" />
              <stop offset="70%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#0E7490" />
            </radialGradient>
            <linearGradient id="heroCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="heroHelixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>

          {/* Connected Molecular Covalent Network on the left */}
          <line x1="45" y1="35" x2="85" y2="75" stroke="#93C5FD" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="85" y1="75" x2="35" y2="120" stroke="#DDD6FE" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="85" y1="75" x2="135" y2="60" stroke="#93C5FD" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="45" cy="35" r="14" fill="url(#heroMolPurple)" />
          <circle cx="35" cy="120" r="15" fill="url(#heroMolPurple)" />
          <circle cx="85" cy="75" r="19" fill="url(#heroMolPurple)" />

          {/* 3D DNA Helix spiraling behind and around the capsule */}
          <g opacity="0.85">
            <path
              d="M175,25 C195,45 235,50 255,85 C270,115 240,150 255,185"
              stroke="url(#heroHelixGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M235,20 C255,50 205,75 220,115 C235,145 200,165 215,195"
              stroke="#A855F7"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <line x1="185" y1="35" x2="235" y2="30" stroke="#93C5FD" strokeWidth="2.5" />
            <line x1="210" y1="60" x2="245" y2="65" stroke="#DDD6FE" strokeWidth="2.5" />
            <line x1="225" y1="95" x2="260" y2="90" stroke="#93C5FD" strokeWidth="2.5" />
            <line x1="218" y1="130" x2="250" y2="135" stroke="#DDD6FE" strokeWidth="2.5" />
            <line x1="210" y1="170" x2="252" y2="165" stroke="#93C5FD" strokeWidth="2.5" />
          </g>

          {/* 3D Glass Pill Capsule with bold AI Monogram */}
          <g transform="translate(170, 95) rotate(-35)">
            <rect x="-24" y="-55" width="48" height="110" rx="24" fill="#FFFFFF" fillOpacity="0.4" stroke="#BAE6FD" strokeWidth="3.5" />
            <path d="M-24,0 L24,0 L24,31 C24,44.2 13.2,55 0,55 C-13.2,55 -24,44.2 -24,31 Z" fill="url(#heroCapGrad)" fillOpacity="0.9" />
            <circle cx="0" cy="22" r="13" fill="#FFFFFF" fillOpacity="0.95" />
            <text x="0" y="27" textAnchor="middle" fontSize="13" fontWeight="900" fill="#7C3AED" fontFamily="sans-serif">
              AI
            </text>
          </g>

          {/* Cyan Floating Molecular Nodes */}
          <circle cx="215" cy="40" r="13" fill="url(#heroMolCyan)" />
          <circle cx="190" cy="180" r="14" fill="url(#heroMolCyan)" />
          <circle cx="255" cy="130" r="11" fill="url(#heroMolCyan)" />
        </svg>
      </div>

      {/* =====================================================================
          MAIN CONTENT AREA (Compact Spacing & Proportions)
         ===================================================================== */}
      <div className="w-[94%] max-w-[1536px] mx-auto relative z-10 pt-4 sm:pt-5 lg:pt-6 pb-4">
        {/* =====================================================================
            1. HERO SECTION (Compact Spacing)
           ===================================================================== */}
        <div className="text-center max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[11px] sm:text-[12px] font-semibold tracking-wider uppercase shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>SCIENTIFIC TRACKS</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[46px] font-black text-[#082746] font-heading tracking-tight leading-tight">
            Conference Scientific Tracks
          </h1>

          {/* Purple-to-Cyan Decorative Underline */}
          <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full mx-auto" />

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-[16px] text-[#45536B] leading-relaxed max-w-3xl mx-auto pt-0.5 font-medium">
            The conference will feature seven focused scientific tracks, bringing together research, innovation and
            real-world applications of Artificial Intelligence in drug discovery and development.
          </p>
        </div>

        {/* =====================================================================
            2. SEVEN TRACK CARDS IN COMPACT 3 + 4 GRID ARRANGEMENT
               Vertical gap between rows: ~22-26px (space-y-5 sm:space-y-6)
               Target desktop card height: ~300-320px
           ===================================================================== */}
        <div className="mt-5 sm:mt-6 space-y-5 sm:space-y-6">
          {/* ROW 1: THREE EQUAL-WIDTH CARDS (TRACKS 01, 02, 03) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full">
            {SCIENTIFIC_TRACKS.slice(0, 3).map((track) => {
              const style = TRACK_CARD_STYLES[track.number] || TRACK_CARD_STYLES['01'];
              return (
                <div
                  key={track.id}
                  className={`w-full ${style.bg} border ${style.border} ${style.hoverBorder} rounded-[24px] p-5 sm:p-6 lg:p-[26px] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group min-h-[300px] sm:min-h-[310px] lg:min-h-[315px]`}
                >
                  {/* Top Content Area - Aligned to top without excessive blank space */}
                  <div>
                    {/* Top Row: Number Badge (left) & Scientific Illustration (75-90px on right) */}
                    <div className="flex items-start justify-between">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs sm:text-sm font-mono font-bold border ${style.badgeBg} ${style.badgeText} ${style.border}`}
                      >
                        {track.number}
                      </span>
                      <div className="shrink-0 -mt-1 group-hover:scale-105 transition-transform duration-300">
                        <TrackIllustration trackNumber={track.number} />
                      </div>
                    </div>

                    {/* Track Title (23-25px) */}
                    <h2 className="text-xl sm:text-2xl lg:text-[23.5px] font-black text-[#082746] font-heading leading-snug mt-2">
                      {track.title}
                    </h2>

                    {/* Track Subtitle directly below */}
                    <span className="text-xs sm:text-[12.5px] font-bold text-[#7554D9] uppercase tracking-wider block mt-1">
                      {track.focusArea}
                    </span>

                    {/* Description (15-16px) immediately below */}
                    <p className="text-[14.5px] sm:text-[15.5px] text-[#45536B] leading-relaxed pt-1.5 font-normal">
                      {track.description}
                    </p>
                  </div>

                  {/* Card Action Area with Subtle Divider & 44-46px Button */}
                  <div className={`pt-3 sm:pt-3.5 border-t ${style.dividerColor} mt-3 sm:mt-4`}>
                    <button
                      type="button"
                      onClick={() => onNavigate('abstracts', track.id)}
                      className="w-full h-[44px] sm:h-[46px] px-4 rounded-full bg-gradient-to-r from-[#7554D9] to-[#8B50E8] hover:from-[#6A47CE] hover:to-[#7C3AED] text-white text-sm sm:text-[15px] font-bold tracking-wide shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.01]"
                    >
                      <span>Submit to Track {track.number}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ROW 2: FOUR EQUAL-WIDTH CARDS (TRACKS 04, 05, 06, 07) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 w-full">
            {SCIENTIFIC_TRACKS.slice(3, 7).map((track) => {
              const style = TRACK_CARD_STYLES[track.number] || TRACK_CARD_STYLES['04'];
              return (
                <div
                  key={track.id}
                  className={`w-full ${style.bg} border ${style.border} ${style.hoverBorder} rounded-[24px] p-5 sm:p-6 lg:p-[26px] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group min-h-[300px] sm:min-h-[310px] lg:min-h-[315px]`}
                >
                  {/* Top Content Area - Aligned to top without excessive blank space */}
                  <div>
                    {/* Top Row: Number Badge (left) & Scientific Illustration (75-90px on right) */}
                    <div className="flex items-start justify-between">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs sm:text-sm font-mono font-bold border ${style.badgeBg} ${style.badgeText} ${style.border}`}
                      >
                        {track.number}
                      </span>
                      <div className="shrink-0 -mt-1 group-hover:scale-105 transition-transform duration-300">
                        <TrackIllustration trackNumber={track.number} />
                      </div>
                    </div>

                    {/* Track Title (21-23px) */}
                    <h2 className="text-lg sm:text-xl lg:text-[22px] font-black text-[#082746] font-heading leading-snug mt-2">
                      {track.title}
                    </h2>

                    {/* Track Subtitle directly below */}
                    <span className="text-xs sm:text-[12.5px] font-bold text-[#7554D9] uppercase tracking-wider block mt-1">
                      {track.focusArea}
                    </span>

                    {/* Description (15-16px) immediately below */}
                    <p className="text-[14px] sm:text-[15px] text-[#45536B] leading-relaxed pt-1.5 font-normal">
                      {track.description}
                    </p>
                  </div>

                  {/* Card Action Area with Subtle Divider & 44-46px Button */}
                  <div className={`pt-3 sm:pt-3.5 border-t ${style.dividerColor} mt-3 sm:mt-4`}>
                    <button
                      type="button"
                      onClick={() => onNavigate('abstracts', track.id)}
                      className="w-full h-[44px] sm:h-[46px] px-4 rounded-full bg-gradient-to-r from-[#7554D9] to-[#8B50E8] hover:from-[#6A47CE] hover:to-[#7C3AED] text-white text-sm sm:text-[15px] font-bold tracking-wide shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.01]"
                    >
                      <span>Submit to Track {track.number}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. BOTTOM DECORATION: COMPACT FLOWING CYAN, BLUE & LAVENDER WAVES
         ===================================================================== */}
      <div className="w-full relative pointer-events-none overflow-hidden z-0 mt-4 sm:mt-6">
        <svg
          viewBox="0 0 1440 120"
          className="w-full h-16 sm:h-20 lg:h-24 block"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="botCyanWave" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#67E8F9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8B50E8" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="botPurpleWave" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EDE9FE" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#DDD6FE" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="botBlueWave" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#BAE6FD" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Overlapping Wave Layer 1 */}
          <path
            d="M0,60 C320,105 680,15 1020,70 C1240,105 1360,45 1440,55 L1440,120 L0,120 Z"
            fill="url(#botCyanWave)"
          />
          {/* Overlapping Wave Layer 2 */}
          <path
            d="M0,80 C380,35 760,95 1140,60 C1280,45 1380,80 1440,70 L1440,120 L0,120 Z"
            fill="url(#botPurpleWave)"
          />
          {/* Overlapping Wave Layer 3 */}
          <path
            d="M0,95 C300,75 600,110 950,85 C1200,70 1350,100 1440,90 L1440,120 L0,120 Z"
            fill="url(#botBlueWave)"
          />
        </svg>
      </div>
    </div>
  );
};

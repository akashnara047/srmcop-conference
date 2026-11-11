import React from 'react';
import { IMAGES } from '../lib/images';

export const SRMISTLogo: React.FC<{ className?: string; inverted?: boolean; showText?: boolean }> = ({
  className = 'h-9 sm:h-10',
  inverted = false,
  showText = false,
}) => {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <div className={`h-full flex items-center justify-center shrink-0 ${inverted ? 'bg-white px-2 py-0.5 rounded-xs shadow-2xs' : ''}`}>
        <img
          src={IMAGES.srmistLogo}
          alt="SRM Institute of Science and Technology"
          className="h-7 sm:h-8 md:h-9 w-auto max-w-[130px] sm:max-w-[160px] object-contain shrink-0"
          loading="eager"
        />
      </div>
      {showText && (
        <div className="flex flex-col text-left leading-tight hidden lg:flex">
          <span className={`text-[11px] font-bold tracking-tight uppercase font-heading ${inverted ? 'text-white' : 'text-[#082746]'}`}>
            SRMIST
          </span>
          <span className={`text-[8.5px] tracking-wider uppercase ${inverted ? 'text-slate-300' : 'text-[#45536B]'}`}>
            Deemed University
          </span>
        </div>
      )}
    </div>
  );
};

export const SRMPharmacyLogo: React.FC<{ className?: string; inverted?: boolean; showText?: boolean }> = ({
  className = 'h-9 sm:h-10',
  inverted = false,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <div className={`h-8 w-8 sm:h-9 sm:w-9 aspect-square flex items-center justify-center shrink-0 ${inverted ? 'bg-white p-0.5 rounded-full shadow-2xs' : ''}`}>
        <img
          src={IMAGES.srmPharmacyLogo}
          alt="SRM College of Pharmacy"
          className="h-full w-full object-contain shrink-0"
          loading="eager"
        />
      </div>
      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <span className={`text-[11px] sm:text-[12px] font-bold tracking-tight whitespace-nowrap ${inverted ? 'text-white' : 'text-[#082746]'}`}>
            SRM College of Pharmacy
          </span>
          <span className={`text-[9px] sm:text-[9.5px] tracking-wider whitespace-nowrap font-medium ${inverted ? 'text-cyan-300' : 'text-[#7554D9]'}`}>
            SRMIST, Kattankulathur
          </span>
        </div>
      )}
    </div>
  );
};

// Collaborating Partner 1: INTI International University, Malaysia
export const INTILogo: React.FC<{ className?: string; inverted?: boolean }> = ({
  className = 'h-10',
  inverted = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 shrink-0 ${className}`}>
      {/* Authentic INTI 8-spoke red starburst */}
      <svg viewBox="0 0 100 100" className="h-7 sm:h-8 w-auto aspect-square shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 8L50 92M8 50L92 50M20.3 20.3L79.7 79.7M20.3 79.7L79.7 20.3" stroke="#E11D48" strokeWidth="12" strokeLinecap="round" />
        <circle cx="50" cy="50" r="10" fill="#E11D48" />
      </svg>
      <div className="flex flex-col text-left leading-tight">
        <span className={`text-xs sm:text-sm font-extrabold tracking-tight font-heading ${inverted ? 'text-white' : 'text-[#082746]'}`}>
          INTI <span className="font-semibold text-[11px] sm:text-xs">International</span>
        </span>
        <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight ${inverted ? 'text-slate-300' : 'text-slate-700'}`}>
          University, Malaysia
        </span>
      </div>
    </div>
  );
};

// Official Indian Pharmaceutical Association (IPA) Combined Logo & Wordmark
export const IPALogo: React.FC<{
  className?: string;
  imgClassName?: string;
  inverted?: boolean;
}> = ({
  className = '',
  imgClassName = 'h-7 sm:h-8 md:h-9 w-auto',
  inverted = false,
}) => {
  return (
    <div
      className={`inline-flex items-center shrink-0 ${
        inverted ? 'bg-white px-2 py-1 rounded-sm shadow-2xs' : ''
      } ${className}`}
      title="The Indian Pharmaceutical Association (IPA) - ...CRUSADE FOR THE PROFESSION"
    >
      <img
        src={IMAGES.ipaOfficialLogo}
        alt="The Indian Pharmaceutical Association (IPA) - ...CRUSADE FOR THE PROFESSION"
        className={`object-contain max-w-full ${imgClassName}`}
        loading="eager"
      />
    </div>
  );
};

// Recognition 1: NIRF Ranking
export const NIRFLogo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
      <svg viewBox="0 0 140 60" className="h-7 sm:h-8 w-auto shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* NIRF stylized wordmark with open book ribbon */}
        <text x="2" y="38" fontSize="34" fontWeight="900" fill="#082746" letterSpacing="-1">
          nirf
        </text>
        {/* Stylized open pages ribbon in Indian tricolor orange & green */}
        <path d="M4 48C20 44 45 44 65 49C85 44 110 44 130 48" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" />
        <path d="M6 53C22 49 45 49 65 54C85 49 108 49 128 53" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">NIRF Ranking</span>
        <span className="text-sm sm:text-base font-extrabold text-[#082746] tracking-tight">10<sup>th</sup> (2025)</span>
        <span className="text-[10px] sm:text-[11px] text-slate-600 font-semibold">Pharmacy</span>
      </div>
    </div>
  );
};

// Recognition 2: NAAC A++ Accreditation
export const NAACLogo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
      {/* NAAC Golden Wreath Ribbon */}
      <svg viewBox="0 0 80 80" className="h-8 sm:h-9 w-auto aspect-square shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="38" r="28" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" />
        <path d="M20 54L14 74L30 68L40 74L50 68L66 74L60 54" fill="#DC2626" />
        {/* Wreath leaves */}
        <path d="M22 36C22 26 30 18 40 18C50 18 58 26 58 36C58 46 50 54 40 54" stroke="#B45309" strokeWidth="2" strokeDasharray="3 3" />
        <text x="40" y="36" textAnchor="middle" fontSize="13" fontWeight="900" fill="#B91C1C">A++</text>
        <text x="40" y="47" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#78350F">NAAC</text>
      </svg>
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">NAAC</span>
        <span className="text-sm sm:text-base font-extrabold text-[#082746] tracking-tight">A++ Accreditation</span>
        <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">(Highest Grade)</span>
      </div>
    </div>
  );
};

// Recognition 3: NBA Accreditation
export const NBALogo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
      {/* NBA Stylized Cyan Ribbon Logo */}
      <svg viewBox="0 0 100 60" className="h-7 sm:h-8 w-auto shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="92" height="44" rx="4" fill="#0891B2" />
        <text x="50" y="38" textAnchor="middle" fontSize="26" fontWeight="900" fill="#FFFFFF" letterSpacing="1.5">
          NBA
        </text>
        <text x="50" y="48" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#E0F2FE" letterSpacing="0.2">
          NATL BOARD OF ACCREDITATION
        </text>
      </svg>
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">NBA Accreditation</span>
        <span className="text-sm sm:text-base font-extrabold text-[#082746] tracking-tight">B.Pharmacy</span>
        <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">(UG Programme)</span>
      </div>
    </div>
  );
};

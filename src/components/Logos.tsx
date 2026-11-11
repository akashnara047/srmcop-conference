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
export const NIRFLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      <img
        src={IMAGES.nirfLogo}
        alt="NIRF - National Institutional Ranking Framework"
        className="h-8 sm:h-9 md:h-10 w-auto max-w-[65px] sm:max-w-[75px] object-contain shrink-0"
        loading="lazy"
      />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold tracking-wide uppercase font-['Inter',sans-serif]">
          NIRF Ranking
        </span>
        <span className="text-xs sm:text-sm lg:text-[14.5px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
          10<sup>th</sup> <span className="text-[11px] font-semibold text-slate-600">(2025)</span>
        </span>
        <span className="text-[10px] sm:text-[10.5px] text-slate-600 font-medium font-['Inter',sans-serif]">
          Pharmacy
        </span>
      </div>
    </div>
  );
};

// Recognition 2: NAAC A++ Accreditation
export const NAACLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      <img
        src={IMAGES.naacLogo}
        alt="NAAC A++ Accredited - Highest Grade"
        className="h-7 sm:h-8 md:h-9 w-auto max-w-[75px] sm:max-w-[85px] object-contain shrink-0"
        loading="lazy"
      />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold tracking-wide uppercase font-['Inter',sans-serif]">
          NAAC Accreditation
        </span>
        <span className="text-xs sm:text-sm lg:text-[14.5px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
          Grade A++
        </span>
        <span className="text-[10px] sm:text-[10.5px] text-slate-600 font-medium font-['Inter',sans-serif]">
          Highest Grade
        </span>
      </div>
    </div>
  );
};

// Recognition 3: NBA Accreditation
export const NBALogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      <img
        src={IMAGES.nbaLogo}
        alt="NBA - National Board of Accreditation"
        className="h-8 sm:h-9 md:h-10 w-auto max-w-[42px] sm:max-w-[48px] object-contain shrink-0"
        loading="lazy"
      />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold tracking-wide uppercase font-['Inter',sans-serif]">
          NBA Accreditation
        </span>
        <span className="text-xs sm:text-sm lg:text-[14.5px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
          2024–2027
        </span>
        <span className="text-[10px] sm:text-[10.5px] text-slate-600 font-medium font-['Inter',sans-serif]">
          B.Pharmacy Programme
        </span>
      </div>
    </div>
  );
};

// Recognition 4: QS World University Rankings
export const QSWorldRankingLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      <img
        src={IMAGES.qsWorldRankingLogo}
        alt="QS World University Rankings by Subject 2026"
        className="h-8 sm:h-9 md:h-10 w-auto max-w-[50px] sm:max-w-[58px] object-contain shrink-0 rounded-xs shadow-2xs"
        loading="lazy"
      />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold tracking-wide uppercase font-['Inter',sans-serif]">
          QS World Rankings
        </span>
        <span className="text-xs sm:text-sm lg:text-[14.5px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
          201–250 <span className="text-[11px] font-semibold text-slate-600">(2026)</span>
        </span>
        <span className="text-[10px] sm:text-[10.5px] text-slate-600 font-medium font-['Inter',sans-serif]">
          Pharmacy & Pharmacology
        </span>
      </div>
    </div>
  );
};

// Recognition 5: QS I-GAUGE
export const QSIGaugeLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      <img
        src={IMAGES.qsIGaugeLogo}
        alt="QS I-GAUGE Platinum Rating"
        className="h-8 sm:h-9 md:h-10 w-auto max-w-[50px] sm:max-w-[58px] object-contain shrink-0 rounded-xs shadow-2xs"
        loading="lazy"
      />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold tracking-wide uppercase font-['Inter',sans-serif]">
          QS I-GAUGE
        </span>
        <span className="text-xs sm:text-sm lg:text-[14.5px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
          PLATINUM +
        </span>
        <span className="text-[10px] sm:text-[10.5px] text-slate-600 font-medium font-['Inter',sans-serif]">
          Pharmacy Subject Rating
        </span>
      </div>
    </div>
  );
};

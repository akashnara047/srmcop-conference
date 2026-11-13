import React from 'react';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';
import { IMAGES } from '../lib/images';
import { Layers, ArrowRight } from 'lucide-react';

interface TracksViewProps {
  onNavigate: (tab: string, trackId?: string) => void;
}

// Transparent 3D Scientific Illustrations sized for prominent card display
const TrackIllustration: React.FC<{ trackNumber: string; className?: string }> = ({
  trackNumber,
  className = 'w-full h-[148px] object-contain object-right-bottom',
}) => {
  switch (trackNumber) {
    case '01':
      return (
        <img
          src="/images/tracks/pharmaceutics-transparent.png"
          alt="Pharmaceutical Technology & Pharmaceutics"
          className={className}
          loading="lazy"
        />
      );

    case '02':
      return (
        <img
          src={IMAGES.track02Pharmacology}
          alt="Pharmacology & Experimental Therapeutics"
          className={className}
          loading="lazy"
        />
      );

    case '03':
      return (
        <img
          src={IMAGES.track03PharmaceuticalChemistry}
          alt="Pharmaceutical Chemistry & Drug Discovery"
          className={className}
          loading="lazy"
        />
      );

    case '04':
      return (
        <img
          src={IMAGES.track04PharmaceuticalAnalysis}
          alt="Pharmaceutical Analysis & Analytical Technologies"
          className={className}
          loading="lazy"
        />
      );

    case '05':
      return (
        <img
          src={IMAGES.track05PharmacyPractice}
          alt="Pharmacy Practice & Clinical Pharmacy"
          className={className}
          loading="lazy"
        />
      );

    case '06':
      return (
        <img
          src={IMAGES.track06Pharmacognosy}
          alt="Pharmacognosy & Natural Product Research"
          className={className}
          loading="lazy"
        />
      );

    case '07':
    default:
      return (
        <img
          src={IMAGES.track07RegulatoryQuality}
          alt="Regulatory Affairs & Pharmaceutical Quality Assurance"
          className={className}
          loading="lazy"
        />
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
  }
> = {
  '01': {
    bg: 'bg-gradient-to-br from-[#EAF9FC] via-[#E1F6FB] to-[#D4F2FA]',
    border: 'border-[#BCEAF5]',
    hoverBorder: 'hover:border-[#0EB4D2]/70',
    badgeBg: 'bg-[#10B5D3]',
    badgeText: 'text-white',
  },
  '02': {
    bg: 'bg-gradient-to-br from-[#F4F0FD] via-[#ECE5FD] to-[#E3D8FB]',
    border: 'border-[#D7C9FA]',
    hoverBorder: 'hover:border-[#8B5CF6]/70',
    badgeBg: 'bg-[#9D82EC]',
    badgeText: 'text-white',
  },
  '03': {
    bg: 'bg-gradient-to-br from-[#E7FAF4] via-[#DAF6ED] to-[#CCF2E6]',
    border: 'border-[#B6EBDA]',
    hoverBorder: 'hover:border-[#10B981]/70',
    badgeBg: 'bg-[#27C28A]',
    badgeText: 'text-white',
  },
  '04': {
    bg: 'bg-gradient-to-br from-[#F4EFFD] via-[#EBE3FC] to-[#E2D6FB]',
    border: 'border-[#D8C8FA]',
    hoverBorder: 'hover:border-[#8B5CF6]/70',
    badgeBg: 'bg-[#9B7CEC]',
    badgeText: 'text-white',
  },
  '05': {
    bg: 'bg-gradient-to-br from-[#ECF6FE] via-[#E1EFFD] to-[#D4E7FC]',
    border: 'border-[#C1DDFB]',
    hoverBorder: 'hover:border-[#0284C7]/70',
    badgeBg: 'bg-[#1086E8]',
    badgeText: 'text-white',
  },
  '06': {
    bg: 'bg-gradient-to-br from-[#FFF4ED] via-[#FEEAE0] to-[#FCDFD1]',
    border: 'border-[#FBCDB8]',
    hoverBorder: 'hover:border-[#EA580C]/70',
    badgeBg: 'bg-[#F5923E]',
    badgeText: 'text-white',
  },
  '07': {
    bg: 'bg-gradient-to-br from-[#EDF4FF] via-[#E2ECFE] to-[#D4E3FD]',
    border: 'border-[#C2D8FB]',
    hoverBorder: 'hover:border-[#2563EB]/70',
    badgeBg: 'bg-[#5072F2]',
    badgeText: 'text-white',
  },
};

export const TracksView: React.FC<TracksViewProps> = ({ onNavigate }) => {
  return (
    <div
      className="w-full min-h-[calc(100svh-4.5rem)] relative overflow-hidden bg-[#EEF2FF] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${IMAGES.tracksPageBg})`,
      }}
    >
      {/* =====================================================================
          MAIN CONTENT AREA
         ===================================================================== */}
      <div className="w-[94%] max-w-[1536px] mx-auto relative z-10 pt-5 sm:pt-7 lg:pt-8 pb-16 sm:pb-20">
        {/* =====================================================================
            1. HERO SECTION
           ===================================================================== */}
        <div className="text-center max-w-4xl mx-auto space-y-2">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[11px] sm:text-[12px] font-semibold tracking-wider uppercase shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>SCIENTIFIC TRACKS</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[50px] font-black text-[#082746] font-heading tracking-tight leading-tight">
            Conference Scientific Tracks
          </h1>

          {/* Purple-to-Cyan Decorative Underline */}
          <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full mx-auto" />

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-[16.5px] text-[#45536B] leading-relaxed max-w-3xl mx-auto pt-1 font-medium">
            The conference will feature seven focused scientific tracks, bringing together research, innovation and
            real-world applications of Artificial Intelligence in drug discovery and development.
          </p>
        </div>

        {/* =====================================================================
            2. SEVEN TRACK CARDS IN 4 + 3 MOCKUP GRID ARRANGEMENT
               Row 1: 4 equal-width cards (Tracks 01–04)
               Row 2: 3 equal-width cards centered horizontally (Tracks 05–07)
           ===================================================================== */}
        <div className="mt-7 sm:mt-8 space-y-5 xl:space-y-6">
          {/* ROW 1: FOUR EQUAL-WIDTH CARDS (TRACKS 01, 02, 03, 04) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 xl:gap-6 w-full">
            {SCIENTIFIC_TRACKS.slice(0, 4).map((track) => {
              const style = TRACK_CARD_STYLES[track.number] || TRACK_CARD_STYLES['01'];
              return (
                <div
                  key={track.id}
                  className={`w-full ${style.bg} border ${style.border} ${style.hoverBorder} rounded-[24px] p-5 sm:p-6 shadow-[0_10px_28px_rgba(117,84,217,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] hover:shadow-[0_16px_36px_rgba(117,84,217,0.14)] transition-all duration-300 flex flex-col justify-between group min-h-[340px] sm:min-h-[360px] lg:min-h-[372px]`}
                >
                  {/* Top & Middle Content Area: Badge + Title + Prominent Right-Aligned Artwork */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5 z-10">
                      <div>
                        <span
                          className={`inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-2xs ${style.badgeBg} ${style.badgeText}`}
                        >
                          Track {track.number}
                        </span>
                      </div>

                      <h2 className="text-[18px] sm:text-[19px] xl:text-[20px] font-extrabold text-[#082746] font-heading leading-[1.28]">
                        {track.title}
                      </h2>
                    </div>

                    {/* Dedicated Prominent Illustration Container */}
                    <div className="w-full flex items-end justify-end pt-3 pb-1 group-hover:scale-[1.03] transition-transform duration-300">
                      <TrackIllustration
                        trackNumber={track.number}
                        className="w-[86%] max-w-[230px] h-[142px] sm:h-[152px] xl:h-[160px] object-contain object-right-bottom"
                      />
                    </div>
                  </div>

                  {/* Card Action Area */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => onNavigate('abstracts', track.id)}
                      className="w-full h-[44px] sm:h-[46px] px-4 rounded-full bg-gradient-to-r from-[#7554D9] to-[#8B50E8] hover:from-[#6A47CE] hover:to-[#7C3AED] text-white text-sm sm:text-[15px] font-bold tracking-wide shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Submit to Track {track.number}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ROW 2: THREE EQUAL-WIDTH CARDS CENTERED (TRACKS 05, 06, 07) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 xl:gap-6 lg:w-[86%] xl:w-[84%] mx-auto w-full">
            {SCIENTIFIC_TRACKS.slice(4, 7).map((track) => {
              const style = TRACK_CARD_STYLES[track.number] || TRACK_CARD_STYLES['05'];
              return (
                <div
                  key={track.id}
                  className={`w-full md:last:col-span-2 md:last:w-[calc(50%-10px)] md:last:mx-auto lg:last:col-span-1 lg:last:w-full ${style.bg} border ${style.border} ${style.hoverBorder} rounded-[24px] p-5 sm:p-6 shadow-[0_10px_28px_rgba(117,84,217,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] hover:shadow-[0_16px_36px_rgba(117,84,217,0.14)] transition-all duration-300 flex flex-col justify-between group min-h-[295px] sm:min-h-[305px] lg:min-h-[310px]`}
                >
                  {/* Upper Area: Left Title Column + Right Prominent Illustration */}
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch justify-between gap-3">
                    {/* Left Content Column */}
                    <div className="sm:w-[46%] flex flex-col justify-start space-y-2.5 z-10">
                      <div>
                        <span
                          className={`inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-2xs ${style.badgeBg} ${style.badgeText}`}
                        >
                          Track {track.number}
                        </span>
                      </div>

                      <h2 className="text-[18px] sm:text-[19px] xl:text-[20px] font-extrabold text-[#082746] font-heading leading-[1.28]">
                        {track.title}
                      </h2>
                    </div>

                    {/* Right Dedicated Illustration Area */}
                    <div className="sm:w-[54%] flex items-end justify-end pt-2 sm:pt-4 pb-1 group-hover:scale-[1.03] transition-transform duration-300">
                      <TrackIllustration
                        trackNumber={track.number}
                        className="w-full max-w-[235px] h-[146px] sm:h-[164px] xl:h-[176px] object-contain object-right-bottom"
                      />
                    </div>
                  </div>

                  {/* Card Action Area */}
                  <div className="pt-3.5">
                    <button
                      type="button"
                      onClick={() => onNavigate('abstracts', track.id)}
                      className="w-full h-[44px] sm:h-[46px] px-4 rounded-full bg-gradient-to-r from-[#7554D9] to-[#8B50E8] hover:from-[#6A47CE] hover:to-[#7C3AED] text-white text-sm sm:text-[15px] font-bold tracking-wide shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
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

    </div>
  );
};

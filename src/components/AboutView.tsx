import React from 'react';
import { IMAGES } from '../lib/images';
import {
  Info,
  Target,
  FlaskConical,
  Layers,
  Handshake,
  Users,
  Cpu,
  Dna,
  Network,
  Pill,
  Database,
  Sparkles,
  MessageSquare,
  Activity,
  ShieldCheck,
  Leaf,
  Building2,
} from 'lucide-react';
import { SRMISTLogo } from './Logos';

interface AboutViewProps {
  onNavigate: (tab: string, trackId?: string) => void;
}

// 10 Topics of Interest matching the approved mockup
const TOPICS_OF_INTEREST = [
  {
    title: 'AI & Machine Learning in Drug Discovery',
    icon: Cpu,
    colorClass: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
  },
  {
    title: 'Computational Biology & Bioinformatics',
    icon: Dna,
    colorClass: 'bg-purple-50 text-purple-600 border border-purple-100',
  },
  {
    title: 'Molecular Modeling & Simulation',
    icon: Network,
    colorClass: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  },
  {
    title: 'AI in Pharmacology and Toxicology',
    icon: Pill,
    colorClass: 'bg-amber-50 text-amber-600 border border-amber-100',
  },
  {
    title: 'Big Data & Predictive Analytics in Healthcare',
    icon: Database,
    colorClass: 'bg-blue-50 text-blue-600 border border-blue-100',
  },
  {
    title: 'AI-driven Drug Design and Optimization',
    icon: Sparkles,
    colorClass: 'bg-teal-50 text-teal-600 border border-teal-100',
  },
  {
    title: 'Natural Language Processing in Biomedical Research',
    icon: MessageSquare,
    colorClass: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
  },
  {
    title: 'Digital Twins & Virtual Clinical Trials',
    icon: Activity,
    colorClass: 'bg-rose-50 text-rose-600 border border-rose-100',
  },
  {
    title: 'Regulatory Science and AI',
    icon: ShieldCheck,
    colorClass: 'bg-purple-50 text-purple-600 border border-purple-100',
  },
  {
    title: 'Challenges, Ethics and Future Perspectives',
    icon: Leaf,
    colorClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  },
];

export const AboutView: React.FC<AboutViewProps> = () => {
  return (
    <div
      className="w-full bg-[#FAF8FF] bg-cover bg-center bg-no-repeat min-h-screen relative overflow-x-hidden py-5 sm:py-6 lg:py-8"
      style={{
        backgroundImage: `url(${IMAGES.aboutConferencePageBg})`,
      }}
    >
      {/* =====================================================================
          RESPONSIVE CONTENT CONTAINER (FITS COMFORTABLY AT 100% ZOOM)
         ===================================================================== */}
      <div className="w-[93%] max-w-[1480px] mx-auto relative z-10 space-y-5 lg:space-y-6">
        {/* =====================================================================
            1. SECTION HEADING (38-44px DESKTOP AT 100% ZOOM)
           ===================================================================== */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          {/* Eyebrow Pill Badge: ABOUT THE INTERNATIONAL CONFERENCE */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[11px] sm:text-xs font-semibold tracking-wider uppercase shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
            <Info className="w-3.5 h-3.5" />
            <span>ABOUT THE INTERNATIONAL CONFERENCE</span>
          </div>

          {/* Main Heading: 38-42px on desktop */}
          <h1 className="text-2xl sm:text-3xl lg:text-[38px] xl:text-[42px] font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight leading-[1.14]">
            Accelerating Translational Drug Innovation <br className="hidden sm:inline" />
            Through{' '}
            <span className="text-[#8B50E8]">Artificial </span>
            <span className="text-[#06B6D4]">Intelligence</span>
          </h1>

          {/* Subtle Curved Accent Underline Flourish */}
          <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] rounded-full mx-auto mt-1" />
        </div>

        {/* =====================================================================
            2. THREE-COLUMN BALANCED GRID (30% - 35% - 35% ON DESKTOP)
           ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[30fr_35fr_35fr] gap-4 lg:gap-5 items-stretch">
          {/* -------------------------------------------------------------------
              COLUMN 1 (Left 30%): Conference Charter
             ------------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-[#DDD6FE]/85 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
            {/* Header Badge (16-17px column heading) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EDE9FE] text-[#7554D9] text-[15px] sm:text-[16px] lg:text-[17px] font-semibold tracking-wide self-start border border-[#DDD6FE] font-['Plus_Jakarta_Sans',sans-serif]">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Conference Charter</span>
            </div>

            {/* Paragraphs with comfortable 14.5-15.5px body text */}
            <div className="space-y-3.5 flex-1 flex flex-col justify-start">
              {/* Conference Introduction */}
              <div className="border-l-[3px] border-[#7554D9] pl-3.5 py-0.5">
                <p className="text-[14.5px] sm:text-[15px] xl:text-[15.5px] text-[#082746] font-normal leading-[1.6] font-['Inter',sans-serif]">
                  The International Conference on{' '}
                  <strong className="font-bold text-[#082746]">
                    AI-Powered Innovations in Drug Discovery and Development (15–16 February 2027)
                  </strong>{' '}
                  is organized by SRM College of Pharmacy, SRMIST, India, in academic collaboration with INTI
                  International University, Malaysia, and the Indian Pharmaceutical Association (IPA).
                </p>
              </div>

              {/* Supporting Paragraph */}
              <p className="text-[14px] sm:text-[14.5px] xl:text-[15px] text-[#45536B] font-normal leading-[1.6] pl-0.5 font-['Inter',sans-serif]">
                Artificial Intelligence is no longer merely a predictive tool—it is the foundational
                infrastructure for modern molecular discovery, de novo protein design, phenotypic
                screening, and targeted drug delivery. This conference brings together global thought
                leaders to evaluate bench-to-bedside trajectories and address real-world deployment challenges.
              </p>
            </div>

            {/* Footer Location & Conference Dates */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[13px] sm:text-[13.5px] text-slate-500 font-medium font-['Inter',sans-serif]">
              <span>SRMIST Kattankulathur</span>
              <span className="text-[#7554D9] font-semibold">15–16 February 2027</span>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              COLUMN 2 (Middle 35%): Conference Objectives
             ------------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-[#DDD6FE]/85 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-3.5">
            {/* Header Badge (16-17px column heading) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[15px] sm:text-[16px] lg:text-[17px] font-semibold tracking-wide shadow-xs self-start font-['Plus_Jakarta_Sans',sans-serif]">
              <Target className="w-4 h-4 shrink-0" />
              <span>Conference Objectives</span>
            </div>

            {/* Three Separate Vertically Arranged Objective Cards */}
            <div className="space-y-2.5 flex-1 flex flex-col justify-between">
              {/* Objective 1 */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#FAF8FF] border border-slate-100 hover:border-[#7554D9]/30 transition-all flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F2FE] text-[#7554D9] flex items-center justify-center shrink-0 border border-[#DDD6FE] shadow-2xs mt-0.5">
                  <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[16px] sm:text-[17px] xl:text-[18px] font-semibold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                    01. Advance Interdisciplinary Science
                  </h3>
                  <p className="text-[13.5px] sm:text-[14px] xl:text-[14.5px] text-[#45536B] font-normal leading-[1.52] font-['Inter',sans-serif]">
                    Advance interdisciplinary science and translational research in drug discovery and development.
                    Foster cross-pollination between computer scientists, bioinformaticians, medicinal chemists, and
                    clinical pharmacologists.
                  </p>
                </div>
              </div>

              {/* Objective 2 */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#F0FCFD] border border-slate-100 hover:border-[#087E8B]/30 transition-all flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0F7FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-[#A5F3FC] shadow-2xs mt-0.5">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[16px] sm:text-[17px] xl:text-[18px] font-semibold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                    02. Accelerate Formulation & Delivery
                  </h3>
                  <p className="text-[13.5px] sm:text-[14px] xl:text-[14.5px] text-[#45536B] font-normal leading-[1.52] font-['Inter',sans-serif]">
                    Examine precision nanotechnology, nanocarriers, and targeted polymeric systems that enhance
                    bioavailability and patient compliance for complex therapeutic molecules.
                  </p>
                </div>
              </div>

              {/* Objective 3 */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#F0FCFD] border border-slate-100 hover:border-[#087E8B]/30 transition-all flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F8FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-[#99F6E4] shadow-2xs mt-0.5">
                  <Handshake className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[16px] sm:text-[17px] xl:text-[18px] font-semibold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                    03. Foster Global Partnerships
                  </h3>
                  <p className="text-[13.5px] sm:text-[14px] xl:text-[14.5px] text-[#45536B] font-normal leading-[1.52] font-['Inter',sans-serif]">
                    Foster global academic–industry partnerships and collaborative research networks to initiate
                    multi-center trials, co-authored publications, and patent filings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              COLUMN 3 (Right 35%): Topics of Interest (14-15px Topic Labels, 2 Cols)
             ------------------------------------------------------------------- */}
          <div className="md:col-span-2 xl:col-span-1 bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-[#DDD6FE]/90 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-3.5">
            {/* Header Badge & Accent Bar (16-17px column heading) */}
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7554D9] text-white text-[15px] sm:text-[16px] lg:text-[17px] font-semibold tracking-wide shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
                <Users className="w-4 h-4 shrink-0" />
                <span>Topics of Interest</span>
              </div>
              <div className="w-14 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full" />
            </div>

            {/* 10 Topic Cards in 2-Column Grid x 5 Uniform Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 auto-rows-fr">
              {TOPICS_OF_INTEREST.map((topic, tIdx) => {
                const IconComponent = topic.icon;
                return (
                  <div
                    key={tIdx}
                    className="h-full min-h-[56px] px-3 py-2.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#FAF8FF] border border-slate-100 hover:border-[#7554D9]/30 transition-all flex items-center gap-2.5 group"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${topic.colorClass}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[13.5px] sm:text-[14px] xl:text-[14px] font-semibold text-[#082746] leading-[1.32] font-['Inter',sans-serif]">
                      {topic.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. ORGANISING BODIES & COLLABORATING PARTNERS PANEL (Wider & Proportional)
           ===================================================================== */}
        <div className="relative pt-3">
          {/* Centered Overlapping Top Pill Badge */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[12px] sm:text-[13px] font-semibold tracking-wider uppercase shadow-md">
              <Users className="w-3.5 h-3.5" />
              <span>ORGANISING BODIES & COLLABORATING PARTNERS</span>
            </div>
          </div>

          {/* Unified Institutional Partner Strip Card (3 Institutions with Official Logos) */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/90 shadow-md p-5 sm:p-7 pt-7 sm:pt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/90 gap-5 md:gap-0 items-center">
              {/* Institution 1: SRM College of Pharmacy, SRMIST (Host Institution) */}
              <div className="flex items-center gap-4 px-2 md:px-5">
                <div className="h-12 w-auto shrink-0 flex items-center justify-center">
                  <SRMISTLogo className="h-11 sm:h-12 w-auto object-contain" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <span className="text-[11px] sm:text-[12px] font-semibold text-[#7554D9] uppercase tracking-wider block">
                    Host Institution
                  </span>
                  <h3 className="text-[17px] sm:text-[18px] font-bold text-[#082746] font-heading leading-tight truncate">
                    SRM College of Pharmacy
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#45536B] font-medium leading-tight">
                    SRM Institute of Science and Technology
                  </p>
                  <p className="text-[13px] sm:text-[14px] text-slate-500 font-normal leading-tight">
                    Kattankulathur, Tamil Nadu, India
                  </p>
                </div>
              </div>

              {/* Institution 2: INTI International University (Collaborating Partner) */}
              <div className="flex items-center gap-4 pt-4 md:pt-0 px-2 md:px-6">
                <div className="h-12 w-12 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="h-11 w-11 shrink-0" fill="none">
                    <path
                      d="M50 8L50 92M8 50L92 50M20.3 20.3L79.7 79.7M20.3 79.7L79.7 20.3"
                      stroke="#E11D48"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <circle cx="50" cy="10" r="10" fill="#E11D48" />
                  </svg>
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <span className="text-[11px] sm:text-[12px] font-semibold text-[#087E8B] uppercase tracking-wider block">
                    Collaborating Institution
                  </span>
                  <h3 className="text-[17px] sm:text-[18px] font-bold text-[#082746] font-heading leading-tight">
                    INTI International University
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#45536B] font-medium leading-tight">
                    Malaysia
                  </p>
                </div>
              </div>

              {/* Institution 3: Indian Pharmaceutical Association (IPA) */}
              <div className="flex flex-col justify-center gap-2 pt-4 md:pt-0 px-2 md:px-6">
                <span className="text-[11px] sm:text-[12px] font-semibold text-blue-700 uppercase tracking-wider block font-mono">
                  Professional Association
                </span>
                <div className="flex items-center">
                  <img
                    src={IMAGES.ipaOfficialLogo}
                    alt="The Indian Pharmaceutical Association (IPA) - ...CRUSADE FOR THE PROFESSION"
                    className="h-10 sm:h-12 w-auto max-w-[220px] sm:max-w-[250px] object-contain"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

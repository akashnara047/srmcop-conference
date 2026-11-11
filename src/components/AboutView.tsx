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
    <div className="w-full bg-gradient-to-b from-[#FAF8FF] via-white to-[#F0F9FD] min-h-screen relative overflow-hidden py-7 sm:py-9 lg:py-10">
      {/* =====================================================================
          BACKGROUND ARTWORK: BUILDING WATERMARK & 3D MOLECULAR CLUSTER
         ===================================================================== */}

      {/* Top-Left Architectural Watermark: SRM College of Pharmacy Campus Building */}
      <div className="absolute left-0 top-0 w-[460px] sm:w-[600px] lg:w-[760px] h-[340px] sm:h-[420px] lg:h-[480px] pointer-events-none opacity-25 lg:opacity-30 overflow-hidden z-0">
        <img
          src={IMAGES.srmPharmacyBuilding}
          alt="SRM College of Pharmacy"
          className="w-full h-full object-cover object-left-top"
        />
        {/* Soft radial & directional gradient masks melting smoothly into the white background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-white" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white" />
      </div>

      {/* Top-Right 3D Artwork: 5-Atom Molecular Cluster with 3D Spheres & Covalent Rods */}
      <div className="absolute right-2 sm:right-6 lg:right-10 top-2 sm:top-4 w-44 sm:w-56 lg:w-68 h-auto pointer-events-none opacity-90 hidden sm:block z-0">
        <svg viewBox="0 0 200 200" className="w-full h-auto drop-shadow-[0_12px_24px_rgba(117,84,217,0.22)]" fill="none">
          <defs>
            {/* 3D Purple Atom Sphere Gradient */}
            <radialGradient id="aboutMolPurple" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#C084FC" />
              <stop offset="65%" stopColor="#8B50E8" />
              <stop offset="100%" stopColor="#581C87" />
            </radialGradient>

            {/* 3D Cyan Atom Sphere Gradient */}
            <radialGradient id="aboutMolCyan" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#67E8F9" />
              <stop offset="65%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#0E7490" />
            </radialGradient>

            {/* Covalent Rod Bond Gradient */}
            <linearGradient id="aboutMolRod" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="50%" stopColor="#67E8F9" />
              <stop offset="100%" stopColor="#93C5FD" />
            </linearGradient>
          </defs>

          {/* Covalent Cylindrical Bonds */}
          <line x1="60" y1="45" x2="135" y2="105" stroke="url(#aboutMolRod)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="135" y1="105" x2="45" y2="135" stroke="url(#aboutMolRod)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="135" y1="105" x2="175" y2="45" stroke="url(#aboutMolRod)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="135" y1="105" x2="155" y2="175" stroke="url(#aboutMolRod)" strokeWidth="4" strokeLinecap="round" />

          {/* Atom 1: Top-left Purple */}
          <circle cx="60" cy="45" r="14" fill="url(#aboutMolPurple)" filter="drop-shadow(0 4px 6px rgba(117,84,217,0.3))" />

          {/* Atom 2: Bottom-left Purple */}
          <circle cx="45" cy="135" r="17" fill="url(#aboutMolPurple)" filter="drop-shadow(0 4px 6px rgba(117,84,217,0.3))" />

          {/* Atom 3: Center Purple */}
          <circle cx="135" cy="105" r="18" fill="url(#aboutMolPurple)" filter="drop-shadow(0 6px 10px rgba(117,84,217,0.35))" />

          {/* Atom 4: Top-right Cyan */}
          <circle cx="175" cy="45" r="15" fill="url(#aboutMolCyan)" filter="drop-shadow(0 4px 6px rgba(6,182,212,0.3))" />

          {/* Atom 5: Bottom-right Cyan */}
          <circle cx="155" cy="175" r="12" fill="url(#aboutMolCyan)" filter="drop-shadow(0 4px 6px rgba(6,182,212,0.3))" />
        </svg>
      </div>

      {/* Soft flowing background wave ribbons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
          <path
            d="M-50,70 C300,140 680,20 1080,85 C1290,125 1410,40 1500,70 L1500,0 L-50,0 Z"
            fill="url(#topWaveRibbonAbout)"
            opacity="0.45"
          />
          <path
            d="M-50,830 C340,780 720,880 1100,810 C1290,770 1410,830 1500,805 L1500,900 L-50,900 Z"
            fill="url(#bottomWaveRibbonAbout)"
            opacity="0.4"
          />
          <defs>
            <linearGradient id="topWaveRibbonAbout" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#EDE9FA" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#8B50E8" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="bottomWaveRibbonAbout" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#EDE9FA" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8B50E8" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* =====================================================================
          EXPANDED HORIZONTAL CONTENT CONTAINER (92-94% VIEWPORT, MAX 1700px)
         ===================================================================== */}
      <div className="w-[93%] max-w-[1700px] mx-auto relative z-10 space-y-6 sm:space-y-7">
        {/* =====================================================================
            1. SECTION HEADING (PROPORTIONATE 48-52px, LINE-HEIGHT ~1.08)
           ===================================================================== */}
        <div className="text-center max-w-4xl mx-auto space-y-2">
          {/* Eyebrow Pill Badge: ABOUT THE INTERNATIONAL CONFERENCE */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[12px] sm:text-[13px] font-semibold tracking-wider uppercase shadow-xs">
            <Info className="w-3.5 h-3.5" />
            <span>ABOUT THE INTERNATIONAL CONFERENCE</span>
          </div>

          {/* Main Heading: Scaled to 48-52px desktop, line-height 1.08 */}
          <h1 className="text-3xl sm:text-4xl lg:text-[48px] xl:text-[50px] font-bold text-[#082746] font-heading tracking-tight leading-[1.08]">
            Accelerating Translational Drug Innovation <br className="hidden sm:inline" />
            Through{' '}
            <span className="text-[#8B50E8]">Artificial </span>
            <span className="text-[#06B6D4]">Intelligence</span>
          </h1>

          {/* Subtle Curved Accent Underline Flourish */}
          <div className="w-28 sm:w-36 h-1 bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] rounded-full mx-auto mt-1" />
        </div>

        {/* =====================================================================
            2. THREE-COLUMN BALANCED GRID (32% - 34% - 34% Distribution)
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-[32fr_34fr_34fr] gap-4 sm:gap-5 lg:gap-6 items-stretch">
          {/* -------------------------------------------------------------------
              COLUMN 1 (Left 32%): Conference Charter (Higher Placement & Optimal Width)
             ------------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-[#DDD6FE]/80 shadow-sm p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-4">
            {/* Header Badge (15-16px column label) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EDE9FE] text-[#7554D9] text-[15px] sm:text-[16px] font-semibold tracking-wide self-start border border-[#DDD6FE]">
              <Building2 className="w-4 h-4" />
              <span>Conference Charter</span>
            </div>

            {/* Paragraphs with 17-18px body font and generous line length */}
            <div className="space-y-4 flex-1 flex flex-col justify-start pt-1">
              {/* Conference Introduction (17-18px) */}
              <div className="border-l-4 border-[#7554D9] pl-4 py-0.5">
                <p className="text-[17px] sm:text-[18px] text-[#082746] font-normal leading-relaxed">
                  The International Conference on{' '}
                  <strong className="font-bold text-[#082746]">
                    AI-Powered Innovations in Drug Discovery and Development (15–16 February 2027)
                  </strong>{' '}
                  is organized by SRM College of Pharmacy, SRMIST, India, in academic collaboration with INTI
                  International University, Malaysia, and the Indian Pharmaceutical Association (IPA).
                </p>
              </div>

              {/* Supporting Paragraph (17-18px) */}
              <p className="text-[16.5px] sm:text-[17.5px] text-[#45536B] font-normal leading-relaxed pl-1">
                Artificial Intelligence is no longer merely a predictive tool—it is the foundational
                infrastructure for modern molecular discovery, de novo protein design, phenotypic
                screening, and targeted drug delivery. This conference brings together global thought
                leaders to evaluate bench-to-bedside trajectories and address real-world deployment challenges.
              </p>
            </div>

            {/* Subtle Footer Timestamp */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[13px] sm:text-[14px] text-slate-500 font-medium">
              <span>SRMIST Kattankulathur</span>
              <span className="text-[#7554D9] font-semibold">15–16 February 2027</span>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              COLUMN 2 (Middle 34%): Conference Objectives (19-21px Titles, 16-17px Desc)
             ------------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-[#DDD6FE]/80 shadow-sm p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-3.5">
            {/* Header Badge (15-16px column label) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[15px] sm:text-[16px] font-semibold tracking-wide shadow-xs self-start">
              <Target className="w-4 h-4" />
              <span>Conference Objectives</span>
            </div>

            {/* Three Separate Vertically Arranged Objective Cards */}
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {/* Objective 1 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] hover:bg-[#FAF8FF] border border-slate-100 hover:border-[#7554D9]/30 transition-all flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#F5F2FE] text-[#7554D9] flex items-center justify-center shrink-0 border border-[#DDD6FE] shadow-2xs mt-0.5">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[19px] sm:text-[20px] font-semibold text-[#082746] font-heading leading-snug">
                    01. Advance Interdisciplinary Science
                  </h3>
                  <p className="text-[16px] sm:text-[16.5px] text-[#45536B] font-normal leading-relaxed">
                    Advance interdisciplinary science and translational research in drug discovery and development.
                    Foster cross-pollination between computer scientists, bioinformaticians, medicinal chemists, and
                    clinical pharmacologists.
                  </p>
                </div>
              </div>

              {/* Objective 2 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] hover:bg-[#F0FCFD] border border-slate-100 hover:border-[#087E8B]/30 transition-all flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#E0F7FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-[#A5F3FC] shadow-2xs mt-0.5">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[19px] sm:text-[20px] font-semibold text-[#082746] font-heading leading-snug">
                    02. Accelerate Formulation & Delivery
                  </h3>
                  <p className="text-[16px] sm:text-[16.5px] text-[#45536B] font-normal leading-relaxed">
                    Examine precision nanotechnology, nanocarriers, and targeted polymeric systems that enhance
                    bioavailability and patient compliance for complex therapeutic molecules.
                  </p>
                </div>
              </div>

              {/* Objective 3 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] hover:bg-[#F0FCFD] border border-slate-100 hover:border-[#087E8B]/30 transition-all flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#E6F8FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-[#99F6E4] shadow-2xs mt-0.5">
                  <Handshake className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[19px] sm:text-[20px] font-semibold text-[#082746] font-heading leading-snug">
                    03. Foster Global Partnerships
                  </h3>
                  <p className="text-[16px] sm:text-[16.5px] text-[#45536B] font-normal leading-relaxed">
                    Foster global academic–industry partnerships and collaborative research networks to initiate
                    multi-center trials, co-authored publications, and patent filings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              COLUMN 3 (Right 34%): Topics of Interest (16-17px Topic Labels, 2 Cols)
             ------------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-[#DDD6FE]/90 shadow-sm p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-3.5">
            {/* Header Badge & Accent Bar (15-16px column label) */}
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#7554D9] text-white text-[15px] sm:text-[16px] font-semibold tracking-wide shadow-xs">
                <Users className="w-4 h-4" />
                <span>Topics of Interest</span>
              </div>
              <div className="w-14 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full" />
            </div>

            {/* 10 Topic Cards in 2-Column Grid x 5 Rows with 16-17px font */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              {TOPICS_OF_INTEREST.map((topic, tIdx) => {
                const IconComponent = topic.icon;
                return (
                  <div
                    key={tIdx}
                    className="min-h-[56px] p-2 sm:p-2.5 px-3 rounded-2xl bg-[#F8FAFD] hover:bg-[#FAF8FF] border border-slate-100 hover:border-[#7554D9]/30 transition-all flex items-center gap-3 group"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${topic.colorClass}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[16px] sm:text-[16.5px] font-semibold text-[#082746] leading-snug">
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

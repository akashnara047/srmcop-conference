import React from 'react';
import { IMAGES } from '../lib/images';
import { OptimizedPicture } from './OptimizedImage';
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
  Calendar,
  Eye,
  Compass,
  GraduationCap,
  Award,
  Lightbulb,
  MapPin,
  Presentation,
} from 'lucide-react';
import { SRMISTLogo } from './Logos';

interface AboutViewProps {
  onNavigate?: (tab: string, trackId?: string) => void;
}

// 10 Topics of Interest matching the approved specification
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

const MISSION_STATEMENTS = [
  {
    number: '01',
    icon: Compass,
    cardBg: 'bg-gradient-to-br from-[#FAF8FF] to-white border-[#DDD6FE]/80',
    iconClass: 'bg-[#EDE9FE] text-[#7554D9] border-[#DDD6FE]',
    text: 'To evolve into a world-class educational institution in pharmacy through collaboration and innovation.',
  },
  {
    number: '02',
    icon: GraduationCap,
    cardBg: 'bg-gradient-to-br from-[#F3FCFD] to-white border-[#BAE6FD]/80',
    iconClass: 'bg-[#E0F7FA] text-[#087E8B] border-[#A5F3FC]',
    text: 'To train pharmacy students to achieve ethical, professional, and research-oriented standards through a multidisciplinary approach.',
  },
  {
    number: '03',
    icon: Lightbulb,
    cardBg: 'bg-gradient-to-br from-[#FAF8FF] to-white border-[#E9D5FF]/80',
    iconClass: 'bg-[#F3E8FF] text-[#6D28D9] border-[#E9D5FF]',
    text: 'To develop innovative methodologies and provide consultancy to the pharmaceutical industry, promoting the adoption of modern advances in healthcare.',
  },
];

// Official Institutional Rankings & Accreditations matching the homepage strip
const INSTITUTIONAL_ACHIEVEMENTS = [
  {
    id: 'nirf',
    name: 'NIRF 2025',
    value: '10th Rank',
    description: 'Pharmacy Institutions in India',
    logo: IMAGES.nirfLogo,
    logoAlt: 'NIRF - National Institutional Ranking Framework',
    tileClass: 'bg-gradient-to-br from-white via-[#FAF8FF] to-[#F4F0FF] border-[#DDD6FE]/90',
  },
  {
    id: 'qci',
    name: 'QCI',
    value: 'Grade A+',
    description: 'Quality Council of India',
    logo: IMAGES.qciLogo,
    logoAlt: 'QCI - Quality Council of India',
    tileClass: 'bg-gradient-to-br from-white via-[#F5FCFE] to-[#ECFAFD] border-[#BAE6FD]/90',
  },
  {
    id: 'nba',
    name: 'NBA',
    value: 'Accredited',
    description: 'NBA Accreditation for B.Pharmacy',
    logo: IMAGES.nbaLogo,
    logoAlt: 'NBA - National Board of Accreditation',
    tileClass: 'bg-gradient-to-br from-white via-[#F8FAFF] to-[#EEF2FF] border-[#C7D2FE]/90',
  },
  {
    id: 'naac',
    name: 'NAAC',
    value: 'A++ Grade Accreditation',
    description: 'Highest Grade',
    logo: IMAGES.naacLogo,
    logoAlt: 'NAAC A++ Accredited - Highest Grade',
    tileClass: 'bg-gradient-to-br from-white via-[#FAF8FF] to-[#F3E8FF]/70 border-[#E9D5FF]/90',
  },
  {
    id: 'qs-world',
    name: 'QS WORLD RANKINGS',
    value: '201–250 (2026)',
    description: 'Pharmacy & Pharmacology',
    logo: IMAGES.qsWorldRankingLogo,
    logoAlt: 'QS World University Rankings by Subject 2026',
    tileClass: 'bg-gradient-to-br from-white via-[#F4FCFE] to-[#E6F8FC]/85 border-[#A5F3FC]/90',
  },
  {
    id: 'qs-igauge',
    name: 'QS I-GAUGE',
    value: 'PLATINUM+ Rating',
    description: 'Pharmacy Subject Rating',
    logo: IMAGES.qsIGaugeLogo,
    logoAlt: 'QS I-GAUGE Platinum+ Rating',
    tileClass: 'bg-gradient-to-br from-white via-[#F9F7FF] to-[#F1ECFE] border-[#DDD6FE]/90',
  },
];

export const AboutView: React.FC<AboutViewProps> = () => {
  return (
    <div
      className="w-full bg-[#FAF8FF] min-h-screen relative overflow-x-hidden py-6 sm:py-8 lg:py-10"
    >
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <OptimizedPicture
          src={IMAGES.aboutConferencePageBg}
          alt=""
          className="w-full h-full object-cover object-center"
          sizes="100vw"
          loading="eager"
        />
      </div>
      {/* =====================================================================
          RESPONSIVE CONTENT CONTAINER
         ===================================================================== */}
      <div className="w-[93%] max-w-[1440px] mx-auto relative z-10 space-y-8 lg:space-y-9">
        {/* =====================================================================
            1. HERO & HEADING
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
            2–4. ABOUT THE CONFERENCE, CONFERENCE OBJECTIVES & TOPICS OF INTEREST
           ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] xl:grid-cols-[1.4fr_0.98fr_1.02fr] gap-4 lg:gap-5 items-start">
          {/* -------------------------------------------------------------------
              2. COLUMN 1: ABOUT THE CONFERENCE (Exact Reference Replication)
             ------------------------------------------------------------------- */}
          <div className="md:col-span-2 xl:col-span-1 bg-white/95 backdrop-blur-sm rounded-[26px] sm:rounded-[30px] border border-[#DDD6FE]/90 shadow-[0_8px_30px_rgba(117,84,217,0.07)] p-4 sm:p-5 lg:p-6 flex flex-col space-y-3.5 relative overflow-hidden">
            {/* Decorative Flowing Cyan & Lavender Waves Across Upper-Right Header Area */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-0 w-[72%] h-32 overflow-hidden"
            >
              <svg viewBox="0 0 420 130" className="w-full h-full" fill="none" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="aboutHeaderWaveCyan" x1="0%" y1="0%" x2="100%" y2="80%">
                    <stop offset="0%" stopColor="#E0F7FA" stopOpacity="0.15" />
                    <stop offset="45%" stopColor="#BAE6FD" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.45" />
                  </linearGradient>
                  <linearGradient id="aboutHeaderWaveLavender" x1="15%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EDE9FE" stopOpacity="0.3" />
                    <stop offset="55%" stopColor="#DDD6FE" stopOpacity="0.72" />
                    <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <path
                  d="M40,68 C135,105 220,18 330,12 C375,10 402,22 420,30 L420,0 L40,0 Z"
                  fill="url(#aboutHeaderWaveCyan)"
                />
                <path
                  d="M150,76 C245,98 310,22 420,8 L420,115 C385,78 305,78 150,76 Z"
                  fill="url(#aboutHeaderWaveLavender)"
                />
              </svg>
            </div>

            {/* Prominent Card Heading Gradient Pill */}
            <div className="relative z-10 inline-flex items-center gap-2.5 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-[#6D4AFF] via-[#8B50E8] to-[#22C5D9] text-white text-[17px] sm:text-[19px] font-bold tracking-tight shadow-sm self-start font-['Plus_Jakarta_Sans',sans-serif]">
              <Presentation className="w-5 h-5 shrink-0" />
              <span>About the Conference</span>
            </div>

            {/* Two-Column Integrated Composition: Left Curved Illustration + Right Conference Text */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[38fr_62fr] gap-4 items-stretch">
              {/* Left Scientific Illustration Panel with Flowing Curved Outer Boundary */}
              <div className="relative flex items-center justify-center min-h-[290px] sm:min-h-[340px]">
                {/* Hidden SVG ClipPath definition for the organic flowing right-edge S-curve */}
                <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
                  <defs>
                    <clipPath id="aboutAiVisualOrganicCurve" clipPathUnits="objectBoundingBox">
                      <path d="M 0.08,0 L 0.64,0 C 0.82,0.06 0.91,0.20 0.96,0.36 C 1.00,0.48 1.00,0.64 0.96,0.78 C 0.90,0.91 0.82,0.98 0.72,1 L 0.08,1 C 0.03,1 0,0.97 0,0.93 L 0,0.07 C 0,0.03 0.03,0 0.08,0 Z" />
                    </clipPath>
                  </defs>
                </svg>

                {/* Soft Translucent Lavender-to-Cyan Flowing Halo Behind Artwork */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none"
                >
                  <svg viewBox="0 0 240 420" className="w-full h-full" fill="none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="aboutIllustrationHalo" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#DDD6FE" stopOpacity="0.85" />
                        <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#EDE9FE" stopOpacity="0.85" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M24,0 L195,0 C235,65 240,175 232,265 C224,350 198,402 175,420 L24,420 C10,420 0,410 0,396 L0,24 C0,10 10,0 24,0 Z"
                      fill="url(#aboutIllustrationHalo)"
                    />
                  </svg>
                </div>

                {/* Main Clipped Deep-Blue Scientific Illustration (Preserving AI Chip, Capsule & DNA) */}
                <div
                  className="relative w-full max-w-[260px] sm:max-w-none aspect-[2/3] sm:aspect-auto sm:h-full sm:max-h-[375px] overflow-hidden rounded-l-[22px] bg-[#082B84] shadow-sm"
                  style={{ clipPath: 'url(#aboutAiVisualOrganicCurve)' }}
                >
                  <OptimizedPicture
                    src={IMAGES.aboutConferenceAiVisual}
                    alt="Artificial intelligence in pharmaceutical research featuring AI chip, capsule, and DNA helix"
                    className="w-full h-full object-cover object-[18%_center]"
                    sizes="(max-width: 640px) 260px, 360px"
                    loading="eager"
                    fetchPriority="high"
                  />
                  {/* Subtle right-edge cyan/lavender translucent rim blend */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-9 bg-gradient-to-l from-[#C4B5FD]/35 via-[#93C5FD]/15 to-transparent"
                  />
                </div>
              </div>

              {/* Right Text Column: Italic Purple Tagline + Two Verbatim Paragraphs */}
              <div className="flex flex-col justify-start space-y-2.5 min-w-0 pt-0.5">
                {/* Bold Italic Purple Tagline */}
                <p className="text-[13.5px] sm:text-[14.5px] font-bold italic text-[#6D28D9] font-['Plus_Jakarta_Sans',sans-serif] leading-[1.36]">
                  Redefining Drug Discovery. Accelerating Innovation. Advancing Healthcare.
                </p>

                {/* Complete Verbatim Conference Paragraphs */}
                <div className="space-y-2.5 text-[12.5px] sm:text-[13px] text-[#334155] font-normal leading-[1.52] font-['Inter',sans-serif]">
                  <p>
                    Artificial Intelligence (AI) is ushering in a new era of pharmaceutical innovation, transforming how drug candidates are identified, molecular interactions are predicted, and therapeutic strategies are developed. By integrating AI, machine learning, computational science, and pharmaceutical research, new opportunities are emerging to accelerate drug discovery, optimize development pathways, and advance precision medicine.
                  </p>
                  <p>
                    The International Conference on AI-Powered Innovations in Drug Discovery and Development will bring together researchers, academicians, industry professionals, and healthcare innovators to explore emerging technologies, exchange scientific insights, and foster interdisciplinary collaboration. Through expert lectures, scientific presentations, and engaging discussions, the conference will address emerging opportunities, scientific challenges, and the responsible integration of AI into pharmaceutical research—bridging computational intelligence with real-world healthcare needs.
                  </p>
                </div>
              </div>
            </div>

            {/* Separate Concluding Highlight Panel at the Bottom of the Card */}
            <div className="relative z-10 rounded-2xl bg-gradient-to-r from-[#F3EFFE] via-[#F2F5FF] to-[#E6F8FC] border border-[#DFD6FA]/90 px-4 py-3 sm:px-5 sm:py-3 flex items-center gap-3.5 shadow-2xs">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 border border-[#DDD6FE] text-[#7554D9] flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-[13px] sm:text-[14px] font-bold text-[#6D28D9] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                Join us in shaping the next generation of drug discovery and advancing a smarter, faster, and healthier future.
              </p>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              3. COLUMN 2: CONFERENCE OBJECTIVES (Compact, Content-Driven Cards)
             ------------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-sm rounded-[26px] sm:rounded-[30px] border border-[#DDD6FE]/90 shadow-[0_8px_30px_rgba(117,84,217,0.07)] p-4 sm:p-5 lg:p-6 flex flex-col space-y-3">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[15px] sm:text-[16px] lg:text-[17px] font-semibold tracking-wide shadow-xs self-start font-['Plus_Jakarta_Sans',sans-serif]">
              <Target className="w-4 h-4 shrink-0" />
              <span>Conference Objectives</span>
            </div>

            {/* Three Compact Vertically Arranged Objective Cards */}
            <div className="flex flex-col gap-3">
              {/* Objective 1 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] hover:bg-[#FAF8FF] border border-slate-100 hover:border-[#7554D9]/30 transition-all flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F2FE] text-[#7554D9] flex items-center justify-center shrink-0 border border-[#DDD6FE] shadow-2xs">
                  <FlaskConical className="w-[18px] h-[18px]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                    01. Advance Interdisciplinary Science
                  </h3>
                  <p className="text-[13.5px] sm:text-[14px] text-[#45536B] font-normal leading-[1.42] font-['Inter',sans-serif]">
                    Advance interdisciplinary science and translational research in drug discovery and development.
                    Foster cross-pollination between computer scientists, bioinformaticians, medicinal chemists, and
                    clinical pharmacologists.
                  </p>
                </div>
              </div>

              {/* Objective 2 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] hover:bg-[#F0FCFD] border border-slate-100 hover:border-[#087E8B]/30 transition-all flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0F7FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-[#A5F3FC] shadow-2xs">
                  <Layers className="w-[18px] h-[18px]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                    02. Accelerate Formulation &amp; Delivery
                  </h3>
                  <p className="text-[13.5px] sm:text-[14px] text-[#45536B] font-normal leading-[1.42] font-['Inter',sans-serif]">
                    Examine precision nanotechnology, nanocarriers, and targeted polymeric systems that enhance
                    bioavailability and patient compliance for complex therapeutic molecules.
                  </p>
                </div>
              </div>

              {/* Objective 3 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] hover:bg-[#F0FCFD] border border-slate-100 hover:border-[#087E8B]/30 transition-all flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F8FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-[#99F6E4] shadow-2xs">
                  <Handshake className="w-[18px] h-[18px]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                    03. Foster Global Partnerships
                  </h3>
                  <p className="text-[13.5px] sm:text-[14px] text-[#45536B] font-normal leading-[1.42] font-['Inter',sans-serif]">
                    Foster global academic–industry partnerships and collaborative research networks to initiate
                    multi-center trials, co-authored publications, and patent filings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              4. COLUMN 3: TOPICS OF INTEREST (Compact, Content-Driven Grid)
             ------------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-sm rounded-[26px] sm:rounded-[30px] border border-[#DDD6FE]/90 shadow-[0_8px_30px_rgba(117,84,217,0.07)] p-4 sm:p-5 lg:p-6 flex flex-col space-y-3">
            {/* Header Badge & Accent Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7554D9] text-white text-[15px] sm:text-[16px] lg:text-[17px] font-semibold tracking-wide shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
                <Users className="w-4 h-4 shrink-0" />
                <span>Topics of Interest</span>
              </div>
              <div className="w-14 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full" />
            </div>

            {/* 10 Topic Cards in 2-Column Compact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {TOPICS_OF_INTEREST.map((topic, tIdx) => {
                const IconComponent = topic.icon;
                return (
                  <div
                    key={tIdx}
                    className="p-2.5 sm:p-3 rounded-xl bg-[#F8FAFD] hover:bg-[#FAF8FF] border border-slate-100 hover:border-[#7554D9]/30 transition-all flex items-center gap-2 sm:gap-2.5"
                  >
                    <div
                      className={`w-8 h-8 sm:w-[34px] sm:h-[34px] rounded-lg flex items-center justify-center shrink-0 ${topic.colorClass}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[13.5px] sm:text-[14px] font-semibold text-[#082746] leading-[1.32] font-['Inter',sans-serif] min-w-0">
                      {topic.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =====================================================================
            5. ABOUT THE INSTITUTION – SRM COLLEGE OF PHARMACY, SRMIST
           ===================================================================== */}
        <section className="space-y-5">
          {/* 1. Centred Section Heading */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[11px] sm:text-xs font-semibold tracking-wider uppercase shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>ABOUT THE INSTITUTION</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight leading-tight">
              SRM College of Pharmacy, SRMIST
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] rounded-full mx-auto" />
          </div>

          {/* 2. Wide Horizontal Institutional Profile Card (42% Photo / 58% Content) */}
          <div className="bg-white/95 backdrop-blur-sm rounded-[26px] sm:rounded-[30px] border border-[#DDD6FE]/90 shadow-[0_8px_30px_rgba(117,84,217,0.07)] p-4 sm:p-5 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[42fr_58fr] gap-5 lg:gap-6 items-stretch">
              {/* Left Column – Large Landscape Campus Photograph with Identity Overlay */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[260px]">
                <OptimizedPicture
                  src={IMAGES.srmPharmacyBuilding}
                  alt="SRM College of Pharmacy, SRMIST, Kattankulathur"
                  className="w-full h-full lg:absolute lg:inset-0 object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#082746]/90 via-[#082746]/50 to-transparent p-3.5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white p-1 shrink-0 shadow-xs flex items-center justify-center">
                      <OptimizedPicture
                        src={IMAGES.srmPharmacyLogo}
                        alt="SRM College of Pharmacy Logo"
                        className="w-full h-full object-contain"
                        sizes="40px"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-white leading-tight min-w-0">
                      <div className="text-sm sm:text-[15px] font-bold font-['Plus_Jakarta_Sans',sans-serif]">
                        SRM College of Pharmacy
                      </div>
                      <div className="text-xs text-slate-200 font-['Inter',sans-serif]">
                        SRMIST, Kattankulathur, Tamil Nadu
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column – Institutional Description & Two Highlight Panels */}
              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-3 text-[15px] sm:text-[15.5px] text-[#1E293B] leading-[1.58] font-['Inter',sans-serif]">
                  <p>
                    SRM College of Pharmacy, SRMIST, Kattankulathur, is one of India&apos;s prominent institutions for pharmaceutical education and research. Established in 1992, the College has a legacy of more than three decades of academic excellence. It offers B.Pharm., Pharm.D., Pharm.D. (PB), M.Pharm., and Ph.D. programmes.
                  </p>
                  <p>
                    SRMIST is accredited with an A++ Grade by NAAC and placed in Category A by the Ministry of Human Resource Development. In the NIRF 2025 rankings, SRM College of Pharmacy, SRMIST, secured the 10th rank among pharmacy institutions in India.
                  </p>
                </div>

                {/* 3. Two Equal-Width Horizontal Highlight Panels (Established & Programmes) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {/* Panel 1 – Established */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#F6F2FF] via-[#FAF8FF] to-white border border-[#DDD6FE] px-4 py-3 flex items-center gap-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7554D9] flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#7554D9] font-['Plus_Jakarta_Sans',sans-serif] leading-none">
                        ESTABLISHED
                      </div>
                      <div className="text-lg sm:text-[19px] font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tabular-nums mt-0.5 leading-tight">
                        1992
                      </div>
                      <div className="text-xs text-slate-600 leading-snug font-['Inter',sans-serif]">
                        Over three decades of excellence.
                      </div>
                    </div>
                  </div>

                  {/* Panel 2 – Programmes */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#ECFAFD] via-[#F4FCFE] to-white border border-[#BAE6FD] px-4 py-3 flex items-center gap-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-[#E0F7FA] border border-[#A5F3FC] text-[#087E8B] flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#087E8B] font-['Plus_Jakarta_Sans',sans-serif] leading-none">
                        PROGRAMMES
                      </div>
                      <div className="text-[13.5px] sm:text-[14px] font-bold text-[#082746] mt-1 leading-snug font-['Plus_Jakarta_Sans',sans-serif]">
                        B.Pharm., Pharm.D., Pharm.D. (PB), M.Pharm., Ph.D.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Separate Institutional Rankings & Accreditations Heading + 3x2 Achievement Grid */}
          <div className="pt-1 space-y-4">
            {/* Centred Gradient Pill with Flanking Horizontal Gradient Lines */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="hidden sm:block flex-1 max-w-[200px] h-px bg-gradient-to-r from-transparent via-[#C4B5FD] to-[#7554D9]/60" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>INSTITUTIONAL RANKINGS &amp; ACCREDITATIONS</span>
              </div>
              <div className="hidden sm:block flex-1 max-w-[200px] h-px bg-gradient-to-l from-transparent via-[#67E8F9] to-[#22C5D9]/60" />
            </div>

            {/* 3-Column, 2-Row Achievement Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 items-stretch">
              {INSTITUTIONAL_ACHIEVEMENTS.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3.5 sm:px-4 sm:py-3.5 flex items-center gap-3.5 shadow-2xs transition-all hover:shadow-sm hover:border-[#7554D9]/45 ${item.tileClass}`}
                >
                  <div className="w-14 h-12 rounded-xl bg-white border border-slate-200/80 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                    <OptimizedPicture
                      src={item.logo}
                      alt={item.logoAlt}
                      className="max-h-full max-w-full object-contain"
                      sizes="56px"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5 leading-tight">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#7554D9] font-['Plus_Jakarta_Sans',sans-serif] block">
                      {item.name}
                    </span>
                    <div className="text-[14.5px] sm:text-[15px] font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                      {item.value}
                    </div>
                    <div className="text-xs text-slate-600 font-['Inter',sans-serif] leading-snug">
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            6. VISION & MISSION (REDESIGNED BALANCED INSTITUTIONAL PROFILE)
           ===================================================================== */}
        <section className="space-y-4">
          <div className="text-center space-y-1.5">
            <span className="text-xs font-bold tracking-widest uppercase text-[#087E8B] font-['Plus_Jakarta_Sans',sans-serif] block">
              INSTITUTIONAL PURPOSE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              Vision &amp; Mission
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full mx-auto" />
          </div>

          <div className="space-y-4">
            {/* A. Prominent Compact Horizontal Vision Panel */}
            <div className="bg-gradient-to-r from-[#ECFAFD] via-white to-[#F5F2FF] backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-[#DDD6FE]/90 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7554D9] flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#7554D9] font-['Plus_Jakarta_Sans',sans-serif] block">
                  VISION
                </span>
                <p className="text-[15px] sm:text-base font-semibold text-[#082746] leading-[1.6] font-['Plus_Jakarta_Sans',sans-serif]">
                  To emerge as a world-renowned pharmacy institute focused on pharmaceutical sciences and research, providing students with a unique learning experience and contributing to the betterment of society.
                </p>
              </div>
            </div>

            {/* B. Three Equal-Width Mission Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Award className="w-4 h-4 text-[#087E8B]" />
                <span className="text-xs font-bold tracking-widest uppercase text-[#087E8B] font-['Plus_Jakarta_Sans',sans-serif]">
                  MISSION
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {MISSION_STATEMENTS.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <div
                      key={item.number}
                      className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col space-y-2.5 ${item.cardBg}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold font-mono text-[#7554D9] tabular-nums">
                          {item.number}.
                        </span>
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${item.iconClass}`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[14px] sm:text-[14.5px] text-[#334155] leading-[1.6] font-['Inter',sans-serif]">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            7. ABOUT INTI INTERNATIONAL UNIVERSITY (ACADEMIC COLLABORATOR)
           ===================================================================== */}
        <section className="space-y-4">
          <div className="text-center space-y-1.5">
            <span className="text-xs font-bold tracking-widest uppercase text-[#087E8B] font-['Plus_Jakarta_Sans',sans-serif] block">
              ACADEMIC COLLABORATOR
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              About INTI International University
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full mx-auto" />
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-[#DDD6FE]/85 shadow-sm p-5 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Verified INTI International University Campus Photo & Official Logo */}
              <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200/80 bg-[#F8FAFD] min-h-[240px] sm:min-h-[280px]">
                <OptimizedPicture
                  src={IMAGES.intiCampusPhoto}
                  alt="INTI International University campus in Putra Nilai, Negeri Sembilan, Malaysia"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-white/95 p-1.5 shadow-xs border border-slate-200/80 flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="INTI International University Logo"
                  >
                    <path
                      d="M50 10L50 90M10 50L90 50M21.7 21.7L78.3 78.3M21.7 78.3L78.3 21.7"
                      stroke="#E11D48"
                      strokeWidth="13"
                      strokeLinecap="round"
                    />
                    <circle cx="50" cy="50" r="11" fill="#E11D48" />
                  </svg>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#082746]/80 via-[#082746]/35 to-transparent p-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 text-[#BE123C] text-xs font-semibold shadow-2xs">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>Malaysia</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Complete Institutional Profile & Compact Highlights */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                <div className="space-y-3 text-[14.5px] sm:text-[15px] text-[#334155] leading-[1.65] font-['Inter',sans-serif]">
                  <p>
                    Established in 1986, INTI International University is a Malaysian higher education institution with four decades of experience in delivering higher education. Its flagship university campus is located in Putra Nilai, Negeri Sembilan, and spans approximately 82 acres.
                  </p>
                  <p>
                    INTI offers academic programmes across diverse disciplines, including Biotechnology and Life Sciences, Health Sciences, Computing and Information Technology, Engineering, Business and Management, and other areas of study. The university emphasises innovative teaching and learning, industry engagement, international academic partnerships and the development of future-ready graduates.
                  </p>
                  <p>
                    With its focus on interdisciplinary education, global engagement and academic development, INTI International University brings an international academic dimension to the International Conference on AI-Powered Innovations in Drug Discovery and Development through its collaboration with SRM College of Pharmacy, SRMIST.
                  </p>
                </div>

                {/* Three Compact Institutional Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2E8F0]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">
                      Established
                    </div>
                    <div className="text-lg font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tabular-nums mt-0.5">
                      1986
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2E8F0]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7554D9]">
                      Campus
                    </div>
                    <div className="text-sm font-bold text-[#082746] mt-1 leading-snug">
                      Putra Nilai, Negeri Sembilan, Malaysia
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2E8F0]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">
                      Campus Area
                    </div>
                    <div className="text-sm font-bold text-[#082746] mt-1 leading-snug">
                      Approximately 82 acres
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            8. ABOUT THE INDIAN PHARMACEUTICAL ASSOCIATION
           ===================================================================== */}
        <section className="space-y-4">
          <div className="text-center space-y-1.5">
            <span className="text-xs font-bold tracking-widest uppercase text-[#7554D9] font-['Plus_Jakarta_Sans',sans-serif] block">
              PROFESSIONAL PARTNER
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              About the Indian Pharmaceutical Association
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-[#7554D9] to-[#22C5D9] rounded-full mx-auto" />
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-[#DDD6FE]/85 shadow-sm p-5 sm:p-7 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 rounded-2xl bg-[#F8FAFD] border border-slate-200/80 p-6 flex items-center justify-center">
                <OptimizedPicture
                  src={IMAGES.ipaOfficialLogo}
                  alt="The Indian Pharmaceutical Association (IPA)"
                  className="max-h-24 w-auto max-w-full object-contain"
                  sizes="260px"
                  loading="lazy"
                />
              </div>

              <div className="md:col-span-8">
                <p className="text-[14.5px] sm:text-[15.5px] text-[#334155] leading-[1.68] font-['Inter',sans-serif]">
                  The Indian Pharmaceutical Association (IPA) is a leading professional organization dedicated to advancing pharmaceutical education, research, and professional practice in India. Through scientific exchange, professional development, and collaboration among academia, industry, and healthcare professionals, IPA contributes to the advancement of pharmaceutical sciences and the future of healthcare.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            8. ORGANISING BODIES & COLLABORATING PARTNERS PANEL (Wider & Proportional)
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
                  <OptimizedPicture
                    src={IMAGES.ipaOfficialLogo}
                    alt="The Indian Pharmaceutical Association (IPA) - ...CRUSADE FOR THE PROFESSION"
                    className="h-10 sm:h-12 w-auto max-w-[220px] sm:max-w-[250px] object-contain"
                    sizes="250px"
                    loading="lazy"
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

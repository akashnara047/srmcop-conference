import React, { useState, useEffect } from 'react';
import { IMAGES } from '../lib/images';
import { CONFERENCE_INFO, SCIENTIFIC_TRACKS, INVITED_SPEAKERS, PRESENTATION_FORMATS } from '../data/conferenceData';
import {
  Calendar, MapPin, Globe, ArrowRight, FileText, CheckCircle2, Check, User, Monitor,
  Award, ChevronRight, Sparkles, Building2, Cpu, Dna, Activity, Brain, Users,
  Mic, Presentation, Handshake, Star, ArrowUp, ExternalLink, Shield, Clock,
  Trophy, Lightbulb, Target, X, Mail, FlaskConical, TrendingUp, Info,
  Layers, Pill, Microscope, GraduationCap, UserPlus, Download, BookOpen, ClipboardList,
  UserCheck, ClipboardCheck, Bell
} from 'lucide-react';
import {
  SRMISTLogo, SRMPharmacyLogo, INTILogo, IPALogo,
  NIRFLogo, NAACLogo, NBALogo, QSWorldRankingLogo, QSIGaugeLogo
} from './Logos';
import { LabFlaskArtwork } from './LabFlaskArtwork';
import { AboutCapsuleIllustration } from './AboutCapsuleIllustration';
import { AboutMoleculeIllustration } from './AboutMoleculeIllustration';
import { TrackIllustration } from './TrackIllustrations';
import { ConferenceCountdown } from './ConferenceCountdown';
import {
  PRESENTATION_CARDS_DATA,
  PRESENTATION_DOCUMENTS,
  SUBMISSION_STEPS,
  type PresentationDocument
} from '../config/presentationDownloads';

interface HomeViewProps {
  onNavigate: (tab: string, trackId?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const [pharmaQuestModalOpen, setPharmaQuestModalOpen] = useState(false);
  const [activeDownloadDoc, setActiveDownloadDoc] = useState<PresentationDocument | null>(null);

  // Lock background scrolling and handle Escape key for modals
  useEffect(() => {
    if (pharmaQuestModalOpen || activeDownloadDoc) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setPharmaQuestModalOpen(false);
          setActiveDownloadDoc(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [pharmaQuestModalOpen, activeDownloadDoc]);

  const handleDocumentDownload = (docId: string) => {
    const doc = PRESENTATION_DOCUMENTS[docId];
    if (!doc) return;
    if (doc.status === 'available' && doc.url) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setActiveDownloadDoc(doc);
    }
  };

  return (
    <div className="w-full">
      {/* =========================================================================
          SECTION 1: UNIFIED INSTITUTIONAL IDENTITY & CONFERENCE HERO
          Exact reproduction of AI-Driven_Pharmacy_Conference_2027_52e2345a.png:
          - Full-width SRMIST campus aerial photograph background with balanced translucent overlay
          - Top: Institutional Masthead (SRMIST logo, SRM College of Pharmacy, IN COLLABORATION WITH, INTI & IPA, Crest)
          - Center: Prominent floating dark navy-to-blue/teal conference hero panel with AI capsule graphic,
            conference title, tagline, dates & venue glass card, and glowing molecular network
          - Bottom: Horizontal white accreditation strip (NIRF 10th, NAAC A++, NBA, QS World Rankings, QS I-GAUGE)
         ========================================================================= */}
      <section className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] relative flex flex-col justify-between py-5 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden bg-[#E6F4F8]">
        {/* Full-Width Authentic SRMIST Campus Aerial Background Photograph */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={IMAGES.srmistCampusAerial}
            alt="SRMIST Campus Landscape and Reflective Lake Panorama"
            className="w-full h-full object-cover object-[center_32%] filter saturate-105"
            loading="eager"
          />
        </div>

        {/* Carefully Balanced Translucent White & Ice-Blue Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/80 via-white/68 to-white/78 backdrop-blur-[0.5px] pointer-events-none" />

        {/* Subtle Violet & Cyan Curved Decorative Accents near Edges */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#22C5D9]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#7554D9]/18 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-35">
          <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
            <path
              d="M-60,120 C280,220 540,60 900,160 C1200,240 1380,120 1500,160"
              stroke="#22C5D9"
              strokeWidth="2.5"
            />
            <path
              d="M-60,780 C320,700 640,840 1000,740 C1260,670 1420,780 1500,750"
              stroke="#7554D9"
              strokeWidth="2.5"
              strokeDasharray="6 6"
            />
          </svg>
        </div>

        {/* FOREGROUND CONTENT: Sits cleanly over campus aerial backdrop */}
        <div className="max-w-7xl mx-auto w-full relative z-10 flex-1 flex flex-col justify-between space-y-4 sm:space-y-5">
          {/* ---------------------------------------------------------------------
              TOP AREA: INSTITUTIONAL IDENTITY & COLLABORATION PARTNERS
             --------------------------------------------------------------------- */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 pt-1">
            {/* Left: Authentic SRMIST Logo */}
            <div className="w-full md:w-1/4 flex justify-center md:justify-start">
              <div className="p-2 sm:p-2.5 bg-white/95 backdrop-blur-md rounded-2xl border border-white/90 shadow-md hover:shadow-lg transition-all">
                <img
                  src={IMAGES.srmistLogo}
                  alt="SRM Institute of Science and Technology"
                  className="h-11 sm:h-13 md:h-15 w-auto object-contain"
                  loading="eager"
                />
              </div>
            </div>

            {/* Center: Institutional Typography & Collaborators */}
            <div className="w-full md:w-2/4 text-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.5rem] font-black text-[#082746] font-heading tracking-tight uppercase leading-none">
                SRM COLLEGE OF PHARMACY
              </h1>
              <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-[#082746] font-heading tracking-normal uppercase mt-1">
                SRM INSTITUTE OF SCIENCE AND TECHNOLOGY
              </h2>

              {/* Location with Purple Accent Lines */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <div className="h-0.5 w-10 sm:w-16 bg-gradient-to-r from-transparent to-[#7554D9]" />
                <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-[#082746] tracking-wide">
                  Kattankulathur, Tamil Nadu, India
                </span>
                <div className="h-0.5 w-10 sm:w-16 bg-gradient-to-l from-transparent to-[#7554D9]" />
              </div>

              {/* IN COLLABORATION WITH */}
              <div className="pt-2 flex flex-col items-center">
                <div className="inline-block px-3.5 py-0.5 bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[9px] sm:text-[10px] font-bold tracking-widest uppercase rounded-full shadow-xs mb-1.5">
                  IN COLLABORATION WITH
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <INTILogo className="h-6 sm:h-7" />
                  <div className="h-5 w-px bg-slate-300 hidden sm:block" />
                  <IPALogo imgClassName="h-7 sm:h-8 md:h-9 w-auto max-w-[170px] sm:max-w-[210px]" />
                </div>
              </div>
            </div>

            {/* Right: Authentic SRM College of Pharmacy Crest */}
            <div className="w-full md:w-1/4 flex justify-center md:justify-end">
              <div className="p-2 sm:p-2.5 bg-white/95 backdrop-blur-md rounded-full border border-white/90 shadow-md hover:scale-105 transition-transform">
                <img
                  src={IMAGES.srmPharmacyLogo}
                  alt="SRM College of Pharmacy Official Crest"
                  className="h-13 w-13 sm:h-15 sm:w-15 md:h-18 md:w-18 object-contain"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              CENTRAL PROMINENT PANEL: DARK NAVY-TO-TEAL CONFERENCE HERO PANEL
             --------------------------------------------------------------------- */}
          <div className="max-w-6xl mx-auto w-full my-1 sm:my-2">
            <div
              className="relative rounded-[26px] sm:rounded-[34px] text-white p-5 sm:p-7 md:p-9 lg:py-10 shadow-2xl border border-[#22C5D9]/35 overflow-hidden bg-cover bg-center bg-no-repeat min-h-[360px] sm:min-h-[390px] flex items-center justify-center"
              style={{ backgroundImage: `url(${IMAGES.neonHeroLabscape})` }}
            >
              {/* Subtle Ambient Vignette / Central Readability Overlay */}
              <div className="absolute inset-0 bg-[#051126]/30 sm:bg-transparent sm:bg-gradient-to-r sm:from-[#051126]/20 sm:via-[#051126]/40 sm:to-[#051126]/20 pointer-events-none" />

              {/* Centered Conference Hero Information */}
              <div className="relative z-10 max-w-3xl mx-auto text-center space-y-3 sm:space-y-3.5 w-full">
                {/* Label Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 border border-[#22C5D9]/40 rounded-full shadow-xs backdrop-blur-md">
                  <Globe className="w-3.5 h-3.5 text-[#22C5D9]" />
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#22C5D9] uppercase">
                    INTERNATIONAL CONFERENCE – 2027
                  </span>
                </div>

                {/* Main Title: AI-Powered Innovations in Drug Discovery and Development */}
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[48px] font-black text-white font-heading leading-[1.14] tracking-tight drop-shadow-md">
                  AI-Powered <span className="text-[#22C5D9]">Innovations</span> in
                  <span className="block mt-1">Drug Discovery and Development</span>
                </h2>

                {/* Tagline */}
                <p className="text-sm sm:text-base md:text-[16.5px] font-medium text-cyan-100/95 tracking-wide max-w-2xl mx-auto drop-shadow-xs">
                  Transforming Discovery. Accelerating Innovation. Advancing Healthcare.
                </p>

                {/* Conference Dates & Venue Glass Banner */}
                <div className="max-w-2xl mx-auto w-full pt-1">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-lg">
                    {/* Dates */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#22C5D9]/25 text-[#22C5D9] rounded-xl shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-[11px] uppercase font-bold text-cyan-200 tracking-wider">
                          CONFERENCE DATES
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-white">
                          15–16 February 2027
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-white/20 hidden sm:block" />

                    {/* Venue */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#22C5D9]/25 text-[#22C5D9] rounded-xl shrink-0">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-[11px] uppercase font-bold text-cyan-200 tracking-wider">
                          CONFERENCE VENUE
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-white">
                          SRM College of Pharmacy, Kattankulathur
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              LIVE CONFERENCE COUNTDOWN SECTION
              Placed immediately below the hero box and above the accreditation strip
             --------------------------------------------------------------------- */}
          <div className="max-w-5xl mx-auto w-full my-1 sm:my-2 px-1 sm:px-0">
            <ConferenceCountdown />
          </div>

          {/* ---------------------------------------------------------------------
              BOTTOM AREA: INSTITUTIONAL RECOGNITIONS & ACCREDITATIONS STRIP
              (NIRF, NAAC, NBA, QS World Rankings, QS I-GAUGE)
             --------------------------------------------------------------------- */}
          <div className="max-w-6xl mx-auto w-full pb-1 px-1 sm:px-0">
            <div className="bg-white/95 backdrop-blur-md border border-white/90 rounded-2xl sm:rounded-3xl shadow-xl p-2.5 sm:p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5 lg:gap-0 divide-y sm:divide-y-0 lg:divide-y-0 lg:divide-x divide-slate-200/80">
                {/* Column 1: NIRF Ranking */}
                <div className="flex items-center justify-center px-2 sm:px-3 py-1">
                  <NIRFLogo />
                </div>

                {/* Column 2: NAAC Accreditation */}
                <div className="flex items-center justify-center px-2 sm:px-3 py-1">
                  <NAACLogo />
                </div>

                {/* Column 3: NBA Accreditation */}
                <div className="flex items-center justify-center px-2 sm:px-3 py-1">
                  <NBALogo />
                </div>

                {/* Column 4: QS World University Rankings */}
                <div className="flex items-center justify-center px-2 sm:px-3 py-1">
                  <QSWorldRankingLogo />
                </div>

                {/* Column 5: QS I-GAUGE */}
                <div className="flex items-center justify-center px-2 sm:px-3 py-1 sm:col-span-2 lg:col-span-1">
                  <QSIGaugeLogo />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: EXPERT INSIGHTS & DIVERSE PLATFORMS
          (INVITED SPEAKERS & SCIENTIFIC PROGRAMME HIGHLIGHTS)
          Exact reproduction of Expert Insights and Diverse Platforms.png:
          - Top label: INVITED SPEAKERS & SCIENTIFIC PROGRAMME HIGHLIGHTS
          - Main heading: "Expert Insights and Diverse Platforms"
            with gradient text and curved cyan underline flourish
          - Supporting copy: "Learn from global experts and showcase your research through multiple presentation formats at a hybrid international conference."
          - Asymmetrical Two-Column Layout (58% Left / 42% Right on Desktop, equal height):
            * Left Panel – Invited Speakers:
              Deep purple gradient card with realistic conference stage microphone,
              "Invited Speakers" header, 3 Invited Speakers stat panel (Plenary Faculty & Hybrid Conference Mode),
              and 3 white circular checkmark highlights.
            * Right Panel – Scientific Programme Highlights:
              Three horizontal highlight cards: Oral Presentations (cyan),
              Poster Presentations (peach/amber), and Plenary & Parallel Sessions (lavender).
          - Decorative atmosphere:
            * Top-right: Halftone dotted 3D globe with atmospheric cyan glow
            * Lower-left: 3D molecular structure
            * Lower-right: Dual 3D pharmaceutical capsules on wave
            * Flowing wave ribbons across top and bottom
          - Bottom CTA: "View Speakers & Programme →"
         ========================================================================= */}
      <section
        className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] relative flex flex-col justify-between py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${IMAGES.expertInsightsBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >

        {/* Foreground Content */}
        <div className="max-w-7xl mx-auto w-full relative z-10 flex-1 flex flex-col justify-center space-y-5 sm:space-y-6 lg:space-y-7">
          {/* 1. SECTION HEADING & IDENTITY */}
          <div className="text-center space-y-2.5 max-w-4xl mx-auto">
            {/* Flanked Pill Badge: INVITED SPEAKERS & SCIENTIFIC PROGRAMME HIGHLIGHTS */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#7554D9]/40" />
              <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-sm">
                <Mic className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase">
                  INVITED SPEAKERS & SCIENTIFIC PROGRAMME HIGHLIGHTS
                </span>
              </div>
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#22C5D9]/50" />
            </div>

            {/* Main Heading: Expert Insights and Diverse Platforms */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[46px] xl:text-[48px] font-black text-[#082746] font-heading tracking-tight leading-[1.18]">
              Expert Insights and{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] bg-clip-text text-transparent">
                  Diverse Platforms
                </span>
                <svg
                  className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-2 text-[#22C5D9]"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,5 Q50,0 100,5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Supporting Text */}
            <p className="text-sm sm:text-[15.5px] lg:text-base text-[#45536B] leading-relaxed max-w-2xl mx-auto font-normal">
              Learn from global experts and showcase your research through multiple presentation formats at a hybrid international conference.
            </p>
          </div>

          {/* 2. ASYMMETRIC TWO-COLUMN PANELS (58% LEFT / 42% RIGHT ON DESKTOP, EQUAL HEIGHT) */}
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-stretch w-full">
            {/* ===============================================================
                LEFT PANEL: INVITED SPEAKERS (58% WIDTH ON DESKTOP)
               =============================================================== */}
            <div
              className="w-full lg:w-[58%] relative rounded-[32px] p-6 sm:p-7 md:p-8 text-white shadow-xl border border-white/20 overflow-hidden flex flex-col justify-between min-h-[360px] sm:min-h-[390px] group bg-no-repeat"
              style={{
                backgroundImage: `url(${IMAGES.spotlightMicrophone})`,
                backgroundSize: 'cover',
                backgroundPosition: 'left center',
              }}
            >
              {/* Subtle Gradient Overlays to preserve microphone clarity on left and ensure high text contrast on right */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-[#100726]/40 to-[#0A031A]/80 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0A031A]/50 to-transparent pointer-events-none" />

              {/* Foreground Content Stack */}
              <div className="relative z-10 flex flex-col justify-between h-full space-y-4 sm:space-y-5">
                {/* Panel Header */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25 shadow-xs">
                    <Users className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-[26px] font-black text-white font-heading tracking-tight drop-shadow-sm">
                    Invited Speakers
                  </h3>
                </div>

                {/* Speaker Statistics: 10 Invited Speakers, 7 Offline, 3 Online */}
                <div className="bg-[#12072B]/75 backdrop-blur-md rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-white/20 flex items-center justify-between gap-3 sm:gap-4 max-w-sm sm:max-w-md ml-auto w-full">
                  {/* Left: Total Speaker Count (10 Invited Speakers) */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B50E8] to-[#6366F1] text-white flex items-center justify-center shrink-0 shadow-md border border-white/25">
                      <Users className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-3xl sm:text-4xl font-black text-white font-heading leading-none tabular-nums drop-shadow-xs">
                        10
                      </div>
                      <div className="text-xs sm:text-[12.5px] font-bold text-white/95 uppercase tracking-wider mt-1">
                        Invited Speakers
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div className="h-11 w-px bg-white/25 shrink-0" />

                  {/* Right: Mode Breakdown (7 Offline, 3 Online) */}
                  <div className="space-y-1.5 text-left shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-xs" />
                      <span className="text-base sm:text-lg font-black text-white font-heading tabular-nums">7</span>
                      <span className="text-xs sm:text-[13.5px] font-bold text-white/95">Offline</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shrink-0 shadow-xs" />
                      <span className="text-base sm:text-lg font-black text-white font-heading tabular-nums">3</span>
                      <span className="text-xs sm:text-[13.5px] font-bold text-white/95">Online</span>
                    </div>
                  </div>
                </div>

                {/* Three Checkmark Highlights */}
                <div className="space-y-2.5 pt-1 max-w-sm sm:max-w-md ml-auto w-full">
                  {[
                    'Renowned experts from academia and industry',
                    'Plenary and parallel sessions',
                    'Insights on emerging trends and future directions in drug discovery and development',
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-white text-[#7554D9] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-sm sm:text-[15px] text-white font-medium leading-snug drop-shadow-xs">
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===============================================================
                RIGHT PANEL: SCIENTIFIC PROGRAMME HIGHLIGHTS (42% WIDTH ON DESKTOP)
               =============================================================== */}
            <div className="w-full lg:w-[42%] relative rounded-[32px] p-6 sm:p-7 md:p-8 bg-white/95 backdrop-blur-md shadow-xl border border-[#E2E8F0] flex flex-col justify-between space-y-4 min-h-[360px] sm:min-h-[390px]">
              {/* Panel Header */}
              <div className="flex items-center gap-2.5 pb-0.5">
                <div className="w-9 h-9 rounded-full bg-[#EDE9FA] text-[#7554D9] flex items-center justify-center shrink-0 shadow-2xs">
                  <Layers className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-[26px] font-black text-[#082746] font-heading tracking-tight">
                  Scientific Programme Highlights
                </h3>
              </div>

              {/* Three Horizontal Feature Cards */}
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                {/* 1. Oral Presentations (Cyan/Light-Blue Background) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate('abstracts')}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate('abstracts')}
                  className="bg-gradient-to-r from-[#F0FAFB] to-[#E2F7F9] border border-[#BDEEF5] rounded-2xl p-4 flex items-center gap-4 hover:shadow-md hover:border-[#087E8B] transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-white text-[#087E8B] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Presentation className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base sm:text-[18.5px] lg:text-[19px] font-extrabold text-[#082746] font-heading group-hover:text-[#087E8B] transition-colors">
                      Oral Presentations
                    </div>
                    <div className="text-[13.5px] sm:text-[15px] lg:text-[15.5px] text-[#52617A] leading-snug mt-1">
                      Hybrid (online and offline) sessions to present original research.
                    </div>
                  </div>
                </div>

                {/* 2. Poster Presentations (Soft Peach/Light-Orange Background) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate('abstracts')}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate('abstracts')}
                  className="bg-gradient-to-r from-[#FFF8F1] to-[#FDEEE0] border border-[#FCDABA] rounded-2xl p-4 flex items-center gap-4 hover:shadow-md hover:border-[#EA580C] transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-white text-[#EA580C] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base sm:text-[18.5px] lg:text-[19px] font-extrabold text-[#082746] font-heading group-hover:text-[#EA580C] transition-colors">
                      Poster Presentations
                    </div>
                    <div className="text-[13.5px] sm:text-[15px] lg:text-[15.5px] text-[#52617A] leading-snug mt-1">
                      In-person poster forum to showcase research findings and innovations.
                    </div>
                  </div>
                </div>

                {/* 3. Plenary & Parallel Sessions (Soft Lavender Background) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate('programme')}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate('programme')}
                  className="bg-gradient-to-r from-[#FAF8FF] to-[#EDE6FE] border border-[#E2D6FD] rounded-2xl p-4 flex items-center gap-4 hover:shadow-md hover:border-[#7554D9] transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-white text-[#7554D9] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base sm:text-[18.5px] lg:text-[19px] font-extrabold text-[#082746] font-heading group-hover:text-[#7554D9] transition-colors">
                      Plenary & Parallel Sessions
                    </div>
                    <div className="text-[13.5px] sm:text-[15px] lg:text-[15.5px] text-[#52617A] leading-snug mt-1">
                      High-impact talks and focused sessions by invited experts.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. CENTERED ACTION BUTTON (PURPLE-TO-CYAN GRADIENT) */}
          <div className="flex justify-center pt-2 pb-0.5">
            <button
              type="button"
              onClick={() => onNavigate('speakers')}
              className="px-9 sm:px-11 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] hover:opacity-95 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2.5 cursor-pointer group"
            >
              <span>View Speakers & Programme</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: ABOUT THE CONFERENCE (VISUAL HERO & THREE PILLARS)
          Exact reproduction of AI-Powered_Drug_Discovery_Conference_fc96ce48.png:
          - Panoramic SRMIST campus aerial photograph spanning the entire top edge
          - Flowing, curved white-to-light-lavender transition between campus image & content
          - Centered "ABOUT THE CONFERENCE" gradient pill with flanking horizontal rules
          - Main heading: "AI-Powered Innovations in Drug Discovery and Development"
            with violet accent and subtle cyan underline under "Drug Discovery"
          - Centered introduction text with bold key participant categories
          - Left: 3D capsule with AI symbol and orbital rings
          - Right: 3D molecular structure with blue and violet spheres
          - Three equal-width conference pillar cards:
            1. Scientific Vision (Laboratory flask, soft violet)
            2. Interdisciplinary Collaboration (Researchers group, soft cyan)
            3. Future Impact (Growth chart, soft peach)
          - Curved lavender transition at bottom with "CONFERENCE CONTENT" label
         ========================================================================= */}
      <section id="about-the-conference" className="snap-section relative w-full bg-white border-b border-[#E2E7F0] overflow-hidden">
        {/* 1. PANORAMIC SRMIST CAMPUS AERIAL PHOTOGRAPH AT TOP EDGE */}
        <div className="relative w-full h-36 sm:h-48 md:h-56 lg:h-64 overflow-hidden shrink-0">
          <img
            src={IMAGES.srmistCampusAerial}
            alt="SRMIST Campus Landscape and Reflective Lake Panorama"
            className="w-full h-full object-cover object-[center_36%] filter saturate-105"
            loading="eager"
          />

          {/* Translucent sky/atmosphere gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/20 pointer-events-none" />

          {/* Flowing, curved white-to-light-lavender transition wave */}
          <div className="absolute -bottom-1 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
            <svg
              viewBox="0 0 1440 90"
              className="w-full h-10 sm:h-14 lg:h-18"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Soft lavender back wave */}
              <path
                d="M0,45 C320,80 540,10 880,55 C1160,90 1340,35 1440,50 L1440,90 L0,90 Z"
                fill="#EDE9FA"
                fillOpacity="0.85"
              />
              {/* White foreground wave */}
              <path
                d="M0,58 C280,24 620,78 960,38 C1240,8 1380,48 1440,34 L1440,90 L0,90 Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
        </div>

        {/* 2. MAIN SECTION CONTENT WITH THEMED BACKGROUND ARTWORK */}
        <div className="relative w-full py-8 sm:py-12 lg:py-16 overflow-hidden">
          {/* Contained Background Layer: Futuristic AI Science Conference Banner */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <img
              src={IMAGES.aboutSectionBg}
              alt=""
              className="w-full h-full object-cover object-center"
            />
            {/* Soft translucent wash ensuring optimal contrast and readability */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-4 sm:space-y-6">
            {/* Centered Section Label with Flanking Rules */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="w-12 sm:w-20 md:w-28 h-[1.5px] bg-gradient-to-r from-transparent via-[#7554D9]/40 to-[#7554D9]/80" />

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-sm">
                <Info className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase font-['Plus_Jakarta_Sans',sans-serif]">
                  ABOUT THE CONFERENCE
                </span>
              </div>

              <div className="w-12 sm:w-20 md:w-28 h-[1.5px] bg-gradient-to-l from-transparent via-[#22C5D9]/40 to-[#22C5D9]/80" />
            </div>

            {/* Main Heading */}
            <div className="text-center space-y-2 max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight leading-[1.18]">
                AI-Powered Innovations in<br />
                <span className="text-[#7554D9] relative inline-block">
                  Drug Discovery
                  <svg
                    className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-2 text-[#22C5D9]"
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,5 Q50,0 100,5"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{' '}
                and Development
              </h2>
            </div>

            {/* Centered Introduction Paragraph */}
            <div className="max-w-3xl mx-auto w-full text-center px-2">
              <p className="text-sm sm:text-base lg:text-[16px] text-[#45536B] leading-relaxed font-['Inter',sans-serif]">
                An international academic and scientific platform bringing together{' '}
                <strong className="font-bold text-[#082746]">
                  researchers, academicians, pharmaceutical scientists, clinicians and industry experts
                </strong>{' '}
                to explore emerging innovations in drug discovery and development. The conference will focus on the integration of artificial intelligence, advanced pharmaceutical technologies and interdisciplinary research to address contemporary challenges in healthcare and therapeutic development.
              </p>
            </div>

            {/* 3. THREE CONFERENCE PILLARS (EQUAL WIDTH PANELS IN A SINGLE HORIZONTAL ROW ON DESKTOP) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 max-w-5xl mx-auto w-full pt-2">
              {/* Panel 1 – Scientific Vision */}
              <div className="bg-[#FAF9FE]/95 backdrop-blur-sm border border-[#E9E4F8] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EDE9FA] flex items-center justify-center shrink-0">
                  <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-[#7554D9]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg lg:text-[18px] font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Scientific Vision
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#45536B] leading-snug font-['Inter',sans-serif]">
                    Advance AI-driven research and emerging technologies in drug discovery and development.
                  </p>
                </div>
              </div>

              {/* Panel 2 – Interdisciplinary Collaboration */}
              <div className="bg-[#F0FAFC]/95 backdrop-blur-sm border border-[#CDEEF5] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#DDF4F8] flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#087E8B]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg lg:text-[18px] font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Interdisciplinary Collaboration
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#45536B] leading-snug font-['Inter',sans-serif]">
                    Bring together academia, industry and clinical experts to encourage knowledge exchange and collaborative research.
                  </p>
                </div>
              </div>

              {/* Panel 3 – Future Impact */}
              <div className="bg-[#FFF9F3]/95 backdrop-blur-sm border border-[#FFE7D3] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FFEAD7] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-[#EA580C]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg lg:text-[18px] font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Future Impact
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#45536B] leading-snug font-['Inter',sans-serif]">
                    Accelerate innovation towards safer, more effective and improved therapeutic solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: SCIENTIFIC TRACKS (UNIFIED SEVEN TRACKS)
          Exact reproduction of Scientific_Tracks__Key_Conference_Themes.png:
          - Full-width light background with subtle lavender/cyan atmospheric glow
          - Centered purple-to-cyan gradient capsule "SCIENTIFIC TRACKS" with Layers icon
          - Main heading: "Explore the Key Themes of the Conference" with purple-to-cyan gradient on "of the Conference"
          - Centered description text
          - Large rounded rectangular landscape cards with individual pastel gradients:
            * Row 1: 4 cards equally sized (01, 02, 03, 04)
            * Row 2: 3 cards equally sized, perfectly centered (05, 06, 07)
          - Prominent two-digit badge at top-left, bold dark navy title, concise description
          - Prominent large 3D scientific illustrations filling the right side of each card
          - Decorative floating molecular structure (upper-left), dual capsules on wave (lower-left),
            large 3D DNA double helix (lower-right), and wave ribbon along bottom
          - Prominent large centered gradient button: "View Detailed Tracks →"
          - Bottom transition to Section 5 (Invited Speakers)
         ========================================================================= */}
      <section
        id="scientific-tracks"
        className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] relative w-full flex flex-col justify-between py-10 sm:py-14 border-b border-[#E2E7F0] overflow-hidden"
      >
        {/* Full-Width Contained Background Artwork: Glowing AI Pharmaceutical Waves */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={IMAGES.scientificTracksBg}
            alt=""
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
          {/* Subtle translucent overlay preserving artwork vibrancy while maintaining optimal text readability */}
          <div className="absolute inset-0 bg-white/15 pointer-events-none" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex-1 flex flex-col justify-center space-y-7 sm:space-y-9 relative z-10">
          {/* 1. SECTION IDENTITY & HEADER */}
          <div className="text-center space-y-3.5 max-w-6xl mx-auto">
            {/* Top Capsule with Layered Icon */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="w-14 sm:w-24 md:w-32 h-[1.5px] bg-gradient-to-r from-transparent to-[#7554D9]/50" />
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-[0_6px_18px_rgba(117,84,217,0.25)]">
                <Layers className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="text-[11px] sm:text-xs font-extrabold tracking-[0.14em] uppercase whitespace-nowrap">
                  SCIENTIFIC TRACKS
                </span>
              </div>
              <div className="w-14 sm:w-24 md:w-32 h-[1.5px] bg-gradient-to-l from-transparent to-[#22C5D9]/60" />
            </div>

            {/* Main Heading with Purple-to-Cyan Gradient Emphasis */}
            <h2 className="text-[28px] sm:text-4xl lg:text-[40px] xl:text-[50px] font-extrabold text-[#082746] font-heading tracking-tight leading-[1.15] lg:whitespace-nowrap">
              Explore the Key Themes{' '}
              <span className="bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] bg-clip-text text-transparent relative inline-block pb-1.5">
                of the Conference
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-[3.5px] rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] opacity-90"
                />
              </span>
            </h2>

            {/* Supporting Text */}
            <p className="text-[15px] sm:text-[17.5px] lg:text-[18.5px] text-[#3B4A62] leading-[1.6] max-w-[780px] mx-auto font-normal pt-0.5">
              The conference will cover seven focused scientific tracks, addressing the integration of AI, emerging technologies and translational research in drug discovery and development.
            </p>
          </div>

          {/* 2. SEVEN SCIENTIFIC TRACK CARDS (ROW 1: 4 CARDS, ROW 2: 3 CENTERED CARDS) */}
          <div className="space-y-5 lg:space-y-6 w-full">
            {/* ROW 1: CARDS 01, 02, 03, 04 (4 EQUAL COLUMNS ON DESKTOP) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 xl:gap-6 w-full">
              {SCIENTIFIC_TRACKS.slice(0, 4).map((track, idx) => {
                const styles = [
                  {
                    bg: 'bg-gradient-to-br from-[#F8F5FF] via-[#F3EEFF] to-[#EAE1FE]',
                    border: 'border-[#DFD2FC]',
                    hoverBorder: 'hover:border-[#7554D9]',
                    badge: 'bg-[#E7DDFD] text-[#6D47D9]',
                  },
                  {
                    bg: 'bg-gradient-to-br from-[#EEFBFC] via-[#E3F7FA] to-[#D4F3F7]',
                    border: 'border-[#BBEBF2]',
                    hoverBorder: 'hover:border-[#087E8B]',
                    badge: 'bg-[#D7F4F8] text-[#087E8B]',
                  },
                  {
                    bg: 'bg-gradient-to-br from-[#FFF8F1] via-[#FEF1E4] to-[#FDE7D2]',
                    border: 'border-[#FAD6B8]',
                    hoverBorder: 'hover:border-[#D95D16]',
                    badge: 'bg-[#FFE9D4] text-[#D95D16]',
                  },
                  {
                    bg: 'bg-gradient-to-br from-[#F1F7FE] via-[#E6F0FC] to-[#D8E8FA]',
                    border: 'border-[#C2DCF8]',
                    hoverBorder: 'hover:border-[#1D6FD8]',
                    badge: 'bg-[#DCEBFD] text-[#1D6FD8]',
                  },
                ][idx];

                return (
                  <div
                    key={track.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate('tracks', track.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigate('tracks', track.id)}
                    className={`w-full h-full ${styles.bg} border ${styles.border} ${styles.hoverBorder} rounded-[24px] px-5 py-5 sm:px-6 sm:py-6 shadow-[0_10px_28px_rgba(117,84,217,0.07),inset_0_1px_0_rgba(255,255,255,0.85)] hover:shadow-[0_16px_36px_rgba(117,84,217,0.16)] transition-all duration-300 flex items-center justify-between gap-2.5 group cursor-pointer hover:-translate-y-1 relative overflow-hidden min-h-[168px] sm:min-h-[180px]`}
                  >
                    {/* Left Content Column */}
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center space-y-3 z-10">
                      <div>
                        <span
                          className={`inline-flex items-center justify-center px-3.5 py-1 rounded-xl text-xs sm:text-[13px] font-bold tabular-nums ${styles.badge}`}
                        >
                          {track.number}
                        </span>
                      </div>

                      <h3 className="text-[16px] sm:text-[17px] xl:text-[18px] font-extrabold text-[#082746] font-heading leading-[1.3] group-hover:text-[#7554D9] transition-colors">
                        {track.title}
                      </h3>
                    </div>

                    {/* Right 3D Scientific Illustration */}
                    <div className="shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 z-10">
                      {track.number === '01' ? (
                        <img
                          src="/images/tracks/pharmaceutics-transparent.png"
                          alt={track.title}
                          className="w-[104px] h-[104px] sm:w-[116px] sm:h-[116px] xl:w-[122px] xl:h-[122px] object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <TrackIllustration
                          type={track.iconType || 'laptop-ai'}
                          className="w-[112px] h-[84px] sm:w-[122px] sm:h-[92px] xl:w-[130px] xl:h-[98px]"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ROW 2: CARDS 05, 06, 07 (3 CENTERED COLUMNS ON DESKTOP, MATCHING ROW 1 CARD WIDTH) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 xl:gap-6 lg:w-[calc(75%-5px)] xl:w-[calc(75%-6px)] mx-auto w-full">
              {SCIENTIFIC_TRACKS.slice(4, 7).map((track, idx) => {
                const styles = [
                  {
                    bg: 'bg-gradient-to-br from-[#EFFBF4] via-[#E3F7EC] to-[#D3F2E0]',
                    border: 'border-[#B8E9CB]',
                    hoverBorder: 'hover:border-[#15803D]',
                    badge: 'bg-[#D8F7E3] text-[#15803D]',
                  },
                  {
                    bg: 'bg-gradient-to-br from-[#F7F2FF] via-[#EFE5FE] to-[#E4D5FE]',
                    border: 'border-[#D5BDFE]',
                    hoverBorder: 'hover:border-[#7E22CE]',
                    badge: 'bg-[#EBDDFF] text-[#7E22CE]',
                  },
                  {
                    bg: 'bg-gradient-to-br from-[#FFF3F6] via-[#FEE8EE] to-[#FDD9E3]',
                    border: 'border-[#FAC0CF]',
                    hoverBorder: 'hover:border-[#BE185D]',
                    badge: 'bg-[#FFE0E8] text-[#BE185D]',
                  },
                ][idx];

                return (
                  <div
                    key={track.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate('tracks', track.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigate('tracks', track.id)}
                    className={`w-full h-full ${styles.bg} border ${styles.border} ${styles.hoverBorder} rounded-[24px] px-5 py-5 sm:px-6 sm:py-6 shadow-[0_10px_28px_rgba(117,84,217,0.07),inset_0_1px_0_rgba(255,255,255,0.85)] hover:shadow-[0_16px_36px_rgba(117,84,217,0.16)] transition-all duration-300 flex items-center justify-between gap-2.5 group cursor-pointer hover:-translate-y-1 relative overflow-hidden min-h-[168px] sm:min-h-[180px]`}
                  >
                    {/* Left Content Column */}
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center space-y-3 z-10">
                      <div>
                        <span
                          className={`inline-flex items-center justify-center px-3.5 py-1 rounded-xl text-xs sm:text-[13px] font-bold tabular-nums ${styles.badge}`}
                        >
                          {track.number}
                        </span>
                      </div>

                      <h3 className="text-[16px] sm:text-[17px] xl:text-[18px] font-extrabold text-[#082746] font-heading leading-[1.3] group-hover:text-[#7554D9] transition-colors">
                        {track.title}
                      </h3>
                    </div>

                    {/* Right 3D Scientific Illustration */}
                    <div className="shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 z-10">
                      <TrackIllustration
                        type={track.iconType || 'laptop-ai'}
                        className="w-[112px] h-[84px] sm:w-[122px] sm:h-[92px] xl:w-[130px] xl:h-[98px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. PROMINENT LARGE CENTRED GRADIENT BUTTON */}
          <div className="flex justify-center pt-2 pb-1">
            <button
              type="button"
              onClick={() => onNavigate('tracks')}
              className="px-9 py-3.5 sm:px-10 sm:py-4 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] hover:opacity-95 rounded-full shadow-[0_10px_25px_rgba(117,84,217,0.28)] hover:shadow-[0_14px_32px_rgba(117,84,217,0.38)] hover:scale-[1.02] transition-all flex items-center gap-2.5 cursor-pointer group whitespace-nowrap shrink-0"
            >
              <span>View Detailed Tracks</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

      </section>

      {/* =========================================================================
          SECTION 5: WHO SHOULD PARTICIPATE? (A PLATFORM FOR A DIVERSE RESEARCH COMMUNITY)
          Exact reproduction of Diverse Pharmaceutical Research Community Conference Banner.png:
          - Eyebrow pill: "OPEN TO THE GLOBAL PHARMACEUTICAL COMMUNITY" flanked by rules
          - Main heading: "Who Should Participate?" with gradient text and flourish
          - Supporting copy: "Connect with researchers, academicians, students and industry professionals shaping the future of pharmaceutical research, drug discovery and development."
          - Five visually distinct audience categories with equal importance:
            1. Undergraduate Students (B.Pharm and other undergraduate students)
            2. Postgraduate Students (M.Pharm and other postgraduate students)
            3. Doctoral Researchers (PhD scholars and research fellows)
            4. Faculty & Academicians (Professors, faculty members and academic researchers)
            5. Industry Professionals & Scientists (Pharmaceutical scientists, R&D professionals and healthcare innovators)
          - Layout: 3 cards in first row, 2 cards centered in second row
          - Atmospheric artwork:
            * Top-left: 3D molecular structure
            * Bottom-left: Dual 3D pharmaceutical capsules on wave
            * Bottom-right: 3D DNA double helix strand with illuminated rungs
          - Viewport-fitting snap section without clipping
          - CTA: "Register to Participate →"
         ========================================================================= */}
      <section className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] relative flex flex-col justify-between py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden bg-gradient-to-b from-[#FAF8FF] via-white to-[#EBF9FD]">
        {/* Soft flowing cyan and violet curved wave ribbons across top and bottom */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
            <path
              d="M-50,70 C320,150 680,15 1060,100 C1280,145 1390,55 1500,85 L1500,0 L-50,0 Z"
              fill="url(#topWaveRibbonParticipate5)"
              opacity="0.5"
            />
            <path
              d="M-50,830 C360,770 710,885 1100,795 C1290,755 1410,835 1500,805 L1500,900 L-50,900 Z"
              fill="url(#bottomWaveRibbonParticipate5)"
              opacity="0.5"
            />
            <defs>
              <linearGradient id="topWaveRibbonParticipate5" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#EDE9FA" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#8B50E8" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="bottomWaveRibbonParticipate5" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#EDE9FA" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#8B50E8" stopOpacity="0.35" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Top-Left 3D Molecular Structure (Matching Reference Screenshot) */}
        <div className="absolute top-2 left-2 sm:left-4 lg:left-6 pointer-events-none opacity-80 hidden md:block z-0">
          <svg width="150" height="150" viewBox="0 0 180 180" fill="none">
            <defs>
              <radialGradient id="nodeBallCyanPart5" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#7DD3FC" />
                <stop offset="100%" stopColor="#0284C7" />
              </radialGradient>
              <radialGradient id="nodeBallVioletPart5" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#7E22CE" />
              </radialGradient>
            </defs>
            <circle cx="35" cy="80" r="12" fill="url(#nodeBallCyanPart5)" filter="drop-shadow(0 3px 6px rgba(2,132,199,0.3))" />
            <circle cx="90" cy="50" r="15" fill="url(#nodeBallVioletPart5)" filter="drop-shadow(0 4px 8px rgba(126,34,206,0.35))" />
            <circle cx="140" cy="85" r="10" fill="url(#nodeBallCyanPart5)" filter="drop-shadow(0 3px 6px rgba(2,132,199,0.3))" />
            <circle cx="80" cy="130" r="13" fill="url(#nodeBallVioletPart5)" filter="drop-shadow(0 4px 8px rgba(126,34,206,0.3))" />
            <circle cx="28" cy="140" r="8" fill="url(#nodeBallCyanPart5)" />
            <line x1="35" y1="80" x2="90" y2="50" stroke="#7DD3FC" strokeWidth="2.5" strokeOpacity="0.75" />
            <line x1="90" y1="50" x2="140" y2="85" stroke="#C084FC" strokeWidth="2.5" strokeOpacity="0.75" />
            <line x1="90" y1="50" x2="80" y2="130" stroke="#818CF8" strokeWidth="2.5" strokeOpacity="0.75" />
            <line x1="35" y1="80" x2="28" y2="140" stroke="#7DD3FC" strokeWidth="2.5" strokeOpacity="0.65" />
            <line x1="80" y1="130" x2="28" y2="140" stroke="#818CF8" strokeWidth="2.5" strokeOpacity="0.65" />
          </svg>
        </div>

        {/* Lower-Left Dual 3D Pharmaceutical Capsules on Wave */}
        <div className="absolute -bottom-4 left-2 sm:left-4 lg:left-6 pointer-events-none opacity-90 hidden md:block z-0">
          <svg width="160" height="130" viewBox="0 0 170 140" fill="none">
            <defs>
              <linearGradient id="pillCyanWavePart5" x1="0" y1="0" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67E8F9" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id="pillPurpleWavePart5" x1="0" y1="0" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E9D5FF" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#6B21A8" />
              </linearGradient>
            </defs>
            <ellipse cx="85" cy="118" rx="65" ry="12" fill="#7554D9" fillOpacity="0.18" filter="blur(6px)" />
            {/* Cyan/White Pill */}
            <g transform="translate(52, 72) rotate(-38)">
              <rect x="-14" y="-32" width="28" height="64" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
              <path d="M-14 0 L14 0 L14 -18 C14 -25.7 7.7 -32 0 -32 C-7.7 -32 -14 -25.7 -14 -18 Z" fill="url(#pillCyanWavePart5)" />
              <path d="M-9 -24 C-9 -8 -9 12 -9 24" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
            </g>
            {/* Purple/White Pill */}
            <g transform="translate(108, 88) rotate(-22)">
              <rect x="-14" y="-32" width="28" height="64" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
              <path d="M-14 0 L14 0 L14 18 C14 25.7 7.7 32 0 32 C-7.7 32 -14 25.7 -14 18 Z" fill="url(#pillPurpleWavePart5)" />
              <path d="M-9 -24 C-9 -8 -9 12 -9 24" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
            </g>
          </svg>
        </div>

        {/* Lower-Right 3D DNA Double Helix Strand (Matching Reference Screenshot) */}
        <div className="absolute -bottom-6 -right-4 w-48 sm:w-56 md:w-64 lg:w-72 h-48 sm:h-56 md:h-64 lg:h-72 pointer-events-none opacity-85 hidden md:block z-0">
          <svg viewBox="0 0 240 240" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="dnaStrand1_5" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22C5D9" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
              <linearGradient id="dnaStrand2_5" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B50E8" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <radialGradient id="dnaNodeGlow5" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </radialGradient>
              <radialGradient id="dnaNodePurple5" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#7C3AED" />
              </radialGradient>
            </defs>
            {/* Helical Rungs */}
            {[
              { x1: 50, y1: 210, x2: 90, y2: 195, c1: '#38BDF8', c2: '#A855F7' },
              { x1: 75, y1: 180, x2: 115, y2: 165, c1: '#818CF8', c2: '#38BDF8' },
              { x1: 100, y1: 150, x2: 140, y2: 135, c1: '#A855F7', c2: '#22C5D9' },
              { x1: 125, y1: 120, x2: 165, y2: 105, c1: '#22C5D9', c2: '#8B50E8' },
              { x1: 150, y1: 90, x2: 190, y2: 75, c1: '#38BDF8', c2: '#A855F7' },
              { x1: 175, y1: 60, x2: 215, y2: 45, c1: '#818CF8', c2: '#22C5D9' },
            ].map((rung, i) => (
              <g key={i}>
                <line
                  x1={rung.x1}
                  y1={rung.y1}
                  x2={rung.x2}
                  y2={rung.y2}
                  stroke={rung.c1}
                  strokeWidth="2.5"
                  strokeOpacity="0.75"
                />
                <circle cx={rung.x1} cy={rung.y1} r="4.5" fill="url(#dnaNodeGlow5)" />
                <circle cx={rung.x2} cy={rung.y2} r="4.5" fill="url(#dnaNodePurple5)" />
              </g>
            ))}
            {/* Strand 1 (Sine Wave) */}
            <path
              d="M30,225 C60,205 70,170 100,155 C130,140 140,105 170,90 C200,75 210,40 235,25"
              stroke="url(#dnaStrand1_5)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            {/* Strand 2 (Opposing Sine Wave) */}
            <path
              d="M70,230 C90,195 105,175 130,145 C155,115 175,95 200,65 C215,45 225,35 240,15"
              stroke="url(#dnaStrand2_5)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Main Foreground Content */}
        <div className="max-w-7xl mx-auto w-full relative z-10 flex-1 flex flex-col justify-center space-y-4 sm:space-y-5">
          {/* 1. SECTION HEADING & IDENTITY */}
          <div className="text-center space-y-2 max-w-4xl mx-auto">
            {/* Flanked Pill Badge: OPEN TO THE GLOBAL PHARMACEUTICAL COMMUNITY */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#7554D9]/40" />
              <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-sm">
                <Users className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase">
                  OPEN TO THE GLOBAL PHARMACEUTICAL COMMUNITY
                </span>
              </div>
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#22C5D9]/50" />
            </div>

            {/* Main Heading: Who Should Participate? */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-black text-[#082746] font-heading tracking-tight leading-[1.2]">
              Who Should{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] bg-clip-text text-transparent">
                  Participate?
                </span>
                <svg
                  className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-2 text-[#22C5D9]"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,5 Q50,0 100,5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Supporting Text */}
            <p className="text-sm sm:text-base text-[#45536B] leading-relaxed max-w-3xl mx-auto font-normal">
              Connect with researchers, academicians, students and industry professionals shaping the future of pharmaceutical research, drug discovery and development.
            </p>
          </div>

          {/* 2. FIVE AUDIENCE CARDS (BALANCED 3 IN FIRST ROW, 2 CENTERED IN SECOND ROW) */}
          <div className="space-y-3.5 sm:space-y-4 w-full">
            {/* ROW 1: THREE CARDS (Undergraduate Students, Postgraduate Students, Doctoral Researchers) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5 w-full">
              {/* Card 1: Undergraduate Students */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm flex items-center gap-3.5 sm:gap-4">
                {/* 3D Graduation Cap on Books Illustration */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(117,84,217,0.22)]" fill="none">
                    <defs>
                      <linearGradient id="mortarGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="50%" stopColor="#5B21B6" />
                        <stop offset="100%" stopColor="#3B0764" />
                      </linearGradient>
                      <linearGradient id="bookCoverBlue5" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0284C7" />
                        <stop offset="100%" stopColor="#38BDF8" />
                      </linearGradient>
                      <linearGradient id="bookCoverPurple5" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6D28D9" />
                        <stop offset="100%" stopColor="#A855F7" />
                      </linearGradient>
                      <linearGradient id="goldTassel5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FCD34D" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                    </defs>
                    <ellipse cx="50" cy="88" rx="34" ry="7" fill="#64748B" fillOpacity="0.18" />
                    <rect x="22" y="72" width="56" height="11" rx="2.5" fill="url(#bookCoverBlue5)" />
                    <rect x="25" y="74" width="50" height="7" rx="1.5" fill="#FFFFFF" />
                    <line x1="26" y1="76" x2="74" y2="76" stroke="#E2E8F0" strokeWidth="0.8" />
                    <rect x="26" y="61" width="48" height="10" rx="2.5" fill="url(#bookCoverPurple5)" />
                    <rect x="29" y="63" width="42" height="6" rx="1.5" fill="#F8FAFC" />
                    <path d="M36,46 Q50,56 64,46 L64,53 Q50,63 36,53 Z" fill="#2E1065" />
                    <path d="M50,22 L86,36 L50,50 L14,36 Z" fill="url(#mortarGrad5)" stroke="#C084FC" strokeWidth="1" />
                    <path d="M14,36 L50,50 L86,36" stroke="#DDD6FE" strokeWidth="1.2" fill="none" opacity="0.6" />
                    <circle cx="50" cy="36" r="3.5" fill="url(#goldTassel5)" />
                    <path d="M50,36 Q68,40 76,50" stroke="#F59E0B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                    <circle cx="76" cy="53" r="3" fill="url(#goldTassel5)" />
                    <path d="M74,54 L72,66 L80,66 L78,54 Z" fill="url(#goldTassel5)" />
                  </svg>
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg lg:text-[19px] font-extrabold text-[#082746] font-heading leading-tight">
                    Undergraduate Students
                  </h3>
                  <div className="text-xs sm:text-[13.5px] font-bold text-[#7554D9] mt-0.5">
                    B.Pharm and other relevant undergraduate students
                  </div>
                </div>
              </div>

              {/* Card 2: Postgraduate Students */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm flex items-center gap-3.5 sm:gap-4">
                {/* 3D Modern Research Microscope & Test Tubes Illustration */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(2,132,199,0.22)]" fill="none">
                    <defs>
                      <linearGradient id="scopeCyanGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="50%" stopColor="#0284C7" />
                        <stop offset="100%" stopColor="#075985" />
                      </linearGradient>
                      <linearGradient id="chromeTube5" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#E2E8F0" />
                        <stop offset="50%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#94A3B8" />
                      </linearGradient>
                    </defs>
                    <ellipse cx="50" cy="88" rx="34" ry="7" fill="#64748B" fillOpacity="0.18" />
                    <path d="M22,86 C22,78 30,76 44,76 L44,86 Z" fill="url(#scopeCyanGrad5)" />
                    <rect x="22" y="84" width="36" height="4" rx="2" fill="#0C4A6E" />
                    <path d="M38,76 C38,50 48,34 60,34" stroke="url(#scopeCyanGrad5)" strokeWidth="7" strokeLinecap="round" fill="none" />
                    <g transform="translate(56, 32) rotate(-35)">
                      <rect x="-5" y="-18" width="10" height="22" rx="2" fill="url(#chromeTube5)" stroke="#64748B" strokeWidth="0.6" />
                      <ellipse cx="0" cy="-18" rx="6" ry="3" fill="#0284C7" />
                      <circle cx="0" cy="6" r="6" fill="#0369A1" />
                      <rect x="-3" y="10" width="6" height="12" rx="1.5" fill="url(#chromeTube5)" />
                    </g>
                    <rect x="30" y="58" width="22" height="4" rx="1.5" fill="#0F172A" />
                    <ellipse cx="41" cy="70" rx="4" ry="2" fill="#E2E8F0" />
                    <rect x="64" y="68" width="24" height="18" rx="2" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="0.8" />
                    <rect x="67" y="52" width="5" height="26" rx="2.5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.6" />
                    <rect x="67.5" y="62" width="4" height="15.5" rx="2" fill="#A855F7" />
                    <rect x="73.5" y="48" width="5" height="30" rx="2.5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.6" />
                    <rect x="74" y="56" width="4" height="21.5" rx="2" fill="#EC4899" />
                    <rect x="80" y="54" width="5" height="24" rx="2.5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.6" />
                    <rect x="80.5" y="64" width="4" height="13.5" rx="2" fill="#06B6D4" />
                  </svg>
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg lg:text-[19px] font-extrabold text-[#082746] font-heading leading-tight">
                    Postgraduate Students
                  </h3>
                  <div className="text-xs sm:text-[13.5px] font-bold text-[#0284C7] mt-0.5">
                    M.Pharm and other relevant postgraduate students
                  </div>
                </div>
              </div>

              {/* Card 3: Doctoral Researchers */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm flex items-center gap-3.5 sm:gap-4">
                {/* 3D Erlenmeyer Flask & Molecular Atom Illustration */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(117,84,217,0.22)]" fill="none">
                    <defs>
                      <linearGradient id="flaskPurpleLiquid5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#C084FC" />
                        <stop offset="50%" stopColor="#9333EA" />
                        <stop offset="100%" stopColor="#6B21A8" />
                      </linearGradient>
                      <radialGradient id="atomGlowPart5" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="40%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#0284C7" />
                      </radialGradient>
                    </defs>
                    <ellipse cx="46" cy="88" rx="28" ry="6" fill="#64748B" fillOpacity="0.18" />
                    <path
                      d="M40,24 L52,24 L52,38 L68,76 C70,81 66,85 60,85 L32,85 C26,85 22,81 24,76 L40,38 Z"
                      fill="#FFFFFF"
                      fillOpacity="0.35"
                      stroke="#818CF8"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M26,74 L33,58 C37,56 42,60 46,58 C50,56 55,60 59,58 L66,74 C68,79 64,83 58,83 L34,83 C28,83 24,79 26,74 Z"
                      fill="url(#flaskPurpleLiquid5)"
                    />
                    <circle cx="42" cy="68" r="2.2" fill="#FFFFFF" fillOpacity="0.8" />
                    <circle cx="50" cy="62" r="1.8" fill="#F3E8FF" fillOpacity="0.9" />
                    <circle cx="36" cy="74" r="1.5" fill="#FFFFFF" fillOpacity="0.7" />
                    <circle cx="46" cy="48" r="2" fill="#A855F7" fillOpacity="0.6" />
                    <circle cx="44" cy="32" r="1.5" fill="#38BDF8" fillOpacity="0.7" />
                    <rect x="38" y="21" width="16" height="4" rx="2" fill="#818CF8" />
                    <g transform="translate(74, 52)">
                      <ellipse cx="0" cy="0" rx="14" ry="6" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.8" transform="rotate(30)" />
                      <ellipse cx="0" cy="0" rx="14" ry="6" stroke="#C084FC" strokeWidth="1.2" strokeOpacity="0.8" transform="rotate(-30)" />
                      <circle cx="0" cy="0" r="5" fill="url(#atomGlowPart5)" filter="drop-shadow(0 2px 4px rgba(2,132,199,0.4))" />
                      <circle cx="10" cy="-7" r="2.2" fill="#A855F7" />
                      <circle cx="-11" cy="5" r="2.2" fill="#38BDF8" />
                    </g>
                  </svg>
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg lg:text-[19px] font-extrabold text-[#082746] font-heading leading-tight">
                    Doctoral Researchers
                  </h3>
                  <div className="text-xs sm:text-[13.5px] font-bold text-[#7554D9] mt-0.5">
                    PhD scholars and research fellows
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: TWO CARDS CENTERED (Faculty & Academicians, Industry Professionals & Scientists) */}
            <div className="flex flex-col md:flex-row justify-center gap-3.5 sm:gap-4 lg:gap-5 w-full max-w-4xl mx-auto">
              {/* Card 4: Faculty & Academicians */}
              <div className="w-full md:w-[calc(50%-10px)] bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm flex items-center gap-3.5 sm:gap-4">
                {/* 3D Open Manuscript Book & Laurel Illustration */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(234,88,12,0.2)]" fill="none">
                    <defs>
                      <linearGradient id="bookSpineAmber5" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EA580C" />
                        <stop offset="100%" stopColor="#F97316" />
                      </linearGradient>
                      <linearGradient id="pageFannedGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="80%" stopColor="#FFF7ED" />
                        <stop offset="100%" stopColor="#FFEDD5" />
                      </linearGradient>
                    </defs>
                    <ellipse cx="50" cy="85" rx="34" ry="7" fill="#64748B" fillOpacity="0.18" />
                    <path d="M12,68 Q30,76 50,72 Q70,76 88,68 L86,76 Q68,84 50,80 Q32,84 14,76 Z" fill="url(#bookSpineAmber5)" />
                    <path d="M14,64 Q32,72 50,68 L50,42 Q32,46 14,38 Z" fill="url(#pageFannedGrad5)" stroke="#FED7AA" strokeWidth="0.8" />
                    <path d="M86,64 Q68,72 50,68 L50,42 Q68,46 86,38 Z" fill="url(#pageFannedGrad5)" stroke="#FED7AA" strokeWidth="0.8" />
                    {[46, 52, 58].map((y, i) => (
                      <g key={i}>
                        <line x1="20" y1={y} x2="44" y2={y + 4} stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
                        <line x1="56" y1={y + 4} x2="80" y2={y} stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
                      </g>
                    ))}
                    <path d="M50,68 C48,74 44,79 46,86 L50,83 L54,86 C52,79 51,74 50,68 Z" fill="#2563EB" />
                    <path d="M26,30 Q36,22 46,26" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M74,30 Q64,22 54,26" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <circle cx="34" cy="24" r="2.5" fill="#FCD34D" />
                    <circle cx="42" cy="24" r="2.5" fill="#FCD34D" />
                    <circle cx="58" cy="24" r="2.5" fill="#FCD34D" />
                    <circle cx="66" cy="24" r="2.5" fill="#FCD34D" />
                  </svg>
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg lg:text-[19px] font-extrabold text-[#082746] font-heading leading-tight">
                    Faculty & Academicians
                  </h3>
                  <div className="text-xs sm:text-[13.5px] font-bold text-[#EA580C] mt-0.5">
                    Professors, faculty members and academic researchers
                  </div>
                </div>
              </div>

              {/* Card 5: Industry Professionals & Scientists */}
              <div className="w-full md:w-[calc(50%-10px)] bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm flex items-center gap-3.5 sm:gap-4">
                {/* 3D Modern Biopharma Facility & 3D Medicine Capsule Illustration */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(2,132,199,0.22)]" fill="none">
                    <defs>
                      <linearGradient id="facilityCyan5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="50%" stopColor="#0284C7" />
                        <stop offset="100%" stopColor="#0369A1" />
                      </linearGradient>
                      <linearGradient id="pillGradFront5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#67E8F9" />
                        <stop offset="50%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#0284C7" />
                      </linearGradient>
                    </defs>
                    <ellipse cx="50" cy="86" rx="34" ry="7" fill="#64748B" fillOpacity="0.18" />
                    <rect x="22" y="44" width="36" height="34" rx="3" fill="url(#facilityCyan5)" />
                    <rect x="48" y="32" width="24" height="46" rx="3" fill="#0C4A6E" />
                    <rect x="54" y="24" width="10" height="10" rx="1.5" fill="#0284C7" />
                    {[48, 56, 64].map((y, rIdx) => (
                      <g key={rIdx}>
                        <rect x="26" y={y} width="5" height="5" rx="1" fill="#BAE6FD" />
                        <rect x="34" y={y} width="5" height="5" rx="1" fill="#BAE6FD" />
                        <rect x="42" y={y} width="5" height="5" rx="1" fill="#BAE6FD" />
                        <rect x="52" y={y - 8} width="5" height="5" rx="1" fill="#38BDF8" />
                        <rect x="60" y={y - 8} width="5" height="5" rx="1" fill="#38BDF8" />
                      </g>
                    ))}
                    <g transform="translate(62, 70) rotate(-28)">
                      <ellipse cx="0" cy="14" rx="12" ry="4" fill="#0F172A" fillOpacity="0.25" />
                      <rect x="-9" y="-20" width="18" height="40" rx="9" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
                      <path d="M-9,0 L9,0 L9,-11 C9,-16 5,-20 0,-20 C-5,-20 -9,-16 -9,-11 Z" fill="url(#pillGradFront5)" />
                      <path d="M-6,-15 C-6,-5 -6,8 -6,14" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
                    </g>
                  </svg>
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg lg:text-[19px] font-extrabold text-[#082746] font-heading leading-tight">
                    Industry Professionals & Scientists
                  </h3>
                  <div className="text-xs sm:text-[13.5px] font-bold text-[#0284C7] mt-0.5">
                    Pharmaceutical scientists, R&D professionals and healthcare innovators
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. CENTERED REGISTRATION ACTION BUTTON (PURPLE-TO-CYAN GRADIENT) */}
          <div className="flex justify-center pt-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => onNavigate('registration')}
              className="px-8 sm:px-10 py-3.5 text-sm sm:text-[15.5px] font-bold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] hover:opacity-95 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer group"
            >
              <span>Register to Participate</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5.5: RESEARCH PRESENTATION FORMATS
          Exact reproduction of Showcase_Your_Research_Formats_be69822a.png:
          - Background: Soft lavender/cyan gradient with subtle atmospheric wave accents,
            molecular structure (bottom left) and dual pharmaceutical capsules (bottom right)
          - Header:
            - Centered pill: "RESEARCH PRESENTATION FORMATS" with FileText icon
            - Main heading: "Showcase Your Research" with cyan curved underline flourish
            - Subtitle: "Share your scientific discoveries through our three presentation formats at the international conference."
          - Three Presentation Cards (horizontal row on desktop):
            1. E-Poster Presentation (ONLINE badge, laptop image, description, Download Template, Download Guidelines)
            2. Oral Presentation (OFFLINE badge, podium speaker image, description, Download Template, Download Guidelines)
            3. Poster Presentation (ONLINE badge, stand poster image, description, Download Template, Download Guidelines)
          - Abstract Submission Process Strip:
            - Left: Abstract Submission Process with clipboard icon
            - Steps 01 to 04: Prepare, Choose, Submit, Track
          - Centered CTA Button: "Go to Abstract Submission →"
         ========================================================================= */}
      <section
        id="research-presentation-formats"
        className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] relative flex flex-col justify-between py-8 sm:py-10 lg:py-12 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden bg-gradient-to-b from-[#FAF8FF] via-white to-[#F0F9FF]"
      >
        {/* Soft flowing atmospheric waves and scientific accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <svg className="w-full h-full opacity-60" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
            <path
              d="M-100 80 C240 20, 520 140, 880 70 C1240 0, 1400 90, 1600 60 L1600 0 L-100 0 Z"
              fill="url(#pres-top-wave)"
            />
            <path
              d="M-100 820 C280 750, 600 860, 960 790 C1320 720, 1480 840, 1600 810 L1600 900 L-100 900 Z"
              fill="url(#pres-bottom-wave)"
            />
            <defs>
              <linearGradient id="pres-top-wave" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#DDD6FE" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#A5F3FC" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="pres-bottom-wave" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#BAE6FD" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.35" />
              </linearGradient>
            </defs>
          </svg>

          {/* Bottom-left molecular accent graphic */}
          <div className="absolute -bottom-4 -left-6 w-36 sm:w-44 h-36 sm:h-44 opacity-75">
            <AboutMoleculeIllustration className="w-full h-full drop-shadow-sm" />
          </div>

          {/* Bottom-right dual capsules accent graphic */}
          <div className="absolute -bottom-3 -right-4 w-32 sm:w-40 h-28 sm:h-36 opacity-85">
            <AboutCapsuleIllustration className="w-full h-full drop-shadow-md" />
          </div>
        </div>

        {/* Foreground Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col justify-between h-full my-auto">
          {/* 1. Header Area */}
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Badge with flanking lines */}
            <div className="flex items-center justify-center gap-3 mb-2.5">
              <span className="w-8 sm:w-14 h-px bg-gradient-to-r from-transparent to-[#818CF8]" />
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#06B6D4] text-white text-[10.5px] sm:text-xs font-bold tracking-wider uppercase shadow-sm">
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>RESEARCH PRESENTATION FORMATS</span>
              </div>
              <span className="w-8 sm:w-14 h-px bg-gradient-to-l from-transparent to-[#06B6D4]" />
            </div>

            {/* Main Heading */}
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl lg:text-[40px] font-extrabold text-[#082746] tracking-tight leading-tight">
              Showcase Your{' '}
              <span className="relative inline-block bg-gradient-to-r from-[#6366F1] to-[#06B6D4] bg-clip-text text-transparent">
                Research
                <svg
                  className="absolute -bottom-1.5 left-0 w-full overflow-visible"
                  height="7"
                  viewBox="0 0 160 7"
                  fill="none"
                >
                  <path
                    d="M2 5C45 1.5 115 1.5 158 5"
                    stroke="#22D3EE"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Subtitle */}
            <p className="mt-2 text-xs sm:text-sm lg:text-[14.5px] text-[#4A5568] leading-relaxed max-w-2xl mx-auto font-['Inter',sans-serif]">
              Share your scientific discoveries through our three presentation formats at the international conference.
            </p>
          </div>

          {/* 2. Three Presentation Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mt-6 lg:mt-8">
            {PRESENTATION_CARDS_DATA.map((card) => {
              const imageSrc =
                card.imageKey === 'eposterPresentation'
                  ? IMAGES.eposterPresentation
                  : card.imageKey === 'oralPresentation'
                  ? IMAGES.oralPresentation
                  : IMAGES.posterPresentation;

              return (
                <div
                  key={card.id}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Image Preview */}
                    <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[16/9.5] bg-slate-100 mb-3.5 shadow-xs">
                      <img
                        src={imageSrc}
                        alt={card.imageAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>

                    {/* Card Title & Status Badge Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center shrink-0 text-[#6366F1]">
                          {card.id === 'eposter' ? (
                            <Monitor className="w-4 h-4 text-[#6366F1]" />
                          ) : card.id === 'oral' ? (
                            <Mic className="w-4 h-4 text-[#6366F1]" />
                          ) : (
                            <Presentation className="w-4 h-4 text-[#6366F1]" />
                          )}
                        </div>
                        <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm sm:text-base text-[#082746] tracking-tight truncate">
                          {card.title}
                        </h3>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider shrink-0 shadow-xs ${card.badgeColorClass}`}
                      >
                        {card.statusBadge}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="font-['Inter',sans-serif] text-xs sm:text-[13px] text-[#4A5568] leading-relaxed mt-2.5 min-h-[36px]">
                      {card.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 mt-4 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDocumentDownload(card.templateDocId)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-indigo-50/50 hover:border-[#818CF8] text-[#1E293B] text-xs sm:text-[13px] font-semibold flex items-center justify-between transition-all duration-200 cursor-pointer shadow-xs group/btn"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#6366F1]" />
                        <span>Download Template</span>
                      </span>
                      <Download className="w-3.5 h-3.5 text-[#6366F1] group-hover/btn:translate-y-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDocumentDownload(card.guidelinesDocId)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-indigo-50/50 hover:border-[#818CF8] text-[#1E293B] text-xs sm:text-[13px] font-semibold flex items-center justify-between transition-all duration-200 cursor-pointer shadow-xs group/btn"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#6366F1]" />
                        <span>Download Guidelines</span>
                      </span>
                      <Download className="w-3.5 h-3.5 text-[#6366F1] group-hover/btn:translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Abstract Submission Process Strip */}
          <div className="mt-6 lg:mt-7 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 lg:p-6 flex flex-col lg:flex-row items-center justify-between gap-5 lg:gap-6">
            {/* Left Header */}
            <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6366F1] shrink-0">
                <ClipboardList className="w-5 h-5 text-[#6366F1]" />
              </div>
              <div>
                <div className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm sm:text-base text-[#082746] leading-snug">
                  Abstract<br className="hidden sm:inline" /> Submission Process
                </div>
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="hidden lg:block w-px h-12 bg-[#E2E8F0] shrink-0" />

            {/* Four Steps Horizontal Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 flex-1 w-full">
              {SUBMISSION_STEPS.map((step, idx) => {
                const badgeColor =
                  step.number === '01'
                    ? 'bg-[#7C3AED]'
                    : step.number === '02'
                    ? 'bg-[#06B6D4]'
                    : step.number === '03'
                    ? 'bg-[#6366F1]'
                    : 'bg-[#0D9488]';

                return (
                  <div key={step.number} className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-full ${badgeColor} text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-['Inter',sans-serif]`}
                      >
                        {step.number}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xs sm:text-[13px] text-[#082746] leading-tight">
                          {step.title}
                        </h4>
                        <p className="font-['Inter',sans-serif] text-[11px] sm:text-xs text-[#64748B] leading-tight mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {idx < SUBMISSION_STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0 hidden xl:block ml-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Centered Action Button */}
          <div className="flex justify-center pt-5 sm:pt-6 pb-1">
            <button
              type="button"
              onClick={() => onNavigate('abstracts')}
              className="px-8 sm:px-10 py-3.5 text-sm sm:text-[15.5px] font-bold text-white bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#06B6D4] hover:opacity-95 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer group"
            >
              <span>Go to Abstract Submission</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: FEATURED EVENT — PHARMAQUEST: DRUG DISCOVERY HACKATHON 2027
          Exact reproduction of PharmaQuest_2027_Hackathon_Hero_a9ba57ab.png (Mockup 1):
          - Light atmospheric background with top and bottom flowing wave ribbons
          - Event date badge: "16 February 2027 (Morning)" flanked by rules
          - Main heading: "PharmaQuest: Drug Discovery Hackathon 2027" with cyan flourish
          - Tagline: "Think. Collaborate. Solve. Innovate."
          - Short description: "PharmaQuest is an interactive, multidisciplinary problem-solving competition..."
          - Three highlight cards: Eligibility, Team Size, Challenge
          - Left 3D artwork: Capsule lying down with molecular cluster
          - Right 3D artwork: Erlenmeyer laboratory flask with molecular rings and tablets
          - Two CTA buttons: "Learn More →" and "Register for Conference & Hackathon →"
         ========================================================================= */}
      <section
        id="pharmaquest"
        className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] relative flex flex-col justify-between py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden"
      >
        {/* Full-Width Contained Background Artwork: Pastel Pharmaceutical Conference Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={IMAGES.pharmaQuestBg}
            alt=""
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
          {/* Subtle translucent wash preserving artwork vibrancy while maintaining optimal text legibility */}
          <div className="absolute inset-0 bg-white/10 sm:bg-white/5 pointer-events-none" />
        </div>

        {/* Foreground Content Stack */}
        <div className="max-w-5xl mx-auto w-full relative z-10 flex-1 flex flex-col justify-center space-y-5 sm:space-y-6">
          {/* 1. Event Date Badge (Flanked Gradient Pill) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#7554D9]/40" />
            <div className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-sm">
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-xs sm:text-sm font-black tracking-wide">
                16 February 2027 (Morning)
              </span>
            </div>
            <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#22C5D9]/50" />
          </div>

          {/* 2. Main Heading: PharmaQuest: Drug Discovery Hackathon 2027 */}
          <div className="text-center space-y-3 max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black font-heading tracking-tight leading-[1.15] text-[#082746]">
              PharmaQuest:{' '}
              <span className="text-[#6D28D9]">Drug Discovery</span>
              <br />
              Hackathon{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#0284C7] to-[#06B6D4] bg-clip-text text-transparent">
                  2027
                </span>
                <svg
                  className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-2.5 text-[#06B6D4]"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,5 Q50,0 100,5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Tagline */}
            <p className="text-base sm:text-lg md:text-xl font-bold text-[#7554D9] italic tracking-wide">
              Think. Collaborate. Solve. Innovate.
            </p>

            {/* Short Description */}
            <p className="text-sm sm:text-base text-[#45536B] leading-relaxed max-w-2xl mx-auto">
              PharmaQuest is an interactive, multidisciplinary problem-solving competition organised as part of the international conference. Students work in teams to solve on-the-spot pharmaceutical research and drug-development challenges.
            </p>
          </div>

          {/* 3. Three Highlight Cards (Exact Layout & Visuals of Mockup 1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full pt-1">
            {/* Card 1: Eligibility */}
            <div className="bg-gradient-to-r from-[#FAF8FF] to-[#F3EEFF] border border-[#DDD6FE] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#7C3AED]/40 hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-[#082746] font-heading">
                  Eligibility:
                </div>
                <div className="text-sm sm:text-[14.5px] text-[#52617A] leading-snug mt-0.5">
                  UG, PG, PhD and allied life-science students.
                </div>
              </div>
            </div>

            {/* Card 2: Team Size */}
            <div className="bg-gradient-to-r from-[#F0FAFB] to-[#E2F7F9] border border-[#BDEEF5] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#0D9488]/40 hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-[#082746] font-heading">
                  Team Size:
                </div>
                <div className="text-sm sm:text-[14.5px] text-[#52617A] leading-snug mt-0.5">
                  4–5 participants.
                </div>
              </div>
            </div>

            {/* Card 3: Challenge */}
            <div className="bg-gradient-to-r from-[#FFF8F1] to-[#FDEEE0] border border-[#FCDABA] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#EA580C]/40 hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center shrink-0 shadow-2xs">
                <Target className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-[#082746] font-heading">
                  Challenge:
                </div>
                <div className="text-sm sm:text-[14.5px] text-[#52617A] leading-snug mt-0.5">
                  Multidisciplinary, on-the-spot problem solving.
                </div>
              </div>
            </div>
          </div>

          {/* 4. Two CTA Buttons (Learn More & Register) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5 pt-2 pb-1">
            <button
              type="button"
              onClick={() => setPharmaQuestModalOpen(true)}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 rounded-full text-sm sm:text-[15.5px] font-extrabold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Learn More</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('registration')}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 rounded-full text-sm sm:text-[15.5px] font-extrabold text-[#082746] bg-white border border-[#CBD5E1] hover:border-[#7554D9] hover:text-[#7554D9] shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Register for Conference & Hackathon</span>
              <ArrowRight className="w-4 h-4 text-[#7554D9]" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6.5: IMPORTANT DATES & DEADLINES (TIMELINE & CONFERENCE DATES)
          Exact reproduction of Conference_Dates___Deadlines_Timeline_51f03d81.png:
          - Centered gradient badge: "IMPORTANT DATES & DEADLINES" with Calendar icon & flanking rules
          - Main heading: "Important Dates & Deadlines"
          - Subtitle: "Plan your participation and stay updated with key timelines for the conference."
          - Four deadline cards in a single horizontal row on desktop:
            1. Abstract Submission Deadline (31 December 2026) - Blue accent, FileText icon
            2. Registration Deadline (16 January 2027) - Lavender/Violet accent, UserCheck icon
            3. Full Paper Submission (01 February 2027) - Cyan accent, ClipboardCheck icon
            4. Acceptance Notification (02 February 2027) - Soft peach accent, Bell icon
          - Prominent horizontal conference dates banner: "CONFERENCE DATES | 15–16 February 2027"
          - Five-step chronological timeline strip with connecting gradient line & circular nodes
          - Left 3D decorative calendar & clock illustration, subtle molecular & scientific motifs
         ========================================================================= */}
      <section
        id="important-dates"
        className="snap-section relative w-full py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden"
      >
        {/* Full-Width Contained Background Artwork: Futuristic Biotech Dates and Deadlines */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={IMAGES.importantDatesBg}
            alt=""
            className="w-full h-full object-cover object-[left_center] md:object-center"
            loading="lazy"
          />
          {/* Subtle translucent wash ensuring contrast while keeping artwork vibrant */}
          <div className="absolute inset-0 bg-white/20 sm:bg-white/10 md:bg-white/5 pointer-events-none" />
        </div>

        {/* ===================================================================
            MAIN FOREGROUND CONTENT CONTAINER
           =================================================================== */}
        <div className="max-w-7xl mx-auto w-full relative z-10 space-y-6 sm:space-y-8 lg:space-y-10">
          {/* 1. SECTION HEADING & BADGE */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            {/* Small gradient badge with flanking horizontal lines */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#7554D9]/40" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase font-['Plus_Jakarta_Sans',sans-serif]">
                  IMPORTANT DATES & DEADLINES
                </span>
              </div>
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#22C5D9]/50" />
            </div>

            {/* Main heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight leading-[1.18]">
              Important Dates &{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] bg-clip-text text-transparent">
                  Deadlines
                </span>
                <svg
                  className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-2 text-[#22C5D9]"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,5 Q50,0 100,5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-[16.5px] text-[#45536B] leading-relaxed max-w-2xl mx-auto font-['Inter',sans-serif]">
              Plan your participation and stay updated with key timelines for the conference.
            </p>
          </div>

          {/* 2. DEADLINE CARDS (POSITIONED IN CENTRAL & RIGHT PORTIONS ON DESKTOP TO KEEP 3D CALENDAR FULLY VISIBLE) */}
          <div className="xl:pl-56 2xl:pl-64">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4 lg:gap-4 xl:gap-5">
              {/* Card 1 – Abstract Submission Deadline (Blue accent) */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#BAE6FD] hover:border-[#0284C7]/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-start gap-3.5 group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-xs font-bold text-[#45536B] leading-tight font-['Inter',sans-serif]">
                    Abstract Submission Deadline
                  </div>
                  <div className="text-base sm:text-lg lg:text-[18px] xl:text-[19px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight mt-0.5 leading-snug">
                    31 December 2026
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#52617A] leading-tight mt-1 font-['Inter',sans-serif]">
                    Last date for abstract submission.
                  </div>
                </div>
              </div>

              {/* Card 2 – Registration Deadline (Lavender / Violet accent) */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#E9D5FF] hover:border-[#7554D9]/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-start gap-3.5 group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#F3E8FF] text-[#7554D9] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-xs font-bold text-[#45536B] leading-tight font-['Inter',sans-serif]">
                    Registration Deadline
                  </div>
                  <div className="text-base sm:text-lg lg:text-[18px] xl:text-[19px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight mt-0.5 leading-snug">
                    16 January 2027
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#52617A] leading-tight mt-1 font-['Inter',sans-serif]">
                    Last date for conference registration.
                  </div>
                </div>
              </div>

              {/* Card 3 – Full Paper Submission (Cyan accent) */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#CFFAFE] hover:border-[#0891B2]/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-start gap-3.5 group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#CCFBF1] text-[#087E8B] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-xs font-bold text-[#45536B] leading-tight font-['Inter',sans-serif]">
                    Full Paper Submission
                  </div>
                  <div className="text-base sm:text-lg lg:text-[18px] xl:text-[19px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight mt-0.5 leading-snug">
                    01 February 2027
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#52617A] leading-tight mt-1 font-['Inter',sans-serif]">
                    Last date for full paper submission.
                  </div>
                </div>
              </div>

              {/* Card 4 – Acceptance Notification (Soft peach accent) */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#FED7AA] hover:border-[#EA580C]/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-start gap-3.5 group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Bell className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-xs font-bold text-[#45536B] leading-tight font-['Inter',sans-serif]">
                    Acceptance Notification
                  </div>
                  <div className="text-base sm:text-lg lg:text-[18px] xl:text-[19px] font-black text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight mt-0.5 leading-snug">
                    02 February 2027
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#52617A] leading-tight mt-1 font-['Inter',sans-serif]">
                    Acceptance notification.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. CONFERENCE DATES HIGHLIGHT BANNER */}
          <div className="flex justify-center xl:pl-56 2xl:pl-64 pt-1">
            <div className="bg-white/95 backdrop-blur-md border border-[#D8DFEB] rounded-full p-2 sm:p-2.5 shadow-xl inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-4 max-w-full">
              {/* Left: CONFERENCE DATES gradient pill */}
              <div className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white flex items-center gap-2.5 shadow-sm">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span className="text-xs sm:text-[13px] font-black tracking-widest uppercase font-['Plus_Jakarta_Sans',sans-serif]">
                  CONFERENCE DATES
                </span>
              </div>

              {/* Subtle vertical divider on desktop */}
              <div className="h-6 w-px bg-slate-300 hidden sm:block" />

              {/* Right: 15–16 February 2027 */}
              <div className="px-4 sm:px-6 py-1.5 sm:py-2 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#22C5D9]" />
                <span className="text-base sm:text-xl lg:text-2xl font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#082746] tracking-tight">
                  15–16 February 2027
                </span>
              </div>
            </div>
          </div>

          {/* 4. TIMELINE STRIP (HORIZONTAL ON DESKTOP, COMPACT SEQUENCE ON MOBILE) */}
          <div className="xl:pl-32 2xl:pl-44">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/90 p-5 sm:p-7 lg:p-9 shadow-xl max-w-5xl mx-auto w-full">
            {/* Desktop & Tablet Horizontal Timeline */}
            <div className="hidden sm:block relative">
              {/* Continuous connecting horizontal gradient line */}
              <div className="absolute top-6 left-12 right-12 h-[3.5px] bg-gradient-to-r from-[#0284C7] via-[#7554D9] to-[#22C5D9] rounded-full z-0 opacity-80" />

              {/* 5 Milestone Nodes */}
              <div className="relative z-10 grid grid-cols-5 gap-2 text-center">
                {/* Step 1: Abstract Submission */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#E0F2FE] border-2 border-[#38BDF8] text-[#0284C7] flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="text-xs lg:text-[13.5px] font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] mt-3 leading-tight min-h-[32px] flex items-center justify-center">
                    Abstract Submission
                  </div>
                  <div className="mt-2 inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] shadow-2xs font-['Inter',sans-serif]">
                    By 31 December 2026
                  </div>
                </div>

                {/* Step 2: Registration */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#F3E8FF] border-2 border-[#A855F7] text-[#7554D9] flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <UserCheck className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="text-xs lg:text-[13.5px] font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] mt-3 leading-tight min-h-[32px] flex items-center justify-center">
                    Registration
                  </div>
                  <div className="mt-2 inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F3E8FF] text-[#7554D9] border border-[#E9D5FF] shadow-2xs font-['Inter',sans-serif]">
                    By 16 January 2027
                  </div>
                </div>

                {/* Step 3: Full Paper Submission */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#CCFBF1] border-2 border-[#22C5D9] text-[#087E8B] flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="text-xs lg:text-[13.5px] font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] mt-3 leading-tight min-h-[32px] flex items-center justify-center">
                    Full Paper Submission
                  </div>
                  <div className="mt-2 inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ECFEFF] text-[#087E8B] border border-[#CFFAFE] shadow-2xs font-['Inter',sans-serif]">
                    By 01 February 2027
                  </div>
                </div>

                {/* Step 4: Acceptance Notification */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#FFEDD5] border-2 border-[#FB923C] text-[#EA580C] flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <Bell className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="text-xs lg:text-[13.5px] font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] mt-3 leading-tight min-h-[32px] flex items-center justify-center">
                    Acceptance Notification
                  </div>
                  <div className="mt-2 inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] shadow-2xs font-['Inter',sans-serif]">
                    By 02 February 2027
                  </div>
                </div>

                {/* Step 5: Conference */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] border-2 border-white text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-xs lg:text-[13.5px] font-extrabold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif] mt-3 leading-tight min-h-[32px] flex items-center justify-center">
                    Conference
                  </div>
                  <div className="mt-2 inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-xs font-['Inter',sans-serif]">
                    15–16 February 2027
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Vertical Timeline */}
            <div className="sm:hidden relative pl-8 space-y-6">
              {/* Connecting vertical gradient line */}
              <div className="absolute top-4 bottom-4 left-3.5 w-[3px] bg-gradient-to-b from-[#0284C7] via-[#7554D9] to-[#22C5D9] rounded-full z-0 opacity-80" />

              {/* Step 1 Mobile */}
              <div className="relative z-10 flex items-start gap-3">
                <div className="absolute -left-8 w-8 h-8 rounded-full bg-[#E0F2FE] border-2 border-[#38BDF8] text-[#0284C7] flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Abstract Submission
                  </div>
                  <div className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                    By 31 December 2026
                  </div>
                </div>
              </div>

              {/* Step 2 Mobile */}
              <div className="relative z-10 flex items-start gap-3">
                <div className="absolute -left-8 w-8 h-8 rounded-full bg-[#F3E8FF] border-2 border-[#A855F7] text-[#7554D9] flex items-center justify-center shrink-0 shadow-xs">
                  <UserCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Registration
                  </div>
                  <div className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3E8FF] text-[#7554D9] border border-[#E9D5FF]">
                    By 16 January 2027
                  </div>
                </div>
              </div>

              {/* Step 3 Mobile */}
              <div className="relative z-10 flex items-start gap-3">
                <div className="absolute -left-8 w-8 h-8 rounded-full bg-[#CCFBF1] border-2 border-[#22C5D9] text-[#087E8B] flex items-center justify-center shrink-0 shadow-xs">
                  <ClipboardCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Full Paper Submission
                  </div>
                  <div className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFEFF] text-[#087E8B] border border-[#CFFAFE]">
                    By 01 February 2027
                  </div>
                </div>
              </div>

              {/* Step 4 Mobile */}
              <div className="relative z-10 flex items-start gap-3">
                <div className="absolute -left-8 w-8 h-8 rounded-full bg-[#FFEDD5] border-2 border-[#FB923C] text-[#EA580C] flex items-center justify-center shrink-0 shadow-xs">
                  <Bell className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Acceptance Notification
                  </div>
                  <div className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]">
                    By 02 February 2027
                  </div>
                </div>
              </div>

              {/* Step 5 Mobile */}
              <div className="relative z-10 flex items-start gap-3">
                <div className="absolute -left-8 w-8 h-8 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] border-2 border-white text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#082746] font-['Plus_Jakarta_Sans',sans-serif]">
                    Conference
                  </div>
                  <div className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white">
                    15–16 February 2027
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* =========================================================================
          SECTION 7: CONFERENCE VENUE & HOST CAMPUS (ASYMMETRIC EDITORIAL LAYOUT)
          Exact reproduction of SRMIST_Conference_Venue_and_Campus_Guide_a8333e53.png (Image 2):
          - Atmospheric light background with flowing curved wave ribbons
          - Centered purple-to-cyan gradient badge: "CONFERENCE VENUE & HOST"
          - Main heading: "Conference Venue, Academic Host & Campus" with curved cyan flourish
          - Supporting text
          - Asymmetric grid:
            * Large left panel: Dr. T. P. Ganesan Auditorium (interior photo with exterior toggle, deep violet gradient panel, Users icon)
            * Top-right panel: SRM College of Pharmacy (mortar & pestle icon, cyan accent, building photo)
            * Bottom-right panel: SRMIST Campus (classical landmark icon, orange accent, aerial lake panorama photo)
          - Centered pill button: "Explore Full Travel & Venue Guide →"
          - Faint architectural skyline illustration at bottom right
         ========================================================================= */}
      <section
        className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] bg-[#F6F2FF] bg-cover bg-center bg-no-repeat relative flex flex-col justify-between py-8 sm:py-10 lg:py-12 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden"
        style={{
          backgroundImage: `url(${IMAGES.venueSectionBg})`,
        }}
      >
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center space-y-6 sm:space-y-7 relative z-10">
          {/* 1. SECTION HEADING & IDENTITY */}
          <div className="text-center space-y-2">
            {/* Top pill badge flanked by horizontal rules */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 sm:w-16 h-px bg-gradient-to-r from-transparent to-[#7554D9]/40" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] to-[#22C5D9] text-white shadow-xs">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                  <MapPin className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                  CONFERENCE VENUE & HOST
                </span>
              </div>
              <div className="w-8 sm:w-16 h-px bg-gradient-to-l from-transparent to-[#22C5D9]/40" />
            </div>

            {/* Main Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-black text-[#082746] font-heading tracking-tight leading-tight">
              Conference Venue, Academic Host &{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#7554D9] via-[#6366F1] to-[#22C5D9] bg-clip-text text-transparent">
                  Campus
                </span>
                {/* Curved underline flourish */}
                <svg
                  className="absolute -bottom-1.5 left-0 w-full h-2 text-[#22C5D9]"
                  viewBox="0 0 120 8"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M2,6 C35,1 85,1 118,6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </h2>

            {/* Supporting description */}
            <p className="text-sm sm:text-base text-[#45536B] max-w-2xl mx-auto leading-relaxed">
              Experience the conference at SRMIST, Kattankulathur — a vibrant academic campus with world-class infrastructure and a well-equipped conference venue.
            </p>
          </div>

          {/* 2. THREE EQUAL-HEIGHT CARDS: CONFERENCE VENUE, ACADEMIC HOST & CAMPUS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            {/* CARD 1: MAIN CONFERENCE VENUE */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group min-h-[300px]">
              <div className="h-44 sm:h-48 relative overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={IMAGES.srmAuditoriumPhoto}
                  alt="Dr. T. P. Ganesan Auditorium - SRMIST Kattankulathur"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
                    <Users className="w-6 h-6 text-[#7C3AED]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#7C3AED] uppercase block">
                      MAIN CONFERENCE VENUE
                    </span>
                    <h3 className="text-lg sm:text-[19px] font-black text-[#082746] font-heading leading-tight">
                      Dr. T. P. Ganesan Auditorium
                    </h3>
                  </div>
                </div>
                <p className="text-xs sm:text-[13.5px] text-[#45536B] leading-snug">
                  Inauguration, plenary talks and valedictory session.
                </p>
              </div>
            </div>

            {/* CARD 2: ACADEMIC HOST */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group min-h-[300px]">
              <div className="h-44 sm:h-48 relative overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={IMAGES.srmPharmacyBuilding}
                  alt="SRM College of Pharmacy Entrance"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#E0F7FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-cyan-100 shadow-2xs">
                    <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10,24 C10,33 16,39 24,39 C32,39 38,33 38,24 L10,24 Z" fill="#E0F7FA" />
                      <line x1="8" y1="24" x2="40" y2="24" />
                      <path d="M32,10 L22,23" />
                      <circle cx="34" cy="9" r="3" fill="currentColor" />
                      <path d="M18,17 C16,14 13,15 13,18 C15,18 17,17 18,17 Z" fill="currentColor" />
                      <path d="M22,14 C21,11 18,11 18,14 C20,15 22,14 22,14 Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#087E8B] uppercase block">
                      ACADEMIC HOST
                    </span>
                    <h3 className="text-lg sm:text-[19px] font-black text-[#082746] font-heading leading-tight">
                      SRM College of Pharmacy
                    </h3>
                  </div>
                </div>
                <p className="text-xs sm:text-[13.5px] text-[#45536B] leading-snug">
                  Primary academic host for the conference.
                </p>
              </div>
            </div>

            {/* CARD 3: SRMIST CAMPUS */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group min-h-[300px]">
              <div className="h-44 sm:h-48 relative overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={IMAGES.srmistCampusAerial}
                  alt="SRMIST Campus Landscape and Reflective Lake Panorama"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0 border border-orange-100 shadow-2xs">
                    <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6,18 L24,8 L42,18 L6,18 Z" fill="#FFF7ED" />
                      <line x1="4" y1="40" x2="44" y2="40" />
                      <line x1="8" y1="36" x2="40" y2="36" />
                      <line x1="12" y1="18" x2="12" y2="36" />
                      <line x1="20" y1="18" x2="20" y2="36" />
                      <line x1="28" y1="18" x2="28" y2="36" />
                      <line x1="36" y1="18" x2="36" y2="36" />
                      <circle cx="24" cy="14" r="1.5" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#EA580C] uppercase block">
                      SRMIST CAMPUS
                    </span>
                    <h3 className="text-lg sm:text-[19px] font-black text-[#082746] font-heading leading-tight">
                      SRM Institute of Science and Technology
                    </h3>
                  </div>
                </div>
                <p className="text-xs sm:text-[13.5px] text-[#45536B] leading-snug">
                  Kattankulathur, Tamil Nadu.
                </p>
              </div>
            </div>
          </div>

          {/* 3. BOTTOM CTA BUTTON */}
          <div className="flex items-center justify-center pt-2 relative z-10">
            <button
              type="button"
              onClick={() => onNavigate('venue')}
              className="px-8 py-3.5 rounded-full font-bold text-sm sm:text-[15.5px] text-white bg-gradient-to-r from-[#7554D9] via-[#6366F1] to-[#22C5D9] hover:opacity-95 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center gap-2.5 cursor-pointer"
            >
              <span>Explore Full Travel & Venue Guide</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: CALL FOR ABSTRACTS & DELEGATE REGISTRATION (FINAL APPROVED DESIGN)
          - Full-width supplied background: Pastel Biotech Waves with Molecular Flask
          - Centered badge: "CALL FOR ABSTRACTS & DELEGATE REGISTRATION"
          - Heading: "Participate in AI-DD2027" with curved purple underline flourish
          - Subtitle: "Submit your peer-reviewed abstract to one of seven approved tracks and register as a delegate to engage with leading international researchers in drug discovery."
          - Two side-by-side equal-height cards:
            * Left: Delegate Registration (₹2,000 for students and faculty, gradient button)
            * Right: Abstract Submission (7 TRACKS badge, info banner, white button with violet outline)
          - Bottom process strip (guaranteed single horizontal row on desktop):
            "How to Participate? [1] Register -> [2] Confirm -> [3] Submit"
         ========================================================================= */}
      <section className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] relative flex flex-col justify-between py-10 sm:py-12 lg:py-14 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden">
        {/* Full-Width Background Artwork: Pastel Biotech Waves with Molecular Flask */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={IMAGES.callForAbstractsBg}
            alt=""
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
          {/* Subtle translucent wash preserving artwork vibrancy while maintaining optimal text legibility */}
          <div className="absolute inset-0 bg-white/10 sm:bg-white/5 pointer-events-none" />
        </div>

        {/* Foreground Content Stack */}
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center space-y-7 sm:space-y-8 relative z-10">
          {/* 1. Section Header & Capsule */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 sm:w-16 h-px bg-gradient-to-r from-transparent to-[#7554D9]/40" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] to-[#22C5D9] text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                  CALL FOR ABSTRACTS & DELEGATE REGISTRATION
                </span>
              </div>
              <div className="w-8 sm:w-16 h-px bg-gradient-to-l from-transparent to-[#22C5D9]/40" />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[50px] font-black text-[#082746] font-heading tracking-tight leading-tight">
              Participate in{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#7554D9] via-[#6366F1] to-[#22C5D9] bg-clip-text text-transparent">
                  AI-DD2027
                </span>
                <svg
                  className="absolute -bottom-1.5 left-0 w-full h-2.5 text-[#7554D9]"
                  viewBox="0 0 140 8"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M2,6 C40,1 100,1 138,6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </h2>

            <p className="text-base sm:text-lg md:text-[19px] lg:text-[20px] text-[#45536B] max-w-3xl mx-auto leading-relaxed">
              Submit your peer-reviewed abstract to one of seven approved tracks and register as a delegate to engage with leading international researchers in drug discovery.
            </p>
          </div>

          {/* 2. Side-by-Side Cards (Exact Layout & Proportions from Approved Mockup) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7 w-full items-stretch">
            {/* Left Card: Delegate Registration */}
            <div className="bg-gradient-to-br from-[#FAF8FF] via-white to-[#F5EFFE] rounded-[28px] border border-[#E2D9FC] shadow-lg hover:shadow-xl transition-all p-6 sm:p-8 lg:p-9 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Header Row */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EDE9FA] text-[#7554D9] flex items-center justify-center shrink-0 border border-purple-200/70 shadow-xs">
                    <UserCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-5 rounded-full bg-[#7554D9]" />
                      <h3 className="text-xl sm:text-2xl lg:text-[26px] font-black text-[#082746] font-heading">
                        Delegate Registration
                      </h3>
                    </div>
                    <p className="text-sm sm:text-base text-[#45536B] leading-relaxed">
                      Standard confirmed registration fee applies to all categories.
                    </p>
                  </div>
                </div>

                {/* Bullets with Corrected ₹2,000 Fee */}
                <div className="space-y-3 pt-2 pl-1">
                  <div className="flex items-center gap-3 text-base sm:text-[17px] text-[#45536B]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7554D9] shrink-0" />
                    <span>
                      Students (UG / PG / PhD / Scholars): <strong className="font-black text-[#082746]">₹2,000</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-base sm:text-[17px] text-[#45536B]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7554D9] shrink-0" />
                    <span>
                      Faculty Members & Academicians: <strong className="font-black text-[#082746]">₹2,000</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Gradient Pill Button with Corrected ₹2,000 Fee */}
              <button
                type="button"
                onClick={() => onNavigate('registration')}
                className="w-full py-4 px-6 rounded-full font-bold text-base sm:text-[17px] text-white bg-gradient-to-r from-[#7554D9] via-[#6366F1] to-[#22C5D9] hover:opacity-95 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer mt-2"
              >
                <UserPlus className="w-5 h-5 text-white" />
                <span>Register as Delegate (₹2,000)</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Right Card: Abstract Submission */}
            <div className="bg-gradient-to-br from-[#F2FBFC] via-white to-[#E8F8FA] rounded-[28px] border border-[#C5EEF3] shadow-lg hover:shadow-xl transition-all p-6 sm:p-8 lg:p-9 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E0F7FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-cyan-200/70 shadow-xs">
                      <FileText className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-5 rounded-full bg-[#087E8B]" />
                        <h3 className="text-xl sm:text-2xl lg:text-[26px] font-black text-[#082746] font-heading">
                          Abstract Submission
                        </h3>
                      </div>
                    </div>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-full bg-[#E0F7FA] border border-[#B2EBF2] text-[#087E8B] text-xs font-extrabold uppercase tracking-wider shrink-0 shadow-2xs">
                    7 TRACKS
                  </span>
                </div>

                {/* Bullets */}
                <div className="space-y-3 pt-2 pl-1">
                  <div className="flex items-center gap-3 text-base sm:text-[17px] text-[#45536B]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B] shrink-0" />
                    <span>Peer review by the Scientific Committee</span>
                  </div>
                  <div className="flex items-center gap-3 text-base sm:text-[17px] text-[#45536B]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B] shrink-0" />
                    <span>Eligible for Oral or Poster presentation</span>
                  </div>
                </div>

                {/* Info Callout Box */}
                <div className="bg-[#E0F7FA]/75 border border-[#B2EBF2] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-xs sm:text-[14px] text-[#087E8B] font-medium leading-snug">
                  <div className="w-5 h-5 rounded-full bg-[#087E8B] text-white flex items-center justify-center shrink-0 text-xs font-bold font-serif">
                    i
                  </div>
                  <span>
                    Submission is available only to registered delegates with confirmed registration.
                  </span>
                </div>
              </div>

              {/* White Pill Button with Violet Outline */}
              <button
                type="button"
                onClick={() => onNavigate('abstracts')}
                className="w-full py-4 px-6 rounded-full font-bold text-base sm:text-[17px] text-[#7554D9] bg-white border-2 border-[#7554D9] hover:bg-purple-50/50 hover:border-[#6366F1] transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2.5 cursor-pointer mt-2"
              >
                <FileText className="w-5 h-5 text-[#7554D9]" />
                <span>Submit Abstract</span>
                <ArrowRight className="w-5 h-5 text-[#7554D9]" />
              </button>
            </div>
          </div>

          {/* 3. Bottom How to Participate Step-by-Step Strip (Guaranteed Single Row on Desktop) */}
          <div className="w-full flex items-center justify-center pt-2">
            <div className="w-full max-w-5xl bg-white/92 backdrop-blur-md border border-[#DCE4F2] rounded-2xl md:rounded-full px-5 sm:px-7 py-3 sm:py-3.5 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-2.5 lg:gap-4 md:flex-nowrap">
                {/* How to Participate Badge */}
                <div className="px-4 py-2 rounded-full bg-[#7554D9] text-white text-xs sm:text-[13px] font-bold shadow-2xs whitespace-nowrap shrink-0">
                  How to Participate?
                </div>

                {/* Step 1 */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-[#7554D9] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    1
                  </span>
                  <UserPlus className="w-4 h-4 text-[#7554D9] shrink-0" />
                  <span className="font-bold text-[#082746] text-xs sm:text-[13.5px] lg:text-[14px] whitespace-nowrap">
                    Register as a Delegate
                  </span>
                </div>

                {/* Arrow connector 1 */}
                <ChevronRight className="w-4 h-4 text-purple-300 hidden md:block shrink-0" />

                {/* Step 2 */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-[#7554D9] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    2
                  </span>
                  <Mail className="w-4 h-4 text-[#7554D9] shrink-0" />
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className="font-bold text-[#082746] text-xs sm:text-[13.5px] lg:text-[14px]">
                      Receive Registration Confirmation
                    </span>
                    <span className="text-[11px] sm:text-xs text-[#45536B]">
                      (with Registration ID)
                    </span>
                  </div>
                </div>

                {/* Arrow connector 2 */}
                <ChevronRight className="w-4 h-4 text-purple-300 hidden md:block shrink-0" />

                {/* Step 3 */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-[#7554D9] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    3
                  </span>
                  <FileText className="w-4 h-4 text-[#7554D9] shrink-0" />
                  <span className="font-bold text-[#082746] text-xs sm:text-[13.5px] lg:text-[14px] whitespace-nowrap">
                    Submit Your Abstract
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: INSTITUTIONAL GOVERNANCE & COLLABORATION (MATCH APPROVED MOCKUP)
          Exact reproduction of Institutional_Partners_and_Conference_Leadership_c81d7460.png (Image 1):
          - Broad, luminous canvas with soft lavender-cyan-white gradient and flowing wave ribbons
          - Badge: INSTITUTIONAL GOVERNANCE & COLLABORATION with flanking gradient lines
          - Heading: Organising Institutions & Collaborating Partners (with gradient & curved cyan underline on Partners)
          - Subtitle: Bringing together academic leadership and professional collaboration for AI-DD2027.
          - 4 Institutional Partner Logo Cards:
            * 1. SRMIST (Host Institution, prominent purple border & HOST INSTITUTION top badge, large official SRM logo)
            * 2. SRM College of Pharmacy (Organiser, large official crest & Organiser badge)
            * 3. INTI International University (Collaborator, prominent red asterisk mark & Collaborator badge)
            * 4. Indian Pharmaceutical Association (Professional Association, large official IPA artwork)
          - 2 Spacious Leadership / Contact Panels:
            * Panel 1: CONFERENCE CONVENOR — Dean (dean.pharmacy.ktr@srmist.edu.in) with violet divider & pastel purple icon box
            * Panel 2: ORGANISING SECRETARY — Organising Secretary (org.secy.cp@srmist.edu.in) with cyan divider & pastel cyan icon box
          - Full-width Institutional Address Pill Card at bottom with purple circular pin
         ========================================================================= */}
      <section className="relative w-full bg-gradient-to-b from-[#F6F2FD] via-[#F8FAFF] to-[#EDF6FF] py-14 sm:py-18 lg:py-24 px-4 sm:px-6 lg:px-8 border-b border-[#D8DFEB] overflow-hidden">
        {/* Soft flowing wave background ribbons matching Image 1 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
            <path
              d="M-60,50 C280,130 640,10 1060,75 C1280,115 1420,30 1520,60 L1520,0 L-60,0 Z"
              fill="url(#topWaveRibbonGovV2)"
              opacity="0.45"
            />
            <path
              d="M-60,820 C320,760 720,870 1100,795 C1290,755 1420,820 1520,795 L1520,900 L-60,900 Z"
              fill="url(#bottomWaveRibbonGovV2)"
              opacity="0.4"
            />
            <defs>
              <linearGradient id="topWaveRibbonGovV2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.32" />
                <stop offset="45%" stopColor="#EDE9FE" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.28" />
              </linearGradient>
              <linearGradient id="bottomWaveRibbonGovV2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.32" />
                <stop offset="50%" stopColor="#EDE9FE" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.25" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-[1360px] mx-auto w-full flex flex-col justify-center space-y-8 sm:space-y-10 relative z-10">
          {/* 1. SECTION HEADING & IDENTITY */}
          <div className="text-center space-y-2.5">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
              <div className="w-12 sm:w-20 h-[1.5px] bg-gradient-to-r from-transparent to-[#7042EB]" />
              <span className="text-xs sm:text-[13px] font-extrabold tracking-[0.2em] uppercase text-[#7042EB]">
                INSTITUTIONAL GOVERNANCE & COLLABORATION
              </span>
              <div className="w-12 sm:w-20 h-[1.5px] bg-gradient-to-l from-transparent to-[#7042EB]" />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[48px] font-black text-[#0B1B4A] font-heading tracking-tight leading-tight">
              Organising Institutions & Collaborating{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#7042EB] via-[#6366F1] to-[#0284C7] bg-clip-text text-transparent">
                  Partners
                </span>
                {/* Curved underline flourish matching Image 1 */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-2.5 text-[#06B6D4]"
                  viewBox="0 0 120 10"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M2,7 C35,2 85,2 118,7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h2>

            <p className="text-base sm:text-lg text-[#334155] font-medium max-w-3xl mx-auto leading-relaxed pt-1">
              Bringing together academic leadership and professional collaboration for AI-DD2027.
            </p>
          </div>

          {/* 2. INSTITUTIONAL LOGO SHOWCASE (4 ENLARGED PROPORTIONATE CARDS) */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-row gap-5 sm:gap-6 w-full items-stretch pt-3">
            {/* Card 1: Host Institution (SRMIST) */}
            <div className="lg:w-[34%] bg-gradient-to-b from-[#FBF9FF] via-[#F6F2FF] to-[#F1EAFF] border-2 border-[#D8B4FE] rounded-[28px] p-6 sm:p-7 shadow-[0_12px_32px_rgba(112,66,235,0.12)] hover:shadow-[0_16px_36px_rgba(112,66,235,0.18)] transition-all flex flex-col items-center justify-center relative pt-8 sm:pt-9 min-h-[220px] lg:min-h-[235px] group">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full bg-[#6F36E8] text-white text-xs sm:text-[13px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
                HOST INSTITUTION
              </div>
              <div className="flex items-center justify-center w-full h-full px-4 pt-2">
                <img
                  src={IMAGES.srmistLogo}
                  alt="SRM Institute of Science and Technology"
                  className="h-22 sm:h-24 lg:h-28 w-auto max-w-[94%] object-contain transition-transform duration-300 group-hover:scale-103"
                  loading="eager"
                />
              </div>
            </div>

            {/* Card 2: SRM College of Pharmacy (Organiser) */}
            <div className="lg:w-[22%] bg-white border border-slate-200/90 rounded-[28px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col items-center justify-between text-center min-h-[220px] lg:min-h-[235px] group">
              <div className="w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center shrink-0 my-auto">
                <img
                  src={IMAGES.srmPharmacyLogo}
                  alt="SRM College of Pharmacy"
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="eager"
                />
              </div>
              <div className="mt-2 space-y-2 w-full">
                <h3 className="text-base sm:text-[17px] font-bold text-[#0B1B4A] leading-snug">
                  SRM College of<br className="hidden sm:inline" /> Pharmacy
                </h3>
                <span className="inline-block px-5 py-1 rounded-full bg-[#EFE9FE] text-[#7042EB] text-xs font-bold shadow-2xs">
                  Organiser
                </span>
              </div>
            </div>

            {/* Card 3: INTI International University (Collaborator) */}
            <div className="lg:w-[22%] bg-white border border-slate-200/90 rounded-[28px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col items-center justify-between text-center min-h-[220px] lg:min-h-[235px] group">
              <div className="flex items-center justify-center gap-3.5 my-auto px-2">
                <svg viewBox="0 0 100 100" className="w-13 h-13 sm:w-15 sm:h-15 shrink-0 transition-transform duration-300 group-hover:scale-105" fill="none">
                  <path d="M50 10L50 90M10 50L90 50M21.7 21.7L78.3 78.3M21.7 78.3L78.3 21.7" stroke="#E11D48" strokeWidth="13" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="11" fill="#E11D48" />
                </svg>
                <div className="text-left leading-tight">
                  <div className="text-2xl sm:text-[26px] font-black text-[#0B1B4A] tracking-tight leading-none">
                    INTI
                  </div>
                  <div className="text-sm sm:text-[15px] font-bold text-[#0B1B4A] tracking-tight leading-tight mt-0.5">
                    International
                  </div>
                  <div className="text-xs sm:text-[13px] font-medium text-slate-600 tracking-tight leading-tight">
                    University
                  </div>
                </div>
              </div>
              <div className="mt-2 w-full">
                <span className="inline-block px-5 py-1 rounded-full bg-[#DDF4FD] text-[#0284C7] text-xs font-bold shadow-2xs">
                  Collaborator
                </span>
              </div>
            </div>

            {/* Card 4: Indian Pharmaceutical Association (IPA) */}
            <div className="lg:w-[22%] bg-white border border-slate-200/90 rounded-[28px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col items-center justify-between text-center min-h-[220px] lg:min-h-[235px] group">
              <div className="flex items-center justify-center my-auto w-full px-2">
                <img
                  src={IMAGES.ipaOfficialLogo}
                  alt="The Indian Pharmaceutical Association (IPA) - ...CRUSADE FOR THE PROFESSION"
                  className="h-14 sm:h-16 lg:h-18 w-auto max-w-[270px] object-contain transition-transform duration-300 group-hover:scale-103"
                />
              </div>
              <div className="mt-2 w-full">
                <span className="inline-block px-4 py-1 rounded-full bg-[#E0F2F1] text-[#087E8B] text-xs font-bold shadow-2xs whitespace-nowrap">
                  Professional Association
                </span>
              </div>
            </div>
          </div>

          {/* 3. TWO ENLARGED LEADERSHIP & CONTACT PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 w-full pt-1">
            {/* Panel 1: CONFERENCE CONVENOR */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_28px_rgba(0,0,0,0.04)] hover:shadow-md transition-all p-6 sm:p-7 lg:p-8 flex items-center gap-5 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#EDE9FA] text-[#7042EB] flex items-center justify-center shrink-0 border border-[#DDD6FE] shadow-2xs">
                {/* Academic Dean figure icon */}
                <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
                  <path d="M12 11v4" />
                  <path d="M10.5 15l1.5 2 1.5-2" />
                </svg>
              </div>
              <div className="w-[3px] h-14 sm:h-16 rounded-full bg-[#7042EB] shrink-0" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <span className="text-xs sm:text-[13px] font-extrabold tracking-wider text-[#7042EB] uppercase block">
                  CONFERENCE CONVENOR
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#0B1B4A] font-heading leading-tight">
                  Dean
                </h3>
                <div className="flex items-center gap-2 pt-1">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#7042EB] shrink-0" />
                  <a
                    href="mailto:dean.pharmacy.ktr@srmist.edu.in"
                    className="text-sm sm:text-base lg:text-[17px] font-bold text-[#0B1B4A] hover:text-[#7042EB] underline underline-offset-4 transition-colors break-all"
                  >
                    dean.pharmacy.ktr@srmist.edu.in
                  </a>
                </div>
              </div>
            </div>

            {/* Panel 2: ORGANISING SECRETARY */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_28px_rgba(0,0,0,0.04)] hover:shadow-md transition-all p-6 sm:p-7 lg:p-8 flex items-center gap-5 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#E0F7FA] text-[#087E8B] flex items-center justify-center shrink-0 border border-[#BAE6FD] shadow-2xs">
                <Mail className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div className="w-[3px] h-14 sm:h-16 rounded-full bg-[#06B6D4] shrink-0" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <span className="text-xs sm:text-[13px] font-extrabold tracking-wider text-[#087E8B] uppercase block">
                  ORGANISING SECRETARY
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#0B1B4A] font-heading leading-tight">
                  Organising Secretary
                </h3>
                <div className="flex items-center gap-2 pt-1">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#087E8B] shrink-0" />
                  <a
                    href="mailto:org.secy.cp@srmist.edu.in"
                    className="text-sm sm:text-base lg:text-[17px] font-bold text-[#0B1B4A] hover:text-[#087E8B] underline underline-offset-4 transition-colors break-all"
                  >
                    org.secy.cp@srmist.edu.in
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 4. FULL-WIDTH INSTITUTIONAL ADDRESS CARD */}
          <div className="w-full bg-white rounded-3xl sm:rounded-full border border-slate-200/90 shadow-[0_8px_25px_rgba(0,0,0,0.04)] py-5 px-6 sm:px-8 lg:px-10 flex items-center gap-4 sm:gap-5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#7042EB] text-white flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div className="w-[2.5px] h-7 sm:h-8 rounded-full bg-[#7042EB] shrink-0 hidden sm:block" />
            <p className="text-sm sm:text-base lg:text-[17px] font-bold text-[#0B1B4A] leading-relaxed">
              SRM College of Pharmacy, SRM Institute of Science and Technology, Kattankulathur, Chengalpattu District, Tamil Nadu 603203, India.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PHARMAQUEST HACKATHON INTERACTIVE DETAILS MODAL (MOCKUP 2 REFERENCE)
         ========================================================================= */}
      {pharmaQuestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pharmaquest-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPharmaQuestModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-2xl space-y-5 my-auto relative border border-slate-200/90 text-[#45536B] animate-in zoom-in-95 duration-200">
            {/* Top Header Row */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shadow-inner shrink-0">
                  <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <h3
                    id="pharmaquest-modal-title"
                    className="text-xl sm:text-2xl font-black text-[#082746] font-heading tracking-tight"
                  >
                    PharmaQuest 2027
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-[#7554D9]">
                    Drug Discovery Hackathon
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E0F7FA] border border-[#B2EBF2] text-[#087E8B] text-xs font-bold shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#087E8B]" />
                  <span>16 February 2027 (Morning)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPharmaQuestModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: 4 Structured Cards */}
            <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              {/* Card 1: Eligibility & Team Formation */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9F8FE] border border-[#E9E4F8] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-[#7554D9]" />
                    <h4 className="text-sm sm:text-base font-bold text-[#082746]">
                      Eligibility & Team Formation
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-[#45536B] leading-relaxed">
                  Detailed information on eligible participants, team size (4–5 members), interdisciplinary team composition and registration guidelines for PharmaQuest 2027.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-purple-100/60">
                    <CheckCircle2 className="w-4 h-4 text-[#7554D9] shrink-0 mt-0.5" />
                    <span><strong>Eligible Courses:</strong> B.Pharm, Pharm.D, M.Pharm & allied life-science students</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-purple-100/60">
                    <CheckCircle2 className="w-4 h-4 text-[#7554D9] shrink-0 mt-0.5" />
                    <span><strong>Research Scholars:</strong> Ph.D. scholars & early-career researchers</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-purple-100/60">
                    <CheckCircle2 className="w-4 h-4 text-[#7554D9] shrink-0 mt-0.5" />
                    <span><strong>Team Size:</strong> Strictly 4–5 participants per registered team</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-purple-100/60">
                    <CheckCircle2 className="w-4 h-4 text-[#7554D9] shrink-0 mt-0.5" />
                    <span><strong>Interdisciplinary:</strong> Cross-domain teams combining pharma, bio & computational skills encouraged</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Challenge Areas */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4FCFD] border border-[#D5F3F7] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E0F7FA] flex items-center justify-center text-[#087E8B] shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-[#087E8B]" />
                    <h4 className="text-sm sm:text-base font-bold text-[#082746]">
                      Challenge Areas
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-[#45536B] leading-relaxed">
                  Complete list of thematic problem statements and focus areas, including drug discovery, pharmaceuticals & formulation, pharmacology, analysis, QA & regulatory science, toxicology & safety and AI in drug discovery.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    'Drug Discovery & Molecular Design',
                    'Pharmaceutics & Formulation Development',
                    'Pharmacology & Preclinical Screening',
                    'Pharmaceutical Analysis & Characterisation',
                    'Quality Assurance & Regulatory Science',
                    'Toxicology & Safety Assessment',
                    'AI in Drug Discovery & Development',
                  ].map((area, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#B2EBF2] text-[#087E8B] shadow-2xs"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 3: Competition Format */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9F8FE] border border-[#E9E4F8] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-[#7554D9]" />
                    <h4 className="text-sm sm:text-base font-bold text-[#082746]">
                      Competition Format
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-[#45536B] leading-relaxed">
                  A step-wise overview of the hackathon, including Challenge Reveal, Analyse & Collaborate, Solve Under Pressure and Present & Defend, with round-wise details, timelines and submission requirements.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="bg-white/80 p-3 rounded-xl border border-purple-100/60 space-y-1">
                    <div className="font-bold text-[#082746] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#EDE9FA] text-[#7554D9] flex items-center justify-center text-[10px] font-black">
                        1
                      </span>
                      <span>Challenge Reveal</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-6.5">
                      Authentic, unannounced pharmaceutical research challenges unveiled live on the morning of 16 February 2027.
                    </p>
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl border border-purple-100/60 space-y-1">
                    <div className="font-bold text-[#082746] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#EDE9FA] text-[#7554D9] flex items-center justify-center text-[10px] font-black">
                        2
                      </span>
                      <span>Analyse & Collaborate</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-6.5">
                      Rapid team brainstorming, literature evaluation, molecular hypothesis formulation and collaborative strategy.
                    </p>
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl border border-purple-100/60 space-y-1">
                    <div className="font-bold text-[#082746] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#EDE9FA] text-[#7554D9] flex items-center justify-center text-[10px] font-black">
                        3
                      </span>
                      <span>Solve Under Pressure</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-6.5">
                      Structured problem solving, methodology formulation, and rapid slide deck preparation under strict time constraints.
                    </p>
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl border border-purple-100/60 space-y-1">
                    <div className="font-bold text-[#082746] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#EDE9FA] text-[#7554D9] flex items-center justify-center text-[10px] font-black">
                        4
                      </span>
                      <span>Present & Defend</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-6.5">
                      5-minute presentation followed by a 3-minute defense before a distinguished jury of academic and industrial experts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Evaluation Criteria */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4FCFD] border border-[#D5F3F7] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E0F7FA] flex items-center justify-center text-[#087E8B] shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-[#087E8B]" />
                    <h4 className="text-sm sm:text-base font-bold text-[#082746]">
                      Evaluation Criteria
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-[#45536B] leading-relaxed">
                  Complete evaluation framework, including scientific accuracy, critical thinking, data interpretation, innovation & feasibility, team collaboration and clarity of presentation, with scoring details.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-cyan-100/60">
                    <Check className="w-4 h-4 text-[#087E8B] shrink-0 mt-0.5" />
                    <span><strong>Scientific Accuracy:</strong> Correctness of proposed scientific mechanisms & literature ground</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-cyan-100/60">
                    <Check className="w-4 h-4 text-[#087E8B] shrink-0 mt-0.5" />
                    <span><strong>Critical Thinking:</strong> Analytical depth, data interpretation & problem formulation</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-cyan-100/60">
                    <Check className="w-4 h-4 text-[#087E8B] shrink-0 mt-0.5" />
                    <span><strong>Innovation & Feasibility:</strong> Novelty of solution and translational real-world viability</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-cyan-100/60">
                    <Check className="w-4 h-4 text-[#087E8B] shrink-0 mt-0.5" />
                    <span><strong>Teamwork & Defense:</strong> Cohesive collaboration and articulate responses to the jury</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPharmaQuestModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-slate-300 text-xs font-bold text-[#45536B] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPharmaQuestModalOpen(false);
                  onNavigate('registration');
                }}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#7554D9] to-[#22C5D9] hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
              >
                <span>Register for Conference & Hackathon</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presentation Document Download Notice Modal */}
      {activeDownloadDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-6 overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6366F1] shrink-0">
                  <FileText className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#082746]">
                    {activeDownloadDoc.name}
                  </h3>
                  <span className="inline-block mt-0.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {activeDownloadDoc.format} Presentation • {activeDownloadDoc.type === 'template' ? 'Template' : 'Guidelines'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDownloadDoc(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-[13px] text-[#45536B] leading-relaxed">
              <p className="font-semibold text-[#082746] mb-1">
                Official Document Pending Secretariat Release
              </p>
              <p>{activeDownloadDoc.pendingNotice}</p>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Document filename:</span>
                <code className="font-mono font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {activeDownloadDoc.filename}
                </code>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveDownloadDoc(null)}
                className="px-5 py-2 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Got It
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDownloadDoc(null);
                  onNavigate('abstracts');
                }}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#06B6D4] hover:opacity-95 transition-all cursor-pointer shadow-sm"
              >
                Go to Abstract Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


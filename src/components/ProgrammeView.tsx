import React, { useState } from 'react';
import { IMAGES } from '../lib/images';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Landmark,
  Presentation,
  Sun,
  Sunset,
  Sparkles,
  Trophy,
  Award,
  Layers,
  FileText,
} from 'lucide-react';

// Exact session data types
export interface ScientificSession {
  sessionNumber: string;
  speaker: string;
  title: string;
  format: 'Offline' | 'Online';
}

export interface SpecialBlock {
  title: string;
  type: 'inauguration' | 'hackathon' | 'presentation' | 'valedictory' | 'poster';
  format?: 'Offline' | 'Online';
  venue?: string;
  description?: string;
}

// Format Badge Helper
const FormatBadge: React.FC<{ format: 'Offline' | 'Online' }> = ({ format }) => {
  if (format === 'Offline') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] shrink-0">
        Offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] shrink-0">
      Online
    </span>
  );
};

// Scientific Session Row/Card
const SessionCard: React.FC<{ session: ScientificSession }> = ({ session }) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:border-[#7554D9]/40 transition-all flex items-center justify-between gap-3 group">
      {/* Left: Session Number Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-[#6B46C1] text-white text-xs font-bold font-mono shrink-0 shadow-2xs">
          {session.sessionNumber}
        </span>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 shrink-0 hidden sm:block" />

        {/* Middle: Speaker & Talk Title */}
        <div className="min-w-0">
          <div className="text-[13px] sm:text-sm font-bold text-[#082746] truncate">
            {session.speaker}
          </div>
          <div className="text-[11px] sm:text-xs text-[#556987] italic truncate">
            Talk Title: {session.title}
          </div>
        </div>
      </div>

      {/* Right: Format Badge */}
      <FormatBadge format={session.format} />
    </div>
  );
};

export const ProgrammeView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<1 | 2>(1);

  return (
    <div className="w-full bg-[#FAF9FD] min-h-screen relative overflow-hidden flex flex-col justify-between py-6 sm:py-8 lg:py-10">
      {/* =====================================================================
          BACKGROUND ARTWORK: CAMPUS BUILDING PHOTO & 3D MOLECULAR DNA CAPSULE
         ===================================================================== */}

      {/* Top-Left: SRM College of Pharmacy Campus Building with soft white fade */}
      <div className="absolute left-0 top-0 w-[360px] sm:w-[480px] lg:w-[640px] h-[240px] sm:h-[300px] pointer-events-none overflow-hidden z-0">
        <img
          src={IMAGES.srmPharmacyBuilding}
          alt="SRM College of Pharmacy"
          className="w-full h-full object-cover object-left-top opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FAF9FD]/80 to-[#FAF9FD]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAF9FD]/60 to-[#FAF9FD]" />
      </div>

      {/* Top-Right: 3D AI Molecular Capsule Artwork */}
      <div className="absolute right-2 sm:right-6 lg:right-10 top-2 w-40 sm:w-52 lg:w-64 h-auto pointer-events-none opacity-90 hidden sm:block z-0">
        <svg viewBox="0 0 240 200" className="w-full h-auto drop-shadow-[0_12px_24px_rgba(117,84,217,0.22)]" fill="none">
          <defs>
            <radialGradient id="progMolPurple" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#C084FC" />
              <stop offset="80%" stopColor="#8B50E8" />
              <stop offset="100%" stopColor="#581C87" />
            </radialGradient>
            <radialGradient id="progMolCyan" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#67E8F9" />
              <stop offset="80%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#0E7490" />
            </radialGradient>
            <linearGradient id="progCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Molecular bonds */}
          <line x1="40" y1="35" x2="80" y2="70" stroke="#93C5FD" strokeWidth="4" strokeLinecap="round" />
          <line x1="80" y1="70" x2="30" y2="110" stroke="#DDD6FE" strokeWidth="4" strokeLinecap="round" />
          <circle cx="40" cy="35" r="14" fill="url(#progMolPurple)" />
          <circle cx="30" cy="110" r="15" fill="url(#progMolPurple)" />
          <circle cx="80" cy="70" r="18" fill="url(#progMolPurple)" />

          {/* 3D Glass Pill Capsule */}
          <g transform="translate(150, 90) rotate(-35)">
            <rect x="-22" y="-50" width="44" height="100" rx="22" fill="#FFFFFF" fillOpacity="0.45" stroke="#BAE6FD" strokeWidth="3" />
            <path d="M-22,0 L22,0 L22,28 C22,40.1 12.1,50 0,50 C-12.1,50 -22,40.1 -22,28 Z" fill="url(#progCapGrad)" fillOpacity="0.9" />
            <circle cx="0" cy="20" r="11" fill="#FFFFFF" fillOpacity="0.9" />
            <text x="0" y="25" textAnchor="middle" fontSize="12" fontWeight="900" fill="#7C3AED" fontFamily="sans-serif">
              AI
            </text>
          </g>

          <circle cx="190" cy="40" r="13" fill="url(#progMolCyan)" />
          <circle cx="170" cy="165" r="12" fill="url(#progMolCyan)" />
        </svg>
      </div>

      {/* =====================================================================
          MAIN CONTENT CONTAINER
         ===================================================================== */}
      <div className="w-[94%] max-w-[1536px] mx-auto relative z-10 space-y-5 sm:space-y-6">
        {/* =====================================================================
            1. HERO & PROGRAMME HEADING
           ===================================================================== */}
        <div className="text-center max-w-4xl mx-auto space-y-2">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[11px] sm:text-[12px] font-semibold tracking-wider uppercase shadow-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>SCIENTIFIC PROGRAMME</span>
          </div>

          {/* Subtitle / Conference Theme Line */}
          <div className="text-sm sm:text-base md:text-[16px] font-bold text-[#082746] tracking-tight">
            AI-Powered Innovations in Drug Discovery and Development
          </div>

          {/* Decorative flourish line with main heading */}
          <div className="flex items-center justify-center gap-3 pt-0.5">
            <div className="w-12 sm:w-16 h-0.5 bg-gradient-to-r from-transparent to-[#7554D9] rounded-full" />
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#082746] font-heading tracking-tight leading-tight">
              Conference Schedule
            </h1>
            <div className="w-12 sm:w-16 h-0.5 bg-gradient-to-l from-transparent to-[#22C5D9] rounded-full" />
          </div>

          {/* Day Selector - Two-option Segmented Switcher */}
          <div className="pt-2">
            <div className="inline-flex items-center p-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-xs backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setSelectedDay(1)}
                className={`px-5 sm:px-7 py-2 sm:py-2.5 rounded-full text-sm sm:text-[15px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  selectedDay === 1
                    ? 'bg-gradient-to-r from-[#7554D9] via-[#6842C2] to-[#5B3ABF] text-white shadow-md'
                    : 'text-[#082746] hover:text-[#7554D9] hover:bg-slate-100/60'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Day 1 – 15 February 2027</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDay(2)}
                className={`px-5 sm:px-7 py-2 sm:py-2.5 rounded-full text-sm sm:text-[15px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  selectedDay === 2
                    ? 'bg-gradient-to-r from-[#7554D9] via-[#6842C2] to-[#5B3ABF] text-white shadow-md'
                    : 'text-[#082746] hover:text-[#7554D9] hover:bg-slate-100/60'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Day 2 – 16 February 2027</span>
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. SCHEDULE MATRIX CONTAINER (Glassmorphic Outer Card)
           ===================================================================== */}
        <div className="bg-white/85 backdrop-blur-md border border-indigo-100/80 rounded-[28px] p-4 sm:p-6 lg:p-7 shadow-sm transition-all duration-300">
          {/* Day Label inside container */}
          <div className="flex items-center gap-2 text-lg sm:text-xl font-black text-[#082746] font-heading pb-4 sm:pb-5">
            <Calendar className="w-5 h-5 text-[#7554D9]" />
            <span>
              {selectedDay === 1 ? 'Day 1 – 15 February 2027' : 'Day 2 – 16 February 2027'}
            </span>
          </div>

          {/* ===================================================================
              DESKTOP / TABLET SCHEDULE MATRIX (3-HALL PARALLEL GRID)
             =================================================================== */}
          <div className="space-y-4">
            {/* Table Header Row: Time Band + 3 Halls */}
            <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
              {/* Time Column Header (Blank/Aligned) */}
              <div className="hidden lg:block lg:col-span-2" />

              {/* Main Hall Header (Deep Navy) */}
              <div className="col-span-12 lg:col-span-4 bg-[#0B2546] text-white rounded-2xl p-3 sm:p-3.5 shadow-sm flex items-center justify-center gap-2.5 text-center">
                <Landmark className="w-5 h-5 text-cyan-300 shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-bold leading-tight">
                    Main Hall
                  </div>
                  <div className="text-[11px] text-cyan-200/90 font-medium">
                    Dr. T. P. Ganesan Auditorium
                  </div>
                </div>
              </div>

              {/* Mini Hall I Header (Violet) */}
              <div className="col-span-12 lg:col-span-3 bg-[#6B46C1] text-white rounded-2xl p-3 sm:p-3.5 shadow-sm flex items-center justify-center gap-2 text-center">
                <Users className="w-5 h-5 text-purple-200 shrink-0" />
                <div className="text-sm sm:text-base font-bold">
                  Mini Hall I
                </div>
              </div>

              {/* Mini Hall II Header (Teal) */}
              <div className="col-span-12 lg:col-span-3 bg-[#0D7478] text-white rounded-2xl p-3 sm:p-3.5 shadow-sm flex items-center justify-center gap-2 text-center">
                <Presentation className="w-5 h-5 text-teal-200 shrink-0" />
                <div className="text-sm sm:text-base font-bold">
                  Mini Hall II
                </div>
              </div>
            </div>

            {/* =================================================================
                SCHEDULE BODY: DYNAMICALLY SWITCHED BASED ON selectedDay
               ================================================================= */}
            {selectedDay === 1 ? (
              /* ================= DAY 1 SCHEDULE ================= */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* ----------------- FORENOON (FN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  {/* Time Band Column */}
                  <div className="col-span-12 lg:col-span-2 bg-[#F8FAFD] border border-slate-200/90 rounded-2xl p-4 flex flex-row lg:flex-col items-center justify-center gap-2 text-center shadow-2xs">
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                      <Sun className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-black text-[#082746]">
                        Forenoon
                      </div>
                      <div className="text-xs font-bold text-[#087E8B]">
                        (FN)
                      </div>
                    </div>
                  </div>

                  {/* Main Hall (FN): Inauguration Ceremony & Sessions I, II */}
                  <div className="col-span-12 lg:col-span-4 bg-[#F8F9FE] border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    {/* Inauguration Ceremony Banner Block */}
                    <div className="bg-gradient-to-r from-[#EDE9FE] via-[#F3E8FF] to-[#E0E7FF] border border-[#DDD6FE] rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-center text-[#5B21B6] font-bold text-xs sm:text-[13px] shadow-2xs">
                      <Sparkles className="w-4 h-4 text-[#7C3AED] shrink-0" />
                      <span>Inauguration Ceremony</span>
                    </div>

                    {/* Session I */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session I',
                        speaker: 'Dr. Geetha Subramaniam',
                        title: 'To be confirmed',
                        format: 'Offline',
                      }}
                    />

                    {/* Session II */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session II',
                        speaker: 'Prof. Claudiu T. Supuran',
                        title: 'To be confirmed',
                        format: 'Online',
                      }}
                    />
                  </div>

                  {/* Mini Hall I (FN): Empty */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE]/60 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-center text-slate-400 font-medium text-2xl min-h-[140px]">
                    <span>—</span>
                  </div>

                  {/* Mini Hall II (FN): Empty */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE]/60 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-center text-slate-400 font-medium text-2xl min-h-[140px]">
                    <span>—</span>
                  </div>
                </div>

                {/* ----------------- AFTERNOON (AN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  {/* Time Band Column */}
                  <div className="col-span-12 lg:col-span-2 bg-[#F8FAFD] border border-slate-200/90 rounded-2xl p-4 flex flex-row lg:flex-col items-center justify-center gap-2 text-center shadow-2xs">
                    <div className="p-2 bg-orange-50 rounded-xl border border-orange-100">
                      <Sunset className="w-5 h-5 text-[#EA580C]" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-black text-[#082746]">
                        Afternoon
                      </div>
                      <div className="text-xs font-bold text-[#087E8B]">
                        (AN)
                      </div>
                    </div>
                  </div>

                  {/* Main Hall (AN): Empty */}
                  <div className="col-span-12 lg:col-span-4 bg-[#F8F9FE]/60 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-center text-slate-400 font-medium text-2xl min-h-[140px]">
                    <span>—</span>
                  </div>

                  {/* Mini Hall I (AN): Sessions III, IV, V */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE] border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    {/* Session III */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session III',
                        speaker: 'Maitri Sanghavi',
                        title: 'To be confirmed',
                        format: 'Offline',
                      }}
                    />

                    {/* Session IV */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session IV',
                        speaker: 'TBA',
                        title: 'To be confirmed',
                        format: 'Offline',
                      }}
                    />

                    {/* Session V */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session V',
                        speaker: 'TBA',
                        title: 'To be confirmed',
                        format: 'Online',
                      }}
                    />
                  </div>

                  {/* Mini Hall II (AN): E-Poster Presentations Block */}
                  <div className="col-span-12 lg:col-span-3 bg-gradient-to-br from-[#F0FDF4]/50 via-white to-[#E0F7FA]/40 border border-[#BAE6FD]/80 rounded-2xl p-5 shadow-2xs flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[140px]">
                    <div className="flex items-center justify-center gap-3 w-full">
                      <div className="p-2.5 bg-cyan-50 rounded-xl border border-cyan-100 text-[#0284C7] shrink-0">
                        <Presentation className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>

                      <div className="h-8 w-px bg-slate-200 shrink-0" />

                      <div className="text-left">
                        <div className="text-base sm:text-lg font-black text-[#082746] font-heading leading-tight">
                          E-Poster Presentations
                        </div>
                        <div className="pt-1.5">
                          <FormatBadge format="Online" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= DAY 2 SCHEDULE ================= */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* ----------------- FORENOON (FN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  {/* Time Band Column */}
                  <div className="col-span-12 lg:col-span-2 bg-[#F8FAFD] border border-slate-200/90 rounded-2xl p-4 flex flex-row lg:flex-col items-center justify-center gap-2 text-center shadow-2xs">
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                      <Sun className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-black text-[#082746]">
                        Forenoon
                      </div>
                      <div className="text-xs font-bold text-[#087E8B]">
                        (FN)
                      </div>
                    </div>
                  </div>

                  {/* Main Hall (FN): PharmaQuest – Drug Discovery Hackathon */}
                  <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-[#EFF6FF] via-white to-[#EDE9FE] border border-indigo-200/80 rounded-2xl p-5 shadow-2xs flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[140px]">
                    <div className="p-3 bg-indigo-50 text-[#4338CA] rounded-2xl border border-indigo-100 mb-2">
                      <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#082746] font-heading leading-tight">
                      PharmaQuest – Drug Discovery Hackathon
                    </div>
                    <p className="text-xs text-[#556987] font-medium pt-1 max-w-xs">
                      Live collaborative computational bio-hackathon and AI innovation challenge.
                    </p>
                  </div>

                  {/* Mini Hall I (FN): Sessions VIII, IX, X */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE] border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    {/* Session VIII */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session VIII',
                        speaker: 'TBA',
                        title: 'TBA',
                        format: 'Online',
                      }}
                    />

                    {/* Session IX */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session IX',
                        speaker: 'TBA',
                        title: 'TBA',
                        format: 'Offline',
                      }}
                    />

                    {/* Session X */}
                    <SessionCard
                      session={{
                        sessionNumber: 'Session X',
                        speaker: 'TBA',
                        title: 'TBA',
                        format: 'Offline',
                      }}
                    />
                  </div>

                  {/* Mini Hall II (FN): Oral Paper Presentations */}
                  <div className="col-span-12 lg:col-span-3 bg-gradient-to-br from-[#F0FDF4]/60 via-white to-[#ECFDF5]/40 border border-[#A7F3D0]/80 rounded-2xl p-5 shadow-2xs flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[140px]">
                    <div className="p-3 bg-emerald-50 text-[#059669] rounded-2xl border border-emerald-100 mb-2">
                      <Layers className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#082746] font-heading leading-tight">
                      Oral Paper Presentations
                    </div>
                    <div className="pt-2">
                      <FormatBadge format="Offline" />
                    </div>
                  </div>
                </div>

                {/* ----------------- AFTERNOON (AN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  {/* Time Band Column */}
                  <div className="col-span-12 lg:col-span-2 bg-[#F8FAFD] border border-slate-200/90 rounded-2xl p-4 flex flex-row lg:flex-col items-center justify-center gap-2 text-center shadow-2xs">
                    <div className="p-2 bg-orange-50 rounded-xl border border-orange-100">
                      <Sunset className="w-5 h-5 text-[#EA580C]" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-black text-[#082746]">
                        Afternoon
                      </div>
                      <div className="text-xs font-bold text-[#087E8B]">
                        (AN)
                      </div>
                    </div>
                  </div>

                  {/* Main Hall (AN): Valedictory Ceremony */}
                  <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-[#FEF2F2] via-white to-[#FDF4FF] border border-purple-200/80 rounded-2xl p-5 shadow-2xs flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[140px]">
                    <div className="p-3 bg-purple-50 text-[#7C3AED] rounded-2xl border border-purple-100 mb-2">
                      <Award className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#082746] font-heading leading-tight">
                      Valedictory Ceremony
                    </div>
                    <p className="text-xs text-[#556987] font-medium pt-1 max-w-xs">
                      Award conferrals, concluding conference remarks, and valedictory address.
                    </p>
                  </div>

                  {/* Mini Hall I (AN): Empty */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE]/60 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-center text-slate-400 font-medium text-2xl min-h-[140px]">
                    <span>—</span>
                  </div>

                  {/* Mini Hall II (AN): Empty */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE]/60 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-center text-slate-400 font-medium text-2xl min-h-[140px]">
                    <span>—</span>
                  </div>
                </div>

                {/* ----------------- SEPARATE POSTER VENUE BLOCK ----------------- */}
                <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F5F3FF] to-[#ECFEFF] border-2 border-indigo-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-white text-[#7554D9] rounded-2xl shadow-xs border border-indigo-100 shrink-0">
                      <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-[#082746] font-heading">
                          Poster Presentations
                        </span>
                        <FormatBadge format="Offline" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#087E8B] pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#7554D9] shrink-0" />
                        <span>Venue: Dr. T. P. Ganesan Auditorium – Poster Space</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-medium text-right hidden md:block max-w-xs">
                    Concurrent physical poster boards and scientific research interactive discussions.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            3. FORMAT LEGEND (Compact Pill)
           ===================================================================== */}
        <div className="flex justify-center pt-1">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-white/95 border border-slate-200/90 rounded-2xl py-2 px-5 sm:px-8 shadow-xs text-xs sm:text-sm font-medium text-[#45536B]">
            <span className="font-bold text-[#082746]">Format:</span>

            <div className="flex items-center gap-1.5">
              <FormatBadge format="Offline" />
              <span>– On-site presentation</span>
            </div>

            <div className="flex items-center gap-1.5">
              <FormatBadge format="Online" />
              <span>– Virtual presentation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

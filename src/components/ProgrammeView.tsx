import React, { useState } from 'react';
import { IMAGES } from '../lib/images';
import {
  Calendar,
  Clock,
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
  Music,
  Utensils,
} from 'lucide-react';

// Structured session & programme data types supporting optional confirmed timings
export interface ScientificSession {
  sessionNumber: string;
  speaker: string;
  title: string;
  format: 'Offline' | 'Online';
  timeRange?: string;
}

export interface ProgrammeActivity {
  title: string;
  description?: string;
  format?: 'Offline' | 'Online';
  venue?: string;
  timeRange?: string;
}

// Period timing configuration
const PERIOD_TIMINGS = {
  day1Forenoon: '10:00 AM – 12:30 PM',
  day1Afternoon: '1:30 PM – 4:30 PM',
  day2Forenoon: '9:00 AM – 1:00 PM',
  day2Afternoon: '2:00 PM – 4:00 PM',
};

const DAY_1_MAIN_FORENOON_SESSIONS: ScientificSession[] = [
  {
    sessionNumber: 'Session I',
    speaker: 'Dr. Geetha Subramaniam',
    title: 'To be confirmed',
    format: 'Offline',
  },
  {
    sessionNumber: 'Session II',
    speaker: 'Prof. Claudiu T. Supuran',
    title: 'To be confirmed',
    format: 'Online',
  },
];

const DAY_1_MINI_HALL_1_AFTERNOON_SESSIONS: ScientificSession[] = [
  {
    sessionNumber: 'Session III',
    speaker: 'Maitri Sanghavi, M.S.',
    title: 'To be confirmed',
    format: 'Offline',
  },
  {
    sessionNumber: 'Session IV',
    speaker: 'TBA',
    title: 'To be confirmed',
    format: 'Offline',
  },
  {
    sessionNumber: 'Session V',
    speaker: 'TBA',
    title: 'To be confirmed',
    format: 'Online',
  },
];

const DAY_2_MINI_HALL_1_FORENOON_SESSIONS: ScientificSession[] = [
  {
    sessionNumber: 'Session VIII',
    speaker: 'TBA',
    title: 'TBA',
    format: 'Online',
  },
  {
    sessionNumber: 'Session IX',
    speaker: 'TBA',
    title: 'TBA',
    format: 'Offline',
  },
  {
    sessionNumber: 'Session X',
    speaker: 'TBA',
    title: 'TBA',
    format: 'Offline',
  },
];

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

// Compact Timing Chip Helper (renders only when a confirmed time range is provided)
const TimingChip: React.FC<{ timeRange?: string; className?: string }> = ({
  timeRange,
  className = '',
}) => {
  const confirmed = timeRange?.trim();
  if (!confirmed) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums shrink-0 bg-[#EDE9FE] text-[#4C1D95] border border-[#DDD6FE] ${className}`}
    >
      <Clock className="w-3 h-3 text-[#6D28D9] shrink-0" />
      <span>{confirmed}</span>
    </span>
  );
};

// Left Forenoon / Afternoon Panel
const PeriodPanel: React.FC<{
  label: 'Forenoon' | 'Afternoon';
  shortCode: '(FN)' | '(AN)';
  timeRange?: string;
  className?: string;
}> = ({ label, shortCode, timeRange, className = '' }) => {
  const isForenoon = label === 'Forenoon';
  return (
    <div
      className={`bg-white/95 border border-slate-200/85 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center shadow-2xs ${className}`}
    >
      <div
        className={`p-2.5 rounded-xl border ${
          isForenoon
            ? 'bg-amber-50 border-amber-100'
            : 'bg-orange-50 border-orange-100'
        }`}
      >
        {isForenoon ? (
          <Sun className="w-5 h-5 text-[#F59E0B]" />
        ) : (
          <Sunset className="w-5 h-5 text-[#EA580C]" />
        )}
      </div>

      <div>
        <div className="text-sm sm:text-base font-black text-[#082746] leading-tight">
          {label}
        </div>
        <div className="text-xs font-bold text-[#087E8B] mt-0.5">
          {shortCode}
        </div>
      </div>

      <TimingChip timeRange={timeRange} className="mt-0.5" />
    </div>
  );
};

// Scientific Session Row/Card matching approved mockup
const SessionCard: React.FC<{ session: ScientificSession }> = ({ session }) => {
  const normalizedTitle = session.title.trim().toLowerCase();
  const hasConfirmedTitle =
    normalizedTitle.length > 0 &&
    normalizedTitle !== 'to be confirmed' &&
    normalizedTitle !== 'tba';

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl py-2.5 px-3 sm:px-3.5 shadow-2xs hover:border-[#7554D9]/40 transition-all flex items-center justify-between gap-2.5">
      {/* Left: Session Badge + Speaker (& confirmed talk title only if provided) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-[#6B46C1] text-white text-[11px] sm:text-xs font-bold shrink-0 shadow-2xs">
          {session.sessionNumber}
        </span>

        <div className="min-w-0">
          <div className="text-[13px] sm:text-sm font-bold text-[#082746] leading-snug">
            {session.speaker}
          </div>
          {hasConfirmedTitle && (
            <div className="text-[11px] sm:text-xs text-[#556987] italic leading-snug mt-0.5">
              {session.title}
            </div>
          )}
        </div>
      </div>

      {/* Right: Confirmed Timing Chip (if any) & Format Badge */}
      <div className="flex flex-col items-end justify-center gap-1 shrink-0">
        <TimingChip timeRange={session.timeRange} />
        <FormatBadge format={session.format} />
      </div>
    </div>
  );
};

export const ProgrammeView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<1 | 2>(1);

  return (
    <div
      className="w-full min-h-screen relative overflow-x-hidden flex flex-col justify-between py-6 sm:py-8 lg:py-10 bg-[#F3F1FC]"
      style={{
        backgroundImage: `url('${IMAGES.schedulePageBg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* =====================================================================
          MAIN CONTENT CONTAINER
         ===================================================================== */}
      <div className="w-[94%] max-w-[1440px] mx-auto relative z-10 space-y-5 sm:space-y-6 my-auto">
        {/* =====================================================================
            1. PAGE HEADING & DAY SWITCHER
           ===================================================================== */}
        <div className="text-center max-w-4xl mx-auto space-y-3">
          {/* Flanked Heading matching approved mockup */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-16 h-0.5 bg-gradient-to-r from-transparent to-[#7554D9] rounded-full" />
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#082746] font-heading tracking-tight leading-tight">
              Conference Schedule
            </h1>
            <div className="w-10 sm:w-16 h-0.5 bg-gradient-to-l from-transparent to-[#22C5D9] rounded-full" />
          </div>

          {/* Day Selector - Two-option Segmented Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex flex-wrap sm:flex-nowrap items-center justify-center p-1.5 rounded-2xl sm:rounded-full bg-white/95 border border-slate-200/90 shadow-xs backdrop-blur-sm gap-1 sm:gap-0">
              <button
                type="button"
                onClick={() => setSelectedDay(1)}
                className={`px-4 sm:px-6 py-2 rounded-xl sm:rounded-full text-xs sm:text-[14px] font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  selectedDay === 1
                    ? 'bg-gradient-to-r from-[#7554D9] via-[#6842C2] to-[#5B3ABF] text-white shadow-md'
                    : 'text-[#082746] hover:text-[#7554D9] hover:bg-slate-100/70'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Day 1 – 15 February 2027</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDay(2)}
                className={`px-4 sm:px-6 py-2 rounded-xl sm:rounded-full text-xs sm:text-[14px] font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  selectedDay === 2
                    ? 'bg-gradient-to-r from-[#7554D9] via-[#6842C2] to-[#5B3ABF] text-white shadow-md'
                    : 'text-[#082746] hover:text-[#7554D9] hover:bg-slate-100/70'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Day 2 – 16 February 2027</span>
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. LARGE ROUNDED TIMETABLE CONTAINER
           ===================================================================== */}
        <div className="bg-white/90 backdrop-blur-md border border-white/95 rounded-[26px] sm:rounded-[30px] p-4 sm:p-6 lg:p-7 shadow-[0_14px_40px_rgba(15,23,60,0.08)]">
          {/* Active Day Heading inside container */}
          <div className="flex items-center gap-2.5 text-base sm:text-xl font-black text-[#082746] font-heading pb-4 sm:pb-5">
            <Calendar className="w-5 h-5 text-[#7554D9] shrink-0" />
            <span>
              {selectedDay === 1 ? 'Day 1 – 15 February 2027' : 'Day 2 – 16 February 2027'}
            </span>
          </div>

          {/* ===================================================================
              3-HALL TIMETABLE MATRIX
             =================================================================== */}
          <div className="space-y-4">
            {/* Desktop Hall Column Headers (Hidden on mobile where cards label halls) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 items-stretch">
              <div className="col-span-2" />

              {/* Main Hall Header */}
              <div className="col-span-4 bg-[#0B2546] text-white rounded-2xl p-3.5 shadow-sm flex items-center justify-center gap-2.5 text-center">
                <Landmark className="w-5 h-5 text-cyan-300 shrink-0" />
                <div>
                  <div className="text-base font-bold leading-tight">Main Hall</div>
                  <div className="text-[11px] text-cyan-200/90 font-medium">
                    Dr. T. P. Ganesan Auditorium
                  </div>
                </div>
              </div>

              {/* Mini Hall I Header */}
              <div className="col-span-3 bg-[#6B46C1] text-white rounded-2xl p-3.5 shadow-sm flex items-center justify-center gap-2 text-center">
                <Users className="w-5 h-5 text-purple-200 shrink-0" />
                <div className="text-base font-bold">Mini Hall I</div>
              </div>

              {/* Mini Hall II Header */}
              <div className="col-span-3 bg-[#0D7478] text-white rounded-2xl p-3.5 shadow-sm flex items-center justify-center gap-2 text-center">
                <Presentation className="w-5 h-5 text-teal-200 shrink-0" />
                <div className="text-base font-bold">Mini Hall II</div>
              </div>
            </div>

            {selectedDay === 1 ? (
              /* ================= DAY 1 SCHEDULE (15 February 2027) ================= */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* ----------------- DAY 1: FORENOON (FN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  <PeriodPanel
                    label="Forenoon"
                    shortCode="(FN)"
                    timeRange={PERIOD_TIMINGS.day1Forenoon}
                    className="col-span-12 lg:col-span-2"
                  />

                  {/* Main Hall (FN): Inauguration Ceremony & Sessions I, II */}
                  <div className="col-span-12 lg:col-span-4 bg-[#F8F9FE] border border-slate-200/85 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    <div className="lg:hidden flex items-center gap-2 bg-[#0B2546] text-white rounded-xl px-3 py-2 text-xs font-bold">
                      <Landmark className="w-4 h-4 text-cyan-300 shrink-0" />
                      <span>Main Hall – Dr. T. P. Ganesan Auditorium</span>
                    </div>

                    {/* Inauguration Ceremony */}
                    <div className="bg-gradient-to-r from-[#EDE9FE] via-[#F3E8FF] to-[#E6ECFF] border border-[#DDD6FE] rounded-xl py-2.5 px-3.5 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 text-[#5B21B6] font-bold text-xs sm:text-[13px]">
                        <Sparkles className="w-4 h-4 text-[#7C3AED] shrink-0" />
                        <span>Inauguration Ceremony</span>
                      </div>
                    </div>

                    {DAY_1_MAIN_FORENOON_SESSIONS.map((session) => (
                      <SessionCard key={session.sessionNumber} session={session} />
                    ))}
                  </div>

                  {/* Mini Hall I (FN): No scheduled activity */}
                  <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#F8F9FE]/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[110px] lg:min-h-[140px] gap-2">
                    <div className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-[#6B46C1]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Mini Hall I</span>
                    </div>
                    <span className="text-slate-400 font-medium text-2xl leading-none">—</span>
                  </div>

                  {/* Mini Hall II (FN): No scheduled activity */}
                  <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#F8F9FE]/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[110px] lg:min-h-[140px] gap-2">
                    <div className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-[#0D7478]">
                      <Presentation className="w-3.5 h-3.5" />
                      <span>Mini Hall II</span>
                    </div>
                    <span className="text-slate-400 font-medium text-2xl leading-none">—</span>
                  </div>
                </div>

                {/* ----------------- DAY 1: AFTERNOON (AN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  <PeriodPanel
                    label="Afternoon"
                    shortCode="(AN)"
                    timeRange={PERIOD_TIMINGS.day1Afternoon}
                    className="col-span-12 lg:col-span-2"
                  />

                  {/* Main Hall (AN): No scheduled presentation sessions; Additional Main Hall Events: Cultural Programme & Dinner */}
                  <div className="col-span-12 lg:col-span-4 bg-[#F8F9FE] border border-slate-200/85 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    <div className="lg:hidden flex items-center gap-2 bg-[#0B2546] text-white rounded-xl px-3 py-2 text-xs font-bold">
                      <Landmark className="w-4 h-4 text-cyan-300 shrink-0" />
                      <span>Main Hall – Dr. T. P. Ganesan Auditorium</span>
                    </div>

                    <div className="text-[11px] font-medium text-slate-400 text-center">
                      No scheduled presentation sessions
                    </div>

                    {/* 1. Cultural Programme */}
                    <div className="bg-gradient-to-r from-[#FAF5FF] via-white to-[#F3E8FF]/65 border border-[#E9D5FF] rounded-xl py-2.5 px-3 sm:px-3.5 shadow-2xs hover:border-[#7554D9]/40 transition-all flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-[#7C3AED] shrink-0">
                          <Music className="w-4 h-4" />
                        </div>
                        <div className="text-[13px] sm:text-sm font-bold text-[#082746] leading-snug">
                          Cultural Programme
                        </div>
                      </div>
                      <TimingChip timeRange="5:30 PM – 6:30 PM" />
                    </div>

                    {/* 2. Dinner */}
                    <div className="bg-gradient-to-r from-[#FFF7ED] via-white to-[#FFEDD5]/55 border border-[#FED7AA] rounded-xl py-2.5 px-3 sm:px-3.5 shadow-2xs hover:border-[#EA580C]/40 transition-all flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-orange-50 rounded-lg border border-orange-100 text-[#EA580C] shrink-0">
                          <Utensils className="w-4 h-4" />
                        </div>
                        <div className="text-[13px] sm:text-sm font-bold text-[#082746] leading-snug">
                          Dinner
                        </div>
                      </div>
                      <TimingChip timeRange="7:00 PM – 8:00 PM" />
                    </div>
                  </div>

                  {/* Mini Hall I (AN): Sessions III, IV, V */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE] border border-slate-200/85 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    <div className="lg:hidden flex items-center gap-2 bg-[#6B46C1] text-white rounded-xl px-3 py-2 text-xs font-bold">
                      <Users className="w-4 h-4 text-purple-200 shrink-0" />
                      <span>Mini Hall I</span>
                    </div>

                    {DAY_1_MINI_HALL_1_AFTERNOON_SESSIONS.map((session) => (
                      <SessionCard key={session.sessionNumber} session={session} />
                    ))}
                  </div>

                  {/* Mini Hall II (AN): E-Poster Presentations (Online) */}
                  <div className="col-span-12 lg:col-span-3 bg-gradient-to-br from-[#F0FDFA] via-white to-[#E0F7FA]/60 border border-[#BAE6FD]/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col items-center justify-center text-center min-h-[140px] space-y-3">
                    <div className="lg:hidden w-full flex items-center justify-center gap-2 bg-[#0D7478] text-white rounded-xl px-3 py-2 text-xs font-bold">
                      <Presentation className="w-4 h-4 text-teal-200 shrink-0" />
                      <span>Mini Hall II</span>
                    </div>

                    <div className="flex flex-col items-center space-y-2.5">
                      <div className="p-2.5 bg-cyan-50 rounded-xl border border-cyan-100 text-[#0284C7]">
                        <Presentation className="w-6 h-6" />
                      </div>
                      <div className="text-base sm:text-lg font-black text-[#082746] font-heading leading-tight">
                        E-Poster Presentations
                      </div>
                      <FormatBadge format="Online" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= DAY 2 SCHEDULE (16 February 2027) ================= */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* ----------------- DAY 2: FORENOON (FN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  <PeriodPanel
                    label="Forenoon"
                    shortCode="(FN)"
                    timeRange={PERIOD_TIMINGS.day2Forenoon}
                    className="col-span-12 lg:col-span-2"
                  />

                  {/* Main Hall (FN): PharmaQuest – Drug Discovery Hackathon */}
                  <div className="col-span-12 lg:col-span-4 bg-[#F8F9FE] border border-slate-200/85 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-center">
                    <div className="lg:hidden w-full flex items-center gap-2 bg-[#0B2546] text-white rounded-xl px-3 py-2 text-xs font-bold mb-2.5">
                      <Landmark className="w-4 h-4 text-cyan-300 shrink-0" />
                      <span>Main Hall – Dr. T. P. Ganesan Auditorium</span>
                    </div>

                    <div className="bg-gradient-to-r from-[#EFF6FF] via-white to-[#EDE9FE]/80 border border-indigo-200/85 rounded-xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2.5 bg-indigo-50 text-[#4338CA] rounded-xl border border-indigo-100 shrink-0">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div className="text-sm sm:text-[15px] font-black text-[#082746] font-heading leading-snug">
                          PharmaQuest – Drug Discovery Hackathon
                        </div>
                      </div>
                      <TimingChip timeRange="9:30 AM – 12:00 PM" />
                    </div>
                  </div>

                  {/* Mini Hall I (FN): Sessions VIII, IX, X */}
                  <div className="col-span-12 lg:col-span-3 bg-[#F8F9FE] border border-slate-200/85 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    <div className="lg:hidden flex items-center gap-2 bg-[#6B46C1] text-white rounded-xl px-3 py-2 text-xs font-bold">
                      <Users className="w-4 h-4 text-purple-200 shrink-0" />
                      <span>Mini Hall I</span>
                    </div>

                    {DAY_2_MINI_HALL_1_FORENOON_SESSIONS.map((session) => (
                      <SessionCard key={session.sessionNumber} session={session} />
                    ))}
                  </div>

                  {/* Mini Hall II (FN): Oral Presentation (Offline) */}
                  <div className="col-span-12 lg:col-span-3 bg-gradient-to-br from-[#F0FDF4]/70 via-white to-[#ECFDF5]/60 border border-[#A7F3D0]/85 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col items-center justify-center text-center min-h-[140px] space-y-2.5">
                    <div className="lg:hidden w-full flex items-center justify-center gap-2 bg-[#0D7478] text-white rounded-xl px-3 py-2 text-xs font-bold mb-1">
                      <Presentation className="w-4 h-4 text-teal-200 shrink-0" />
                      <span>Mini Hall II</span>
                    </div>

                    <div className="p-2.5 bg-emerald-50 text-[#059669] rounded-xl border border-emerald-100">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#082746] font-heading leading-tight">
                      Oral Presentation
                    </div>
                    <FormatBadge format="Offline" />
                  </div>
                </div>

                {/* ----------------- DAY 2: AFTERNOON (AN) ----------------- */}
                <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  <PeriodPanel
                    label="Afternoon"
                    shortCode="(AN)"
                    timeRange={PERIOD_TIMINGS.day2Afternoon}
                    className="col-span-12 lg:col-span-2"
                  />

                  {/* Main Hall (AN): 1. Poster Presentation (before Valedictory) -> 2. Valedictory Ceremony */}
                  <div className="col-span-12 lg:col-span-4 bg-[#F8F9FE] border border-slate-200/85 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-center">
                    <div className="lg:hidden flex items-center gap-2 bg-[#0B2546] text-white rounded-xl px-3 py-2 text-xs font-bold">
                      <Landmark className="w-4 h-4 text-cyan-300 shrink-0" />
                      <span>Main Hall – Dr. T. P. Ganesan Auditorium</span>
                    </div>

                    {/* 1. Poster Presentation (Offline, before Valedictory) */}
                    <div className="bg-gradient-to-r from-[#EFF6FF] via-white to-[#ECFEFF]/70 border border-indigo-200/90 rounded-xl py-2.5 px-3 sm:px-3.5 shadow-2xs flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-indigo-50 text-[#7554D9] rounded-lg border border-indigo-100 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-[13px] sm:text-sm font-bold text-[#082746] leading-snug">
                          Poster Presentation
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                        <TimingChip timeRange="2:00 PM – 4:00 PM" />
                        <FormatBadge format="Offline" />
                      </div>
                    </div>

                    {/* 2. Valedictory Ceremony (after Poster Presentation) */}
                    <div className="bg-gradient-to-r from-[#FAF5FF] via-white to-[#FDF4FF] border border-purple-200/85 rounded-xl py-2.5 px-3 sm:px-3.5 shadow-2xs flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-purple-50 text-[#7C3AED] rounded-lg border border-purple-100 shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="text-[13px] sm:text-sm font-bold text-[#082746] leading-snug">
                          Valedictory Ceremony
                        </div>
                      </div>
                      <TimingChip timeRange="4:00 PM – 5:00 PM" />
                    </div>
                  </div>

                  {/* Mini Hall I (AN): Empty */}
                  <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#F8F9FE]/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[120px] lg:min-h-[150px] gap-2">
                    <div className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-[#6B46C1]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Mini Hall I</span>
                    </div>
                    <span className="text-slate-400 font-medium text-2xl leading-none">—</span>
                  </div>

                  {/* Mini Hall II (AN): Empty */}
                  <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#F8F9FE]/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[120px] lg:min-h-[150px] gap-2">
                    <div className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-[#0D7478]">
                      <Presentation className="w-3.5 h-3.5" />
                      <span>Mini Hall II</span>
                    </div>
                    <span className="text-slate-400 font-medium text-2xl leading-none">—</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            3. BOTTOM PRESENTATION FORMAT LEGEND
           ===================================================================== */}
        <div className="flex justify-center pt-1">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-full py-2 px-5 sm:px-8 shadow-xs text-xs sm:text-sm font-medium text-[#45536B]">
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

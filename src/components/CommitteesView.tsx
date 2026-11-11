import React, { useState } from 'react';
import {
  CHIEF_PATRONS,
  PATRONS,
  CONFERENCE_LEADERSHIP,
  ORGANISING_COMMITTEES_DIRECTORY,
  CommitteeDirectoryItem,
} from '../data/conferenceData';
import { IMAGES } from '../lib/images';
import {
  Users,
  User,
  UserCheck,
  ChevronDown,
  BadgeCheck,
  FlaskConical,
  UtensilsCrossed,
  Bus,
  Award,
  Music,
  BookOpen,
  Handshake,
  Megaphone,
  Layers,
} from 'lucide-react';

export const CommitteesView: React.FC = () => {
  // Registration Committee expanded by default for immediate visual feedback
  const [expandedCommitteeId, setExpandedCommitteeId] = useState<string | null>('registration');

  // Helper to toggle accordion - only one committee expanded at a time
  const handleToggleCommittee = (id: string) => {
    setExpandedCommitteeId((prev) => (prev === id ? null : id));
  };

  // Distinct Lucide icon mapping matching approved organogram mockup
  const getCommitteeIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'clipboard':
        return <BadgeCheck className={className} />;
      case 'atom':
        return <FlaskConical className={className} />;
      case 'utensils':
        return <UtensilsCrossed className={className} />;
      case 'bus':
        return <Bus className={className} />;
      case 'calendar':
        return <Award className={className} />;
      case 'music':
        return <Music className={className} />;
      case 'book':
        return <BookOpen className={className} />;
      case 'trophy':
        return <Handshake className={className} />;
      case 'megaphone':
        return <Megaphone className={className} />;
      default:
        return <Users className={className} />;
    }
  };

  // Get display member count
  const getMemberCount = (committee: CommitteeDirectoryItem) => {
    return committee.displayMemberCount || committee.members.length;
  };

  return (
    <div className="w-full bg-gradient-to-b from-[#FAF8FF] via-white to-[#F0F9FD] min-h-screen relative overflow-hidden py-8 sm:py-12 lg:py-16">
      {/* Soft flowing background wave ribbons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
          <path
            d="M-50,70 C300,140 680,20 1080,85 C1290,125 1410,40 1500,70 L1500,0 L-50,0 Z"
            fill="url(#topWaveRibbonCommittees)"
            opacity="0.45"
          />
          <path
            d="M-50,830 C340,780 720,880 1100,810 C1290,770 1410,830 1500,805 L1500,900 L-50,900 Z"
            fill="url(#bottomWaveRibbonCommittees)"
            opacity="0.4"
          />
          <defs>
            <linearGradient id="topWaveRibbonCommittees" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#EDE9FA" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#8B50E8" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="bottomWaveRibbonCommittees" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C5D9" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#EDE9FA" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8B50E8" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top-Left Architectural Watermark: SRM College of Pharmacy Building */}
      <div className="absolute left-0 top-0 w-64 sm:w-80 lg:w-96 h-64 sm:h-80 lg:h-96 pointer-events-none opacity-20 sm:opacity-25 overflow-hidden mix-blend-multiply z-0">
        <img
          src={IMAGES.srmPharmacyBuilding}
          alt="SRM College of Pharmacy"
          className="w-full h-full object-cover object-left-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FAF8FF]/60 to-[#FAF8FF]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAF8FF]/60 to-[#FAF8FF]" />
      </div>

      {/* Top-Right 3D Artwork: Molecular Ring Cluster */}
      <div className="absolute right-4 sm:right-8 lg:right-12 top-6 w-36 sm:w-44 lg:w-52 h-auto pointer-events-none opacity-90 hidden sm:block z-0">
        <svg viewBox="0 0 160 160" className="w-full h-auto drop-shadow-[0_8px_20px_rgba(34,197,217,0.22)]" fill="none">
          <defs>
            <radialGradient id="molBallPurpleCommittees" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#6D28D9" />
            </radialGradient>
            <radialGradient id="molBallCyanCommittees" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </radialGradient>
          </defs>
          <line x1="60" y1="60" x2="110" y2="40" stroke="#93C5FD" strokeWidth="3.5" strokeOpacity="0.8" />
          <line x1="110" y1="40" x2="135" y2="90" stroke="#C4B5FD" strokeWidth="3.5" strokeOpacity="0.8" />
          <line x1="135" y1="90" x2="85" y2="110" stroke="#93C5FD" strokeWidth="3.5" strokeOpacity="0.8" />
          <line x1="85" y1="110" x2="60" y2="60" stroke="#C4B5FD" strokeWidth="3.5" strokeOpacity="0.8" />
          <line x1="60" y1="60" x2="25" y2="75" stroke="#93C5FD" strokeWidth="3" strokeOpacity="0.8" />
          <line x1="110" y1="40" x2="115" y2="12" stroke="#C4B5FD" strokeWidth="3" strokeOpacity="0.8" />
          <line x1="135" y1="90" x2="150" y2="115" stroke="#93C5FD" strokeWidth="3" strokeOpacity="0.8" />
          <circle cx="60" cy="60" r="14" fill="url(#molBallPurpleCommittees)" />
          <circle cx="110" cy="40" r="13" fill="url(#molBallCyanCommittees)" />
          <circle cx="135" cy="90" r="15" fill="url(#molBallPurpleCommittees)" />
          <circle cx="85" cy="110" r="13" fill="url(#molBallCyanCommittees)" />
          <circle cx="25" cy="75" r="9" fill="url(#molBallCyanCommittees)" />
          <circle cx="115" cy="12" r="8" fill="url(#molBallPurpleCommittees)" />
          <circle cx="150" cy="115" r="9" fill="url(#molBallPurpleCommittees)" />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 sm:space-y-12">
        {/* =====================================================================
            1. PAGE HEADING & INTRODUCTION (Exact Image 1 layout)
           ===================================================================== */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          {/* Eyebrow Pill: CONFERENCE LEADERSHIP & ORGANISATION */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-xs">
            <Users className="w-3.5 h-3.5" />
            <span>CONFERENCE LEADERSHIP & ORGANISATION</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-[44px] lg:text-[46px] font-black text-[#082746] font-heading tracking-tight">
            Conference Committees
          </h1>

          {/* Subtitle */}
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg md:text-[20px] font-bold text-[#087E8B] tracking-wide">
              AI-Powered Innovations in Drug Discovery and Development
            </h2>
            <div className="w-14 h-1 bg-[#22C5D9] rounded-full mx-auto" />
          </div>
        </div>

        {/* =====================================================================
            2. LEADERSHIP ORGANOGRAM (Vertically Connected Hierarchy)
           ===================================================================== */}
        <div className="w-full space-y-0">
          {/* -------------------------------------------------------------------
              LEVEL 1: CHIEF PATRONS (Deep Navy Panel)
             ------------------------------------------------------------------- */}
          <div className="relative pt-3.5">
            {/* Top Centred Badge overlapping border */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#082746] border border-[#1E3E68] text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-md">
                <Users className="w-3.5 h-3.5 text-[#22C5D9]" />
                <span>CHIEF PATRONS</span>
              </div>
            </div>

            {/* Deep Navy Gradient Card */}
            <div className="bg-gradient-to-r from-[#0C2444] via-[#0E2E56] to-[#0A1F3B] border border-[#1E3E68] rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-7 pt-7 sm:pt-8 text-white">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/60 text-center gap-4 md:gap-0">
                {CHIEF_PATRONS.map((patron, idx) => (
                  <div key={idx} className="px-3 sm:px-4 py-3 md:py-0 first:pt-0 md:first:pt-0 last:pb-0 md:last:pb-0 space-y-1">
                    <h3 className="text-lg sm:text-[20px] font-black text-white font-heading">
                      {patron.name}
                    </h3>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">
                      {patron.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              CONNECTOR 1 -> 2 (Vertical line with circular violet arrow node)
             ------------------------------------------------------------------- */}
          <div className="flex flex-col items-center justify-center py-0.5 sm:py-1 relative z-10">
            <div className="w-0.5 h-4 sm:h-5 bg-[#7554D9]/40" />
            <div className="w-6 h-6 rounded-full bg-[#7554D9] text-white flex items-center justify-center shadow-md border-2 border-white -my-1 z-10">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <div className="w-0.5 h-4 sm:h-5 bg-[#7554D9]/40" />
          </div>

          {/* -------------------------------------------------------------------
              LEVEL 2: PATRONS (Light Lavender Panel)
             ------------------------------------------------------------------- */}
          <div className="relative pt-3.5">
            {/* Top Centred Badge overlapping border */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#7554D9] text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-md border border-white/30">
                <Users className="w-3.5 h-3.5 text-white" />
                <span>PATRONS</span>
              </div>
            </div>

            {/* Light Lavender Card */}
            <div className="bg-gradient-to-r from-[#F5F2FE] via-[#FAF8FF] to-[#EDE9FA] border border-[#DDD6FE] rounded-2xl sm:rounded-3xl shadow-xs p-5 sm:p-7 pt-7 sm:pt-8 text-[#082746]">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DDD6FE] text-center gap-4 md:gap-0">
                {PATRONS.map((patron, idx) => (
                  <div key={idx} className="px-3 sm:px-4 py-3 md:py-0 first:pt-0 md:first:pt-0 last:pb-0 md:last:pb-0 space-y-1">
                    <h3 className="text-lg sm:text-[20px] font-black text-[#082746] font-heading">
                      {patron.name}
                    </h3>
                    <p className="text-sm text-[#45536B] font-medium leading-relaxed">
                      {patron.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              CONNECTOR 2 -> 3 (Vertical line with circular violet arrow node)
             ------------------------------------------------------------------- */}
          <div className="flex flex-col items-center justify-center py-0.5 sm:py-1 relative z-10">
            <div className="w-0.5 h-4 sm:h-5 bg-[#7554D9]/40" />
            <div className="w-6 h-6 rounded-full bg-[#7554D9] text-white flex items-center justify-center shadow-md border-2 border-white -my-1 z-10">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <div className="w-0.5 h-4 sm:h-5 bg-[#7554D9]/40" />
          </div>

          {/* -------------------------------------------------------------------
              LEVEL 3: CONFERENCE CONVENOR (Centered Light Cyan Panel)
             ------------------------------------------------------------------- */}
          <div className="max-w-2xl mx-auto w-full relative pt-3.5">
            {/* Top Centred Badge overlapping border */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[#087E8B] to-[#06B6D4] text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-md">
                <UserCheck className="w-3.5 h-3.5" />
                <span>CONFERENCE CONVENOR</span>
              </div>
            </div>

            {/* Light Cyan Card */}
            <div className="bg-gradient-to-r from-[#E6F8FA] via-[#F2FCFD] to-[#E0F7FA] border border-[#A5F3FC] rounded-2xl shadow-xs p-4 sm:p-5 pt-6 sm:pt-7 flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#CCFBF1] text-[#087E8B] flex items-center justify-center border border-[#99F6E4] shrink-0 shadow-2xs">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-center sm:text-left space-y-0.5">
                <h3 className="text-xl sm:text-[22px] font-black text-[#082746] font-heading">
                  {CONFERENCE_LEADERSHIP.convenor.name}
                </h3>
                <p className="text-sm font-semibold text-[#087E8B]">
                  {CONFERENCE_LEADERSHIP.convenor.designation}
                </p>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              CONNECTOR 3 -> 4 (Vertical line with circular violet arrow node)
             ------------------------------------------------------------------- */}
          <div className="flex flex-col items-center justify-center py-0.5 sm:py-1 relative z-10">
            <div className="w-0.5 h-4 sm:h-5 bg-[#7554D9]/40" />
            <div className="w-6 h-6 rounded-full bg-[#7554D9] text-white flex items-center justify-center shadow-md border-2 border-white -my-1 z-10">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <div className="w-0.5 h-4 sm:h-5 bg-[#7554D9]/40" />
          </div>

          {/* -------------------------------------------------------------------
              LEVEL 4: ORGANISING SECRETARY (Centered Light Violet Panel)
             ------------------------------------------------------------------- */}
          <div className="max-w-2xl mx-auto w-full relative pt-3.5">
            {/* Top Centred Badge overlapping border */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[#7554D9] to-[#8B50E8] text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-md">
                <User className="w-3.5 h-3.5" />
                <span>ORGANISING SECRETARY</span>
              </div>
            </div>

            {/* Light Violet Card */}
            <div className="bg-gradient-to-r from-[#F3EFFF] via-[#FAF8FF] to-[#EFE9FE] border border-[#DDD6FE] rounded-2xl shadow-xs p-4 sm:p-5 pt-6 sm:pt-7 flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#EDE9FE] text-[#7554D9] flex items-center justify-center border border-[#DDD6FE] shrink-0 shadow-2xs">
                <User className="w-6 h-6" />
              </div>
              <div className="text-center sm:text-left space-y-0.5">
                <h3 className="text-xl sm:text-[22px] font-black text-[#082746] font-heading">
                  {CONFERENCE_LEADERSHIP.organisingSecretary.name}
                </h3>
                <p className="text-sm font-semibold text-[#7554D9]">
                  {CONFERENCE_LEADERSHIP.organisingSecretary.designation}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="w-full border-t border-slate-200/90 pt-2" />

        {/* =====================================================================
            3. ORGANISING COMMITTEES (Expandable Directory)
           ===================================================================== */}
        <div className="space-y-5">
          {/* Section Header */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-[32px] font-black text-[#082746] font-heading tracking-tight">
                Organising Committees
              </h2>
              <p className="text-xs sm:text-sm text-[#45536B] font-medium mt-0.5">
                Dedicated teams coordinating the scientific, academic and operational activities of the conference.
              </p>
            </div>
          </div>

          {/* 7 Compact Full-Width Expandable Rows */}
          <div className="space-y-2.5">
            {ORGANISING_COMMITTEES_DIRECTORY.map((committee) => {
              const isExpanded = expandedCommitteeId === committee.id;
              const memberCount = getMemberCount(committee);

              return (
                <div
                  key={committee.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Clickable Committee Row */}
                  <button
                    type="button"
                    onClick={() => handleToggleCommittee(committee.id)}
                    aria-expanded={isExpanded}
                    className="w-full p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors cursor-pointer hover:bg-slate-50/60"
                  >
                    {/* Left: Number + Icon + Name */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Number badge */}
                      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F5F2FE] text-[#7554D9] font-black font-mono text-xs sm:text-sm flex items-center justify-center shrink-0 border border-[#DDD6FE]/60">
                        {committee.number}
                      </span>

                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#087E8B] flex items-center justify-center shrink-0 border border-teal-100/60">
                        {getCommitteeIcon(committee.iconName, 'w-4 h-4')}
                      </div>

                      {/* Committee Name */}
                      <span className="text-base sm:text-[18px] font-extrabold text-[#082746] font-heading truncate">
                        {committee.name}
                      </span>
                    </div>

                    {/* Middle: Convenor Name (where provided) */}
                    <div className="flex items-center gap-2 sm:gap-3 sm:mx-4 shrink-0 pl-12 sm:pl-0">
                      {committee.convenor ? (
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-px bg-slate-200 hidden md:inline-block" />
                          <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#7554D9] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                            Convenor
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold text-[#082746]">
                            {committee.convenor}
                          </span>
                        </div>
                      ) : (
                        <div className="hidden md:block w-32" />
                      )}
                    </div>

                    {/* Right: Member count + Chevron */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#45536B]">
                        <Users className="w-4 h-4 text-[#7554D9]" />
                        <span>{memberCount} Members</span>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 bg-[#EDE9FE] text-[#7554D9]' : 'text-slate-400 hover:text-[#7554D9]'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* Expandable Member Details Drawer */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-gradient-to-b from-[#FAF8FF]/40 to-white p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
                      {/* Convenor Highlight Banner (when convenor exists) */}
                      {committee.convenor && (
                        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-[#E0F7FA]/70 via-[#F0FCFD] to-white border border-[#22C5D9]/30 flex items-center gap-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#087E8B] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                            Convenor
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-[#082746]">
                            {committee.convenor}
                          </span>
                        </div>
                      )}

                      {/* Members Grid */}
                      <div className="space-y-2.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#EDE9FE] text-[#7554D9] text-xs font-bold tracking-wide">
                          <Users className="w-3.5 h-3.5" />
                          <span>Committee Members ({committee.members.length})</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                          {committee.members.map((memberName, mIdx) => (
                            <div
                              key={mIdx}
                              className="p-3 rounded-xl bg-slate-50/90 hover:bg-[#F5F2FE]/60 border border-slate-200/70 transition-all flex items-center gap-2.5"
                            >
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7554D9] to-[#22C5D9] shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-[#082746] leading-snug">
                                {memberName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

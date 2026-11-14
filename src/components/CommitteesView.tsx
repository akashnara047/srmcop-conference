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
} from 'lucide-react';

export const CommitteesView: React.FC = () => {
  // All committee accordions collapsed by default on page load
  const [expandedCommitteeId, setExpandedCommitteeId] = useState<string | null>(null);

  // Helper to toggle accordion - only one committee expanded at a time
  const handleToggleCommittee = (id: string) => {
    setExpandedCommitteeId((prev) => (prev === id ? null : id));
  };

  // Distinct Lucide icon mapping matching approved organogram mockup
  const getCommitteeIcon = (iconName: string, className = 'w-4 h-4') => {
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
    <div
      className="w-full bg-[#FAF8FF] bg-cover bg-center bg-no-repeat min-h-screen relative overflow-x-hidden py-5 sm:py-6 lg:py-7"
      style={{
        backgroundImage: `url(${IMAGES.committeesPageBg})`,
      }}
    >
      {/* Subtle responsive readability veil on narrow viewports */}
      <div className="absolute inset-0 bg-white/15 sm:bg-transparent pointer-events-none z-0" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-5 sm:space-y-6">
        {/* =====================================================================
            1. PAGE HEADING & INTRODUCTION (Compact for 100% zoom)
           ===================================================================== */}
        <div className="text-center max-w-3xl mx-auto space-y-1.5">
          {/* Eyebrow Pill: CONFERENCE LEADERSHIP & ORGANISATION */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white text-[10.5px] sm:text-[11px] font-bold tracking-wider uppercase shadow-xs">
            <Users className="w-3 h-3" />
            <span>CONFERENCE LEADERSHIP & ORGANISATION</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-black text-[#082746] font-heading tracking-tight leading-tight">
            Conference Committees
          </h1>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <h2 className="text-sm sm:text-base lg:text-[17px] font-bold text-[#087E8B] tracking-wide">
              AI-Powered Innovations in Drug Discovery and Development
            </h2>
            <div className="w-12 h-0.5 bg-[#22C5D9] rounded-full mx-auto" />
          </div>
        </div>

        {/* =====================================================================
            2. LEADERSHIP ORGANOGRAM (Compact Vertically Connected Hierarchy)
           ===================================================================== */}
        <div className="w-full space-y-0">
          {/* -------------------------------------------------------------------
              LEVEL 1: CHIEF PATRONS (Deep Navy Panel, 3 Columns)
             ------------------------------------------------------------------- */}
          <div className="relative pt-2.5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-[#082746] border border-[#1E3E68] text-white text-[10.5px] font-bold tracking-wider uppercase shadow-sm whitespace-nowrap">
                <Users className="w-3 h-3 text-[#22C5D9]" />
                <span>CHIEF PATRONS</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#0C2444] via-[#0E2E56] to-[#0A1F3B] border border-[#1E3E68] rounded-2xl shadow-lg px-4 py-3.5 sm:px-6 sm:py-4 pt-5 sm:pt-5 text-white">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/60 text-center gap-2.5 md:gap-0">
                {CHIEF_PATRONS.map((patron, idx) => (
                  <div key={idx} className="px-2 sm:px-3.5 pt-2.5 md:pt-0 first:pt-0 space-y-0.5">
                    <h3 className="text-[15.5px] sm:text-[17px] font-extrabold text-white font-heading leading-snug">
                      {patron.name}
                    </h3>
                    <p className="text-xs sm:text-[12.5px] text-slate-300 font-medium leading-snug">
                      {patron.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slim Connector 1 -> 2 */}
          <div className="flex flex-col items-center justify-center relative z-10" aria-hidden="true">
            <div className="w-0.5 h-2.5 bg-[#7554D9]/35" />
            <div className="w-5 h-5 rounded-full bg-[#7554D9] text-white flex items-center justify-center shadow-xs border border-white -my-0.5 z-10">
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="w-0.5 h-2.5 bg-[#7554D9]/35" />
          </div>

          {/* -------------------------------------------------------------------
              LEVEL 2: PATRONS (Light Lavender Panel, 3 Columns)
             ------------------------------------------------------------------- */}
          <div className="relative pt-2.5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-[#7554D9] text-white text-[10.5px] font-bold tracking-wider uppercase shadow-sm border border-white/30 whitespace-nowrap">
                <Users className="w-3 h-3 text-white" />
                <span>PATRONS</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#F5F2FE] via-[#FAF8FF] to-[#EDE9FA] border border-[#DDD6FE] rounded-2xl shadow-xs px-4 py-3.5 sm:px-6 sm:py-4 pt-5 sm:pt-5 text-[#082746]">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DDD6FE] text-center gap-2.5 md:gap-0">
                {PATRONS.map((patron, idx) => (
                  <div key={idx} className="px-2 sm:px-3.5 pt-2.5 md:pt-0 first:pt-0 space-y-0.5">
                    <h3 className="text-[15.5px] sm:text-[17px] font-extrabold text-[#082746] font-heading leading-snug">
                      {patron.name}
                    </h3>
                    <p className="text-xs sm:text-[12.5px] text-[#45536B] font-medium leading-snug">
                      {patron.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slim Connector 2 -> 3 */}
          <div className="flex flex-col items-center justify-center relative z-10" aria-hidden="true">
            <div className="w-0.5 h-2.5 bg-[#7554D9]/35" />
            <div className="w-5 h-5 rounded-full bg-[#7554D9] text-white flex items-center justify-center shadow-xs border border-white -my-0.5 z-10">
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="w-0.5 h-2.5 bg-[#7554D9]/35" />
          </div>

          {/* -------------------------------------------------------------------
              LEVEL 3: CONFERENCE CONVENOR & ORGANISING SECRETARY (Side-by-Side)
             ------------------------------------------------------------------- */}
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 items-stretch">
            {/* Conference Convenor Card (Cyan Accent) */}
            <div className="relative pt-2.5 flex">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-[#087E8B] to-[#06B6D4] text-white text-[10.5px] font-bold tracking-wider uppercase shadow-sm whitespace-nowrap">
                  <UserCheck className="w-3 h-3" />
                  <span>CONFERENCE CONVENOR</span>
                </div>
              </div>

              <div className="w-full bg-gradient-to-r from-[#E6F8FA] via-[#F2FCFD] to-[#E0F7FA] border border-[#A5F3FC] rounded-2xl shadow-xs px-4 py-3.5 pt-5 flex items-center justify-center md:justify-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#CCFBF1] text-[#087E8B] flex items-center justify-center border border-[#99F6E4] shrink-0 shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <h3 className="text-base sm:text-[18px] font-black text-[#082746] font-heading leading-tight">
                    {CONFERENCE_LEADERSHIP.convenor.name}
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#087E8B] leading-snug">
                    {CONFERENCE_LEADERSHIP.convenor.designation}
                  </p>
                </div>
              </div>
            </div>

            {/* Organising Secretary Card (Violet Accent) */}
            <div className="relative pt-2.5 flex">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-[#7554D9] to-[#8B50E8] text-white text-[10.5px] font-bold tracking-wider uppercase shadow-sm whitespace-nowrap">
                  <User className="w-3 h-3" />
                  <span>ORGANISING SECRETARY</span>
                </div>
              </div>

              <div className="w-full bg-gradient-to-r from-[#F3EFFF] via-[#FAF8FF] to-[#EFE9FE] border border-[#DDD6FE] rounded-2xl shadow-xs px-4 py-3.5 pt-5 flex items-center justify-center md:justify-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#7554D9] flex items-center justify-center border border-[#DDD6FE] shrink-0 shadow-2xs">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5 min-w-0">
                  <h3 className="text-base sm:text-[18px] font-black text-[#082746] font-heading leading-tight">
                    {CONFERENCE_LEADERSHIP.organisingSecretary.name}
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#7554D9] leading-snug">
                    {CONFERENCE_LEADERSHIP.organisingSecretary.designation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="w-full border-t border-slate-200/80" />

        {/* =====================================================================
            3. ORGANISING COMMITTEES (Compact Expandable Directory - Collapsed by Default)
           ===================================================================== */}
        <div className="space-y-3.5">
          {/* Section Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-[#082746] font-heading tracking-tight leading-tight">
                Organising Committees
              </h2>
              <p className="text-xs sm:text-[13px] text-[#45536B] font-medium">
                Dedicated teams coordinating the scientific, academic and operational activities of the conference.
              </p>
            </div>
          </div>

          {/* 9 Compact Full-Width Accordion Rows (All Collapsed Initially) */}
          <div className="space-y-2">
            {ORGANISING_COMMITTEES_DIRECTORY.map((committee) => {
              const isExpanded = expandedCommitteeId === committee.id;
              const memberCount = getMemberCount(committee);

              return (
                <div
                  key={committee.id}
                  className="bg-white/95 backdrop-blur-xs rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Clickable Committee Row */}
                  <button
                    type="button"
                    onClick={() => handleToggleCommittee(committee.id)}
                    aria-expanded={isExpanded}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 text-left transition-colors cursor-pointer hover:bg-slate-50/70"
                  >
                    {/* Left: Number + Icon + Name */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <span className="w-8 h-8 rounded-lg bg-[#F5F2FE] text-[#7554D9] font-black font-mono text-xs flex items-center justify-center shrink-0 border border-[#DDD6FE]/60">
                        {committee.number}
                      </span>

                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#087E8B] flex items-center justify-center shrink-0 border border-teal-100/70">
                        {getCommitteeIcon(committee.iconName, 'w-3.5 h-3.5')}
                      </div>

                      <span className="text-sm sm:text-[15.5px] font-extrabold text-[#082746] font-heading truncate">
                        {committee.name}
                      </span>
                    </div>

                    {/* Middle + Right: Convenor (where provided) + Member count + Chevron */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between md:justify-end gap-2.5 sm:gap-4 shrink-0 pl-10 md:pl-0">
                      {committee.convenor ? (
                        <div className="flex items-center gap-2 md:w-[240px] lg:w-[260px]">
                          <span className="h-3.5 w-px bg-slate-200 hidden md:inline-block" />
                          <span className="px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7554D9] text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Convenor
                          </span>
                          <span className="text-xs sm:text-[13px] font-extrabold text-[#082746] truncate">
                            {committee.convenor}
                          </span>
                        </div>
                      ) : (
                        <div className="hidden md:block md:w-[240px] lg:w-[260px]" />
                      )}

                      <div className="flex items-center gap-2.5 shrink-0 ml-auto md:ml-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#45536B] min-w-[84px] justify-end">
                          <Users className="w-3.5 h-3.5 text-[#7554D9]" />
                          <span>{memberCount} Members</span>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 bg-[#EDE9FE] text-[#7554D9]' : 'text-slate-400 hover:text-[#7554D9]'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expandable Member Details Drawer (Rendered Only When Clicked Open) */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-gradient-to-b from-[#FAF8FF]/50 to-white p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-200">
                      {/* Convenor Highlight Banner (when convenor exists) */}
                      {committee.convenor && (
                        <div className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#E0F7FA]/70 via-[#F0FCFD] to-white border border-[#22C5D9]/30 flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#087E8B] text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                            Convenor
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold text-[#082746]">
                            {committee.convenor}
                          </span>
                        </div>
                      )}

                      {/* Members Grid */}
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#EDE9FE] text-[#7554D9] text-[11px] font-bold tracking-wide">
                          <Users className="w-3 h-3" />
                          <span>Committee Members ({committee.members.length})</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {committee.members.map((memberName, mIdx) => (
                            <div
                              key={mIdx}
                              className="px-3 py-2 rounded-xl bg-slate-50/90 hover:bg-[#F5F2FE]/60 border border-slate-200/70 transition-all flex items-center gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#7554D9] to-[#22C5D9] shrink-0" />
                              <span className="text-xs sm:text-[13px] font-bold text-[#082746] leading-snug">
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

import React, { useEffect } from 'react';
import {
  X,
  Monitor,
  Mic,
  Presentation,
  Clock,
  Layers,
  Users,
  FileCheck2,
  Hash,
  Ruler,
  ListOrdered,
  Palette,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Columns3,
  Globe,
} from 'lucide-react';
import {
  EPOSTER_PRESENTATION_GUIDELINES,
  ORAL_PRESENTATION_GUIDELINES,
  POSTER_PRESENTATION_GUIDELINES,
} from '../data/presentationGuidelinesData';

interface PresentationGuidelinesModalProps {
  format: 'eposter' | 'oral' | 'poster' | null;
  onClose: () => void;
}

export const PresentationGuidelinesModal: React.FC<PresentationGuidelinesModalProps> = ({
  format,
  onClose,
}) => {
  useEffect(() => {
    if (!format) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [format, onClose]);

  if (!format) return null;

  const isEposter = format === 'eposter';
  const isOral = format === 'oral';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="presentation-guidelines-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl my-auto relative border border-slate-200/90 text-[#45536B] animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#EDE9FE] to-[#E0F2FE] border border-indigo-100 flex items-center justify-center text-[#6366F1] shadow-xs shrink-0">
              {isEposter ? (
                <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-[#0284C7]" />
              ) : isOral ? (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-[#6366F1]" />
              ) : (
                <Presentation className="w-5 h-5 sm:w-6 sm:h-6 text-[#6366F1]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="presentation-guidelines-modal-title"
                  className="font-['Plus_Jakarta_Sans',sans-serif] text-lg sm:text-xl font-extrabold text-[#082746] tracking-tight"
                >
                  {isEposter
                    ? EPOSTER_PRESENTATION_GUIDELINES.title
                    : isOral
                    ? ORAL_PRESENTATION_GUIDELINES.title
                    : POSTER_PRESENTATION_GUIDELINES.title}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-white shadow-2xs ${
                    isEposter ? 'bg-[#0284C7]' : 'bg-[#10B981]'
                  }`}
                >
                  {isEposter ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p
                className={`font-['Inter',sans-serif] text-xs sm:text-[13px] font-semibold mt-0.5 ${
                  isEposter ? 'text-[#0284C7]' : 'text-[#6366F1]'
                }`}
              >
                {isEposter
                  ? EPOSTER_PRESENTATION_GUIDELINES.subtitle
                  : isOral
                  ? ORAL_PRESENTATION_GUIDELINES.subtitle
                  : POSTER_PRESENTATION_GUIDELINES.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close guidelines modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {isEposter ? (
            <>
              {/* Online Mode & Duration Summary Panel */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F0F9FF] via-[#F5F3FF] to-[#ECFEFF] border border-sky-200/80 space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white rounded-xl border border-sky-200/80 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[10.5px] font-semibold text-[#0284C7] uppercase tracking-wider">
                      Presentation Mode
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-extrabold text-[#082746] mt-0.5">
                      {EPOSTER_PRESENTATION_GUIDELINES.mode}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-indigo-100 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Presentation Duration
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-extrabold text-[#082746] mt-0.5">
                      {EPOSTER_PRESENTATION_GUIDELINES.timing.presentationDuration}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-indigo-100 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Question &amp; Answer
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-extrabold text-[#082746] mt-0.5">
                      {EPOSTER_PRESENTATION_GUIDELINES.timing.qaDuration}
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-[#E0F2FE] to-[#EDE9FE] rounded-xl border border-sky-200 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[10.5px] font-semibold text-[#0369A1] uppercase tracking-wider">
                      Total Time
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-extrabold text-[#082746] mt-0.5">
                      {EPOSTER_PRESENTATION_GUIDELINES.timing.totalTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. E-Poster Preparation */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9F8FE] border border-[#E9E4F8] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#7554D9]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      1. E-Poster Preparation
                    </h4>
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155]">
                  {EPOSTER_PRESENTATION_GUIDELINES.section1Preparation.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 bg-white/95 p-2.5 rounded-xl border border-purple-100/70"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7554D9] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Recommended Scientific Content */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4FCFD] border border-[#D5F3F7] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E0F7FA] flex items-center justify-center text-[#087E8B] shrink-0">
                    <Columns3 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#087E8B]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      2. Recommended Scientific Content
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-[#45536B]">
                  Organise the scientific content across the three columns of the template:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {EPOSTER_PRESENTATION_GUIDELINES.section2Columns.map((col, colIdx) => (
                    <div
                      key={colIdx}
                      className="bg-white rounded-xl border border-[#CBEBF0] p-3.5 space-y-2"
                    >
                      <h5 className="font-['Plus_Jakarta_Sans',sans-serif] text-xs font-extrabold text-[#087E8B] border-b border-slate-100 pb-2">
                        {col.heading}
                      </h5>
                      <ul className="space-y-1.5 text-xs text-[#334155]">
                        {col.items.map((entry, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] shrink-0 mt-1.5" />
                            <span className="leading-snug">{entry}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="bg-white/90 rounded-xl border border-[#CBEBF0] p-3 flex items-start gap-2 text-xs text-[#334155]">
                  <AlertCircle className="w-4 h-4 text-[#087E8B] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{EPOSTER_PRESENTATION_GUIDELINES.section2Note}</span>
                </div>
              </div>

              {/* 3. Author and Presentation Details */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9F8FE] border border-[#E9E4F8] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#7554D9]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      3. Author and Presentation Details
                    </h4>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-[#334155]">
                  {EPOSTER_PRESENTATION_GUIDELINES.section3AuthorDetails.map((rule, idx) => {
                    const isCodeRule = rule.includes('Presentation Code');
                    return (
                      <li
                        key={idx}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                          isCodeRule
                            ? 'bg-amber-50/90 border-amber-200 text-amber-950 font-semibold'
                            : 'bg-white/95 border-purple-100/70'
                        }`}
                      >
                        {isCodeRule ? (
                          <Hash className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-[#EDE9FA] text-[#7554D9] font-bold text-[10.5px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                        )}
                        <span className="leading-relaxed">{rule}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* 4. Online Presentation */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F0F9FF] border border-sky-200/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-[#0284C7] shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#0284C7]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      4. Online Presentation
                    </h4>
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155]">
                  {EPOSTER_PRESENTATION_GUIDELINES.section4OnlinePresentation.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-sky-100"
                    >
                      <Clock className="w-3.5 h-3.5 text-[#0284C7] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 5. Important Instructions */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6366F1] shrink-0">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#6366F1]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      5. Important Instructions
                    </h4>
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155]">
                  {EPOSTER_PRESENTATION_GUIDELINES.section5ImportantInstructions.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200/70"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#6366F1] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : isOral ? (
            <>
              {/* A. Presentation Duration */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9F8FE] border border-[#E9E4F8] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#7554D9]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      A. Presentation Duration
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white rounded-xl border border-purple-100 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Presentation
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-lg font-extrabold text-[#082746] mt-0.5">
                      {ORAL_PRESENTATION_GUIDELINES.duration.presentationMinutes}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-purple-100 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Question &amp; Answer Session
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-lg font-extrabold text-[#082746] mt-0.5">
                      {ORAL_PRESENTATION_GUIDELINES.duration.qaMinutes}
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-[#EDE9FA]/80 to-[#E0F7FA]/80 rounded-xl border border-indigo-200/70 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[11px] font-semibold text-[#4F46E5] uppercase tracking-wider">
                      Total Allocated Time
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-lg font-extrabold text-[#082746] mt-0.5">
                      {ORAL_PRESENTATION_GUIDELINES.duration.totalMinutes}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] text-[#45536B] leading-relaxed">
                  {ORAL_PRESENTATION_GUIDELINES.duration.note}
                </p>
              </div>

              {/* B. Official Slide Structure */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4FCFD] border border-[#D5F3F7] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E0F7FA] flex items-center justify-center text-[#087E8B] shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#087E8B]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      B. Official Slide Structure (9-Slide Sequence)
                    </h4>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#CBEBF0] bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#ECFAFC] border-b border-[#CBEBF0] text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">
                        <th className="py-2.5 px-3 sm:px-4 w-24 shrink-0">Slide</th>
                        <th className="py-2.5 px-3 sm:px-4">Required Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                      {ORAL_PRESENTATION_GUIDELINES.slideStructure.map((item) => (
                        <tr key={item.slideNumber} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4 font-bold text-[#087E8B] whitespace-nowrap align-top">
                            Slide {item.slideNumber}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 align-top">
                            <p className="font-semibold text-[#082746]">{item.sectionTitle}</p>
                            <p className="text-[11.5px] text-[#64748B] mt-0.5 leading-snug">
                              {item.purpose}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white/90 rounded-xl border border-[#CBEBF0] p-3 space-y-1.5">
                  {ORAL_PRESENTATION_GUIDELINES.templateIntegrityRules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#334155]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#087E8B] shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* C. Author and Affiliation Details */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9F8FE] border border-[#E9E4F8] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#7554D9]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      C. Author and Affiliation Details
                    </h4>
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155]">
                  {ORAL_PRESENTATION_GUIDELINES.authorRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-purple-100/70"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#EDE9FA] text-[#7554D9] font-bold text-[10.5px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* D. Scientific Content and Formatting */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6366F1] shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#6366F1]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      D. Scientific Content and Formatting
                    </h4>
                  </div>
                </div>

                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155]">
                  {ORAL_PRESENTATION_GUIDELINES.formattingAndContentRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/70"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-[#4F46E5] font-bold text-[10.5px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* E. Presentation Code – Abstract ID */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/75 border border-amber-200/90 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-amber-600" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      E. Presentation Code – Abstract ID
                    </h4>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{ORAL_PRESENTATION_GUIDELINES.presentationCodeRules.headline}</span>
                </p>

                <ul className="space-y-1.5 text-xs text-amber-950/90 pl-1">
                  {ORAL_PRESENTATION_GUIDELINES.presentationCodeRules.points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* A. Poster Specifications */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9F8FE] border border-[#E9E4F8] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FA] flex items-center justify-center text-[#7554D9] shrink-0">
                    <Ruler className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#7554D9]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      A. Poster Specifications
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-gradient-to-r from-[#EDE9FA]/85 to-[#E0F7FA]/85 rounded-xl border border-indigo-200/80 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[11px] font-semibold text-[#4F46E5] uppercase tracking-wider">
                      Poster Dimensions
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-extrabold text-[#082746] mt-0.5">
                      {POSTER_PRESENTATION_GUIDELINES.specifications.dimensions}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-purple-100 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Orientation
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-extrabold text-[#082746] mt-0.5">
                      {POSTER_PRESENTATION_GUIDELINES.specifications.orientation}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-purple-100 px-3.5 py-2.5 flex flex-col">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Author Limit
                    </span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-extrabold text-[#082746] mt-0.5">
                      {POSTER_PRESENTATION_GUIDELINES.specifications.maxAuthors}
                    </span>
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155]">
                  {POSTER_PRESENTATION_GUIDELINES.specifications.points.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-purple-100/70"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7554D9] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* B. Required Poster Sections */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4FCFD] border border-[#D5F3F7] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E0F7FA] flex items-center justify-center text-[#087E8B] shrink-0">
                    <ListOrdered className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#087E8B]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      B. Required Poster Sections
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {POSTER_PRESENTATION_GUIDELINES.requiredSections.map((section, idx) => (
                    <div
                      key={section}
                      className="flex items-center gap-2.5 bg-white px-3 py-2 rounded-xl border border-[#CBEBF0]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#E0F7FA] text-[#087E8B] font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-[#082746]">{section}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white/90 rounded-xl border border-[#CBEBF0] p-3 flex items-start gap-2 text-xs text-[#082746] font-medium">
                  <AlertCircle className="w-4 h-4 text-[#087E8B] shrink-0 mt-0.5" />
                  <span>{POSTER_PRESENTATION_GUIDELINES.reservedSpacesNote}</span>
                </div>
              </div>

              {/* C. Poster Content and Design */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6366F1] shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[#6366F1]" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      C. Poster Content and Design
                    </h4>
                  </div>
                </div>

                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155]">
                  {POSTER_PRESENTATION_GUIDELINES.contentAndDesignRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/70"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-[#4F46E5] font-bold text-[10.5px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* D. Presentation Code – Abstract ID */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/75 border border-amber-200/90 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-amber-600" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      D. Presentation Code – Abstract ID
                    </h4>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{POSTER_PRESENTATION_GUIDELINES.presentationCodeRules.headline}</span>
                </p>

                <ul className="space-y-1.5 text-xs text-amber-950/90 pl-1">
                  {POSTER_PRESENTATION_GUIDELINES.presentationCodeRules.points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* E. Final Poster Preparation */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/65 border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-emerald-600" />
                    <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base font-bold text-[#082746]">
                      E. Final Poster Preparation
                    </h4>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-[#1E293B]">
                  {POSTER_PRESENTATION_GUIDELINES.finalPreparationChecklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer — Close Button Only */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-xs sm:text-[13px] font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#06B6D4] hover:opacity-95 transition-all cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

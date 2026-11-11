import React, { useState } from 'react';
import { INVITED_SPEAKERS, PRESENTATION_FORMATS, Speaker } from '../data/conferenceData';
import { ExternalLink, Edit3, Check, MapPin, Users, Presentation, Award, BookOpen } from 'lucide-react';
import { SectionBackToTop } from './BackToTop';

export const SpeakersView: React.FC = () => {
  const [speakersList, setSpeakersList] = useState<Speaker[]>(INVITED_SPEAKERS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAffiliation, setEditAffiliation] = useState('');
  const [editDomain, setEditDomain] = useState('');

  const handleStartEdit = (speaker: Speaker) => {
    setEditingId(speaker.id);
    setEditAffiliation(speaker.affiliationPlaceholder);
    setEditDomain(speaker.domain);
  };

  const handleSaveEdit = (id: string) => {
    setSpeakersList((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, affiliationPlaceholder: editAffiliation, domain: editDomain }
          : s
      )
    );
    setEditingId(null);
  };

  return (
    <div className="w-full">
      {/* SECTION 1: EDITORIAL PLENARY SPEAKERS */}
      <section className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] bg-gradient-to-b from-[#EDE9FA]/40 via-[#F8FAFD] to-white flex flex-col justify-between py-10 sm:py-12 border-b border-[#E2E7F0] bg-scientific-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-center space-y-8">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white border border-[#7554D9]/30 rounded-full shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#7554D9]" />
              <span className="text-[11px] font-bold tracking-widest text-[#7554D9] uppercase">
                PLENARY FACULTY & SCIENTIFIC LUMINARIES
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-black text-[#082746] font-heading">
              Invited Plenary Speakers
            </h1>
            <p className="text-sm sm:text-base text-[#45536B] leading-relaxed">
              Distinguished keynote plenary speakers delivering addresses across the two-day congress. Details and affiliations remain editable as official institutional designations are finalized.
            </p>
          </div>

          {/* Editorial profile presentation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {speakersList.map((speaker, index) => {
              const isEditing = editingId === speaker.id;

              return (
                <div
                  key={speaker.id}
                  className="bg-white border border-[#7554D9]/20 p-6 rounded-2xl flex flex-col justify-between space-y-6 hover:border-[#7554D9] transition-all shadow-xs hover:shadow-md"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#082746] to-[#7554D9] text-white rounded-xl flex items-center justify-center font-heading font-black text-xl shadow-md">
                        {speaker.titlePrefix}
                      </div>

                      <span className="px-3 py-1 bg-[#EDE9FA] text-[#7554D9] text-xs font-bold uppercase rounded-full tracking-wider">
                        Speaker 0{index + 1}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#082746] font-heading">
                        {speaker.name}
                      </h2>

                      {isEditing ? (
                        <div className="space-y-2 pt-2">
                          <input
                            type="text"
                            value={editDomain}
                            onChange={(e) => setEditDomain(e.target.value)}
                            placeholder="Domain expertise"
                            className="w-full text-sm p-2 border border-slate-300 rounded-lg"
                          />
                          <textarea
                            value={editAffiliation}
                            onChange={(e) => setEditAffiliation(e.target.value)}
                            placeholder="Affiliation details"
                            className="w-full text-sm p-2 border border-slate-300 rounded-lg resize-none h-16"
                          />
                          <button
                            onClick={() => handleSaveEdit(speaker.id)}
                            className="px-3.5 py-1.5 bg-[#082746] text-white text-xs sm:text-sm font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Profile</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 pt-1.5">
                          <p className="text-sm font-bold text-[#087E8B]">
                            {speaker.domain}
                          </p>
                          <p className="text-sm text-[#45536B] leading-relaxed">
                            {speaker.affiliationPlaceholder}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleStartEdit(speaker)}
                      className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#7554D9] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Cancel' : 'Edit Affiliation'}</span>
                    </button>

                    <a
                      href={speaker.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#7554D9] to-[#22C5D9] hover:opacity-95 rounded-full flex items-center gap-1 shadow-xs"
                    >
                      <span>Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Back to Top control */}
        <SectionBackToTop variant="light" />
      </section>

      {/* SECTION 2: PRESENTATION FORMATS */}
      <section className="snap-section min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] bg-[#F8FAFD] flex flex-col justify-between py-12 sm:py-16 border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-center space-y-8">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-bold tracking-widest text-[#087E8B] uppercase">
              DELEGATE PARTICIPATION MODALITIES
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[36px] font-black text-[#082746] font-heading">
              Conference Presentation Formats
            </h2>
            <p className="text-sm sm:text-base text-[#45536B] leading-relaxed">
              All accepted abstracts will be categorized into one of the designated presentation formats by the Scientific Programme Committee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRESENTATION_FORMATS.map((fmt) => (
              <div
                key={fmt.id}
                className="bg-white border border-[#22C5D9]/30 p-8 rounded-2xl space-y-4 hover:border-[#087E8B] transition-all shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-[13px] font-bold text-[#087E8B] uppercase tracking-wider bg-[#E6F4F8] px-3 py-1 rounded-full">
                    {fmt.mode}
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-[#082746] font-heading">
                  {fmt.format}
                </h3>

                <p className="text-sm sm:text-[15px] text-[#45536B] leading-relaxed">
                  {fmt.description}
                </p>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600">
                  <MapPin className="w-4 h-4 text-[#7554D9] shrink-0" />
                  <span>{fmt.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Back to Top control */}
        <SectionBackToTop variant="glass" />
      </section>
    </div>
  );
};

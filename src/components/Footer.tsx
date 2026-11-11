import React from 'react';
import {
  Calendar,
  MapPin,
  Home,
  Info,
  Layers,
  Mic,
  FileText,
  UserPlus,
  Users,
  User,
  Mail,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { IMAGES } from '../lib/images';

interface FooterProps {
  onSelectTab: (tab: string) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab, onOpenAdmin }) => {
  return (
    <footer className="w-full bg-gradient-to-b from-[#0B0F33] via-[#090D2A] to-[#06081E] text-slate-300 relative overflow-hidden font-['Inter',sans-serif] pt-12 pb-8 border-t border-[#1E265A]">
      {/* Ambient Lighting Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#713CE0]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#12B8D6]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        {/* =====================================================================
            PART 1: INSTITUTIONAL IDENTITY ROW (4 Blocks Separated by Dividers)
           ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-slate-700/60 pb-8 border-b border-slate-700/60 items-center">
          {/* Block 1: HOST UNIVERSITY */}
          <div className="space-y-2.5 lg:pr-6">
            <span className="text-[11px] font-bold tracking-widest text-[#22D3EE] uppercase block font-mono">
              HOST UNIVERSITY
            </span>
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/SRm_Logo_blue_background_17b4fbe7.png"
                alt="SRM Institute of Science and Technology"
                className="h-10 sm:h-12 w-auto object-contain rounded-sm shrink-0"
              />
            </div>
          </div>

          {/* Block 2: HOST INSTITUTION */}
          <div className="space-y-2.5 lg:px-6">
            <span className="text-[11px] font-bold tracking-widest text-[#C084FC] uppercase block font-mono">
              HOST INSTITUTION
            </span>
            <div className="flex items-center gap-3">
              <img
                src={IMAGES.srmPharmacyLogo}
                alt="SRM College of Pharmacy"
                className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-full bg-white p-0.5 shrink-0 shadow-2xs"
              />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[13px] sm:text-[14px] font-bold text-white tracking-tight">
                  SRM College of Pharmacy
                </span>
                <span className="text-[11px] sm:text-[12px] font-medium text-[#22D3EE] tracking-tight">
                  SRMIST, Kattankulathur
                </span>
              </div>
            </div>
          </div>

          {/* Block 3: COLLABORATING PARTNER */}
          <div className="space-y-2.5 lg:px-6">
            <span className="text-[11px] font-bold tracking-widest text-[#FB7185] uppercase block font-mono">
              COLLABORATING PARTNER
            </span>
            <div className="flex items-center gap-3">
              {/* Authentic INTI 8-spoke red starburst */}
              <svg viewBox="0 0 100 100" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 aspect-square" fill="none">
                <path
                  d="M50 8L50 92M8 50L92 50M20.3 20.3L79.7 79.7M20.3 79.7L79.7 20.3"
                  stroke="#E11D48"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="50" r="10" fill="#E11D48" />
              </svg>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[13px] sm:text-[14px] font-bold text-white tracking-tight">
                  INTI <span className="font-semibold text-[12px]">International</span>
                </span>
                <span className="text-[11px] sm:text-[12px] font-medium text-slate-300 tracking-tight">
                  University, Malaysia
                </span>
              </div>
            </div>
          </div>

          {/* Block 4: PROFESSIONAL ALLIANCE */}
          <div className="space-y-2.5 lg:pl-6">
            <span className="text-[11px] font-bold tracking-widest text-[#22D3EE] uppercase block font-mono">
              PROFESSIONAL ALLIANCE
            </span>
            <div className="flex items-center gap-3">
              {/* Official Combined IPA Emblem, Name & Tagline */}
              <div className="bg-white px-2.5 py-1.5 rounded-sm shadow-2xs flex items-center shrink-0">
                <img
                  src={IMAGES.ipaOfficialLogo}
                  alt="The Indian Pharmaceutical Association (IPA) - ...CRUSADE FOR THE PROFESSION"
                  className="h-8 sm:h-9 w-auto max-w-[190px] sm:max-w-[220px] object-contain shrink-0"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            PART 2: CONFERENCE IDENTITY SECTION (Two-Column Layout)
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-8 border-b border-slate-700/60">
          {/* Left Column: Conference Title & Badge */}
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1A3D] border border-[#22D3EE]/30 text-[#22D3EE] text-[11px] font-bold tracking-wider uppercase shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
              <span>INTERNATIONAL CONFERENCE · 2027</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-bold font-heading text-white tracking-tight leading-snug">
              AI-Powered Innovations in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#713CE0]">
                Drug Discovery and Development
              </span>
            </h2>

            <p className="text-sm sm:text-[15px] text-slate-300 font-normal leading-relaxed">
              Transforming Discovery. Accelerating Innovation. Advancing Healthcare.
            </p>
          </div>

          {/* Right Column: Date & Venue with Icons */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-700/60 lg:pl-8 space-y-4">
            {/* Date Row */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#2D1B69]/70 text-[#C084FC] border border-[#C084FC]/30 flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[15px] sm:text-[16px] font-bold text-white tracking-tight">
                  15–16 February 2027
                </div>
              </div>
            </div>

            {/* Venue Row */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0C3058]/70 text-[#22D3EE] border border-[#22D3EE]/30 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-[13px] sm:text-[14px] text-slate-300 leading-snug">
                <div className="text-white font-medium">SRM College of Pharmacy, SRMIST,</div>
                <div>Kattankulathur, Tamil Nadu, India</div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            PART 3: NAVIGATION & COMMUNICATION DETAILS (Two Columns)
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pb-8 border-b border-slate-700/60">
          {/* Left Column: EXPLORE THE CONFERENCE (2 Compact Sub-Columns) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs sm:text-[13px] font-bold uppercase tracking-widest text-white font-heading">
              EXPLORE THE CONFERENCE
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[14.5px] sm:text-[15px]">
              {/* Sub-column 1 */}
              <div className="space-y-2">
                {[
                  { id: 'home', label: 'Home', icon: Home },
                  { id: 'about', label: 'About', icon: Info },
                  { id: 'tracks', label: 'Scientific Tracks', icon: Layers },
                  { id: 'speakers', label: 'Invited Speakers', icon: Mic },
                  { id: 'programme', label: 'Scientific Programme', icon: Calendar },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className="w-full flex items-center justify-between text-slate-300 hover:text-white transition-colors py-1 cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#A855F7] shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Sub-column 2 */}
              <div className="space-y-2">
                {[
                  { id: 'abstracts', label: 'Abstract Portal', icon: FileText },
                  { id: 'registration', label: 'Registration', icon: UserPlus },
                  { id: 'committees', label: 'Committees', icon: Users },
                  { id: 'venue', label: 'Venue & Accessibility', icon: MapPin },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className="w-full flex items-center justify-between text-slate-300 hover:text-white transition-colors py-1 cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#A855F7] shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: COMMUNICATION DETAILS (2 Named Profiles) */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-700/60 lg:pl-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white font-mono">
              COMMUNICATION DETAILS
            </h3>

            <div className="space-y-4">
              {/* Contact 1: Dr. V. Chitra */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1E1B4B] text-[#A855F7] border border-[#A855F7]/30 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-left">
                  <div className="text-[14px] sm:text-[15px] font-bold text-white tracking-tight">
                    Dr. V. Chitra
                  </div>
                  <div className="text-[12px] text-slate-400">
                    Dean, SRM College of Pharmacy
                  </div>
                  <a
                    href="mailto:dean.pharmacy.ktr@srmist.edu.in"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[#22D3EE] hover:underline font-medium pt-0.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                    <span>dean.pharmacy.ktr@srmist.edu.in</span>
                  </a>
                </div>
              </div>

              {/* Contact 2: Dr. N. Damodharan */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1E1B4B] text-[#A855F7] border border-[#A855F7]/30 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-left">
                  <div className="text-[14px] sm:text-[15px] font-bold text-white tracking-tight">
                    Dr. N. Damodharan
                  </div>
                  <div className="text-[12px] text-slate-400">
                    Organising Secretary · Vice Principal
                  </div>
                  <a
                    href="mailto:org.secy.cp@srmist.edu.in"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[#22D3EE] hover:underline font-medium pt-0.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                    <span>org.secy.cp@srmist.edu.in</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            PART 4: BOTTOM COPYRIGHT & SECRETARIAT LOGIN STRIP
           ===================================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 pt-2">
          {/* Left: Copyright */}
          <div className="text-center sm:text-left">
            <span>© 2027 SRM College of Pharmacy, SRMIST. All rights reserved.</span>
          </div>

          {/* Centre: Institutional Location */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
            <span>Kattankulathur, Tamil Nadu, India</span>
          </div>

          {/* Right: Secretariat Login Pill Button */}
          <div>
            <button
              onClick={onOpenAdmin}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#9333EA] hover:opacity-95 text-white text-[12px] font-semibold flex items-center gap-2 shadow-xs border border-purple-400/30 cursor-pointer transition-all hover:scale-102 active:scale-98"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Org. Secretary Login</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

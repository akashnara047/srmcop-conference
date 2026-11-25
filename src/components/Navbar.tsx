import React, { useState } from 'react';
import { Menu, X, ArrowRight, Shield } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isAdminView?: boolean;
  onToggleAdminView?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onToggleAdminView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Unified ordered navigation links (Registration placed before Abstracts)
  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'tracks', label: 'Scientific Tracks' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'programme', label: 'Programme' },
    { id: 'registration', label: 'Registration' },
    { id: 'abstracts', label: 'Abstracts' },
    { id: 'committees', label: 'Committees' },
    { id: 'venue', label: 'Venue' },
    { id: 'accommodation', label: 'Accommodation & Places to Visit' },
  ];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  const handleAdminLoginClick = () => {
    setMobileMenuOpen(false);
    onToggleAdminView?.();
  };

  const isLightNav = currentTab === 'tracks';

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors select-none ${
        isLightNav
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs'
          : 'bg-[#082746] border-b border-[#102B50] shadow-md'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 lg:gap-3">
          {/* Mobile Hamburger Button (Left on mobile/tablet) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-md transition-colors cursor-pointer ${
              isLightNav ? 'text-[#082746] hover:bg-slate-100' : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Desktop Navigation: All sections directly visible without overflow dropdown */}
          <nav
            aria-label="Main navigation"
            className={`hidden lg:flex items-center gap-0.5 xl:gap-1 2xl:gap-1.5 text-[12.5px] xl:text-[13.5px] 2xl:text-[14px] font-semibold ${
              isLightNav ? 'text-[#082746]' : 'text-slate-200'
            }`}
          >
            {navLinks.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white font-bold shadow-xs'
                      : isLightNav
                      ? 'text-[#082746] hover:text-[#7554D9] hover:bg-slate-100/80'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Gradient Register Now CTA Button & Discreet Organising Secretary Login Icon */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-0">
            <button
              type="button"
              onClick={() => handleNavClick('registration')}
              className="px-4 sm:px-5 py-2 text-xs sm:text-[13.5px] xl:text-[14px] font-bold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] hover:opacity-95 transition-opacity rounded-full shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span className="whitespace-nowrap">Register Now</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            {onToggleAdminView && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={handleAdminLoginClick}
                  aria-label="Organising Secretary Login"
                  aria-describedby="org-sec-login-tooltip"
                  className={`peer w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                    isLightNav
                      ? 'text-[#082746]/45 hover:text-[#082746]/85 hover:bg-slate-100/90 focus-visible:ring-[#082746]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white'
                      : 'text-[#A8C4E0]/65 hover:text-[#E2EFFB] hover:bg-white/10 focus-visible:ring-[#A8C4E0]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#082746]'
                  }`}
                >
                  <Shield className="w-[15px] h-[15px]" strokeWidth={1.8} aria-hidden="true" />
                </button>

                <span
                  id="org-sec-login-tooltip"
                  role="tooltip"
                  className={`pointer-events-none absolute right-0 top-full mt-2 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0 translate-y-0.5 peer-hover:opacity-100 peer-hover:translate-y-0 peer-focus-visible:opacity-100 peer-focus-visible:translate-y-0 transition-all duration-150 shadow-lg z-50 ${
                    isLightNav
                      ? 'bg-[#082746] text-slate-100 border border-[#16395E]'
                      : 'bg-[#051B33]/95 text-[#D8E7F8] border border-white/15'
                  }`}
                >
                  Organising Secretary Login
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-t px-4 pt-3 pb-6 space-y-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 ${
            isLightNav ? 'bg-white border-slate-200 text-[#082746]' : 'bg-[#082746] border-[#102B50] text-slate-200'
          }`}
        >
          <div className={`grid grid-cols-2 gap-2 pb-3 border-b ${isLightNav ? 'border-slate-200' : 'border-slate-700'}`}>
            {navLinks.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2 text-xs font-semibold rounded-md text-left transition-colors cursor-pointer ${
                    item.id === 'accommodation' ? 'col-span-2' : ''
                  } ${
                    isActive
                      ? 'bg-[#7554D9] text-white font-bold'
                      : isLightNav
                      ? 'text-[#082746] hover:bg-slate-100'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleNavClick('registration')}
              className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] rounded-full text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Register Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('abstracts')}
              className={`w-full py-2.5 text-xs font-bold rounded-full text-center cursor-pointer border ${
                isLightNav
                  ? 'text-[#082746] bg-slate-100 hover:bg-slate-200 border-slate-300'
                  : 'text-white bg-white/10 hover:bg-white/20 border-white/20'
              }`}
            >
              Submit Abstract
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

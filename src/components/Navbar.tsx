import React, { useState, useRef, useEffect } from 'react';
import { SRMISTLogo, SRMPharmacyLogo } from './Logos';
import { Menu, X, ArrowRight, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isAdminView?: boolean;
  onToggleAdminView?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  isAdminView = false,
  onToggleAdminView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary navigation links as defined in mockup
  const primaryLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'tracks', label: 'Scientific Tracks' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'programme', label: 'Programme' },
    { id: 'abstracts', label: 'Abstracts' },
    { id: 'registration', label: 'Registration' },
  ];

  // Secondary items in clean More dropdown on narrower desktops, or full on wide
  const secondaryLinks = [
    { id: 'committees', label: 'Committees' },
    { id: 'venue', label: 'Venue' },
  ];

  const allLinks = [...primaryLinks, ...secondaryLinks];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  };

  const isSecondaryActive = secondaryLinks.some((l) => l.id === currentTab);
  const isLightNav = currentTab === 'tracks';

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors select-none ${
        isLightNav
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs'
          : 'bg-[#082746] border-b border-[#102B50] shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
          {/* LEFT: Institutional Identity (SRMIST & SRM College of Pharmacy) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* SRMIST Logo */}
            <div
              onClick={() => handleNavClick('home')}
              className="cursor-pointer shrink-0"
              title="SRM Institute of Science and Technology"
            >
              <SRMISTLogo className="h-8 sm:h-9" inverted={!isLightNav} />
            </div>

            {/* Subtle Divider */}
            <div className={`h-7 w-px hidden sm:block ${isLightNav ? 'bg-slate-300/80' : 'bg-slate-700/80'}`} />

            {/* SRM College of Pharmacy Logo & Title */}
            <div
              onClick={() => handleNavClick('home')}
              className="cursor-pointer shrink-0 flex items-center"
              title="SRM College of Pharmacy"
            >
              <SRMPharmacyLogo className="h-8 sm:h-9" inverted={!isLightNav} showText={true} />
            </div>
          </div>

          {/* RIGHT: Navigation Links & CTA Button */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 ml-auto">
            {/* Desktop Navigation */}
            <nav
              className={`hidden lg:flex items-center gap-1 xl:gap-1.5 text-sm xl:text-[15px] font-semibold ${
                isLightNav ? 'text-[#082746]' : 'text-slate-200'
              }`}
            >
              {/* Primary Links */}
              {primaryLinks.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
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

              {/* Wide desktop (2xl) displays secondary links inline */}
              <div className="hidden 2xl:flex items-center gap-1.5">
                {secondaryLinks.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
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
              </div>

              {/* Standard desktop displays 'More' Dropdown for secondary links */}
              <div className="relative 2xl:hidden" ref={dropdownRef}>
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`px-3 py-1.5 rounded-full flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                    isSecondaryActive
                      ? 'bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white font-bold shadow-xs'
                      : isLightNav
                      ? 'text-[#082746] hover:text-[#7554D9] hover:bg-slate-100/80'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>More</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreDropdownOpen && (
                  <div
                    className={`absolute right-0 mt-1.5 w-44 rounded-xl py-1.5 z-50 animate-in fade-in duration-100 shadow-xl border ${
                      isLightNav ? 'bg-white border-slate-200 text-[#082746]' : 'bg-[#082746] border-[#102B50] text-slate-200'
                    }`}
                  >
                    {secondaryLinks.map((item) => {
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white font-bold'
                              : isLightNav
                              ? 'text-[#082746] hover:bg-slate-100'
                              : 'text-slate-200 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{item.label}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* Gradient Register Now Button */}
            <button
              onClick={() => handleNavClick('registration')}
              className="px-4 sm:px-5 py-2 text-xs sm:text-[14.5px] font-bold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] hover:opacity-95 transition-opacity rounded-full shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span className="whitespace-nowrap">Register Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-md transition-colors cursor-pointer ${
                isLightNav ? 'text-[#082746] hover:bg-slate-100' : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
            {allLinks.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2 text-xs font-semibold rounded-md text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#7554D9] text-white font-bold'
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
              onClick={() => handleNavClick('registration')}
              className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] rounded-full text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Register Now (₹2,000)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleNavClick('abstracts')}
              className="w-full py-2.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-center cursor-pointer"
            >
              Submit Abstract
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

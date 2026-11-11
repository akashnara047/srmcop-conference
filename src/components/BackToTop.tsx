import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

// Inline Section Back to Top control - removed globally per design direction
export const SectionBackToTop: React.FC<{
  className?: string;
  variant?: 'light' | 'dark' | 'glass';
}> = () => {
  return null;
};

// Global Floating Back to Top button anchored at bottom-right
export const FloatingBackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-xl hover:shadow-2xl border border-white/30 hover:scale-108 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-[#7554D9]"
      title="Back to Top"
    >
      <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
      <span className="sr-only">Back to Top</span>
    </button>
  );
};

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { AboutView } from './components/AboutView';
import { TracksView } from './components/TracksView';
import { SpeakersView } from './components/SpeakersView';
import { ProgrammeView } from './components/ProgrammeView';
import { AbstractsView } from './components/AbstractsView';
import { RegistrationView } from './components/RegistrationView';
import { CommitteesView } from './components/CommitteesView';
import { VenueView } from './components/VenueView';
import { AdminPortal } from './components/AdminPortal';
import { FloatingBackToTop } from './components/BackToTop';
import { testConnection } from './lib/firebase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [selectedTrackForAbstract, setSelectedTrackForAbstract] = useState<string | undefined>(undefined);

  // Initialize and test connection on mount as mandated by Firebase skill
  useEffect(() => {
    testConnection().catch((err) => console.warn('Firebase init connection test:', err));

    // Handle hash routing if URL contains #admin
    const handleHash = () => {
      if (window.location.hash === '#admin' || window.location.pathname === '/admin/login') {
        setIsAdminView(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Dynamically activate CSS scroll-snap only on presentation tabs, not long forms or admin
  useEffect(() => {
    const isPresentationTab = [
      'home',
      'about',
      'tracks',
      'speakers',
      'programme',
      'venue',
      'committees',
    ].includes(currentTab);

    if (isPresentationTab && !isAdminView) {
      document.documentElement.classList.add('snap-page');
    } else {
      document.documentElement.classList.remove('snap-page');
    }

    return () => {
      document.documentElement.classList.remove('snap-page');
    };
  }, [currentTab, isAdminView]);

  const handleSelectTab = (tab: string, trackId?: string) => {
    if (trackId) {
      setSelectedTrackForAbstract(trackId);
    }
    setCurrentTab(tab);
    setIsAdminView(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleToggleAdmin = () => {
    setIsAdminView(!isAdminView);
  };

  if (isAdminView) {
    return <AdminPortal onExit={() => setIsAdminView(false)} />;
  }

  return (
    <div className="min-h-screen bg-white text-[#101D3A] flex flex-col font-sans selection:bg-[#6745C5] selection:text-white overflow-x-hidden">
      {/* Sticky Institutional Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isAdminView={isAdminView}
        onToggleAdminView={handleToggleAdmin}
      />

      {/* Main Content Sections with Full-Page Vertical Scroll Snapping */}
      <main className="flex-1">
        {currentTab === 'home' && <HomeView onNavigate={handleSelectTab} />}
        {currentTab === 'about' && <AboutView onNavigate={handleSelectTab} />}
        {currentTab === 'tracks' && <TracksView onNavigate={handleSelectTab} />}
        {currentTab === 'speakers' && <SpeakersView />}
        {currentTab === 'programme' && <ProgrammeView />}
        {currentTab === 'abstracts' && (
          <AbstractsView
            initialTrackId={selectedTrackForAbstract}
            onNavigateToRegistration={() => handleSelectTab('registration')}
          />
        )}
        {currentTab === 'registration' && <RegistrationView />}
        {currentTab === 'committees' && <CommitteesView />}
        {currentTab === 'venue' && <VenueView />}
      </main>

      {/* Institutional Footer */}
      <Footer
        onSelectTab={handleSelectTab}
        onOpenAdmin={() => setIsAdminView(true)}
      />

      {/* Global Floating Back-to-Top Button */}
      <FloatingBackToTop />
    </div>
  );
}

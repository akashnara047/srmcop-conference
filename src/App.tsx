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
import { AccommodationView } from './components/AccommodationView';
import { AdminPortal } from './components/AdminPortal';
import { FloatingBackToTop } from './components/BackToTop';
import { testConnection } from './lib/firebase';

const TAB_PATHS: Record<string, string> = {
  home: '/',
  about: '/about',
  tracks: '/tracks',
  speakers: '/speakers',
  programme: '/programme',
  abstracts: '/abstracts',
  registration: '/registration',
  committees: '/committees',
  venue: '/venue',
  accommodation: '/accommodation',
};

const getRouteStateFromLocation = (): { tab: string; isAdmin: boolean } => {
  if (typeof window === 'undefined') {
    return { tab: 'home', isAdmin: false };
  }
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const hash = window.location.hash.toLowerCase();

  if (
    hash === '#admin' ||
    hash.startsWith('#admin/') ||
    path === '/admin/login' ||
    path === '/admin' ||
    path.startsWith('/admin/')
  ) {
    return { tab: 'home', isAdmin: true };
  }

  if (
    path === '/accommodation' ||
    path === '/accommodation-and-places-to-visit' ||
    hash === '#accommodation'
  ) {
    return { tab: 'accommodation', isAdmin: false };
  }

  const matchedPath = Object.entries(TAB_PATHS).find(([, routePath]) => routePath === path);
  if (matchedPath) {
    return { tab: matchedPath[0], isAdmin: false };
  }

  const hashKey = hash.replace(/^#/, '');
  if (hashKey && TAB_PATHS[hashKey]) {
    return { tab: hashKey, isAdmin: false };
  }

  return { tab: 'home', isAdmin: false };
};

export default function App() {
  const initialRoute = getRouteStateFromLocation();
  const [currentTab, setCurrentTab] = useState<string>(initialRoute.tab);
  const [isAdminView, setIsAdminView] = useState<boolean>(initialRoute.isAdmin);
  const [selectedTrackForAbstract, setSelectedTrackForAbstract] = useState<string | undefined>(undefined);
  const [prefilledRegIdForAbstract, setPrefilledRegIdForAbstract] = useState<string | undefined>(undefined);

  // Initialize and test connection on mount as mandated by Firebase skill
  useEffect(() => {
    testConnection().catch((err) => console.warn('Firebase init connection test:', err));

    const syncRouteFromLocation = () => {
      const next = getRouteStateFromLocation();
      setIsAdminView(next.isAdmin);
      if (!next.isAdmin) {
        setCurrentTab(next.tab);
      }
    };

    window.addEventListener('hashchange', syncRouteFromLocation);
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncRouteFromLocation);
      window.removeEventListener('popstate', syncRouteFromLocation);
    };
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
      'accommodation',
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

  const handleSelectTab = (tab: string, trackId?: string, prefilledRegistrationId?: string) => {
    if (trackId) {
      setSelectedTrackForAbstract(trackId);
    }
    if (prefilledRegistrationId && prefilledRegistrationId.trim()) {
      setPrefilledRegIdForAbstract(prefilledRegistrationId.trim().toUpperCase());
    } else if (tab !== 'abstracts') {
      setPrefilledRegIdForAbstract(undefined);
    }
    setCurrentTab(tab);
    setIsAdminView(false);

    const targetPath = TAB_PATHS[tab] || '/';
    try {
      if (window.location.pathname !== targetPath || window.location.hash) {
        window.history.pushState(null, '', targetPath);
      }
    } catch {
      // Ignore history errors in restricted environments
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleProceedToAbstractSubmission = (registrationId?: string) => {
    handleSelectTab('abstracts', undefined, registrationId);
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
            initialRegistrationId={prefilledRegIdForAbstract}
            onNavigateToRegistration={() => handleSelectTab('registration')}
          />
        )}
        {currentTab === 'registration' && (
          <RegistrationView
            onProceedToAbstractSubmission={handleProceedToAbstractSubmission}
          />
        )}
        {currentTab === 'committees' && <CommitteesView />}
        {currentTab === 'venue' && <VenueView />}
        {currentTab === 'accommodation' && <AccommodationView onNavigate={handleSelectTab} />}
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

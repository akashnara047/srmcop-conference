import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Building2,
  Camera,
  Car,
  Compass,
  ExternalLink,
  Info,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Search,
  Users,
  X,
} from 'lucide-react';
import { IMAGES } from '../lib/images';
import { OptimizedPicture } from './OptimizedImage';
import {
  AccommodationCategory,
  AccommodationProperty,
  CONFERENCE_VENUE_ORIGIN,
  TouristAttraction,
  VERIFIED_ACCOMMODATION_PROPERTIES,
  VERIFIED_PLACES_TO_VISIT,
  buildGoogleMapsDirectionsUrl,
  normalizeTelHref,
  sortAccommodationsByDistance,
  sortAttractionsByDistance,
} from '../data/accommodationData';
import {
  fetchAccommodationDirectory,
  fetchAttractionsDirectory,
} from '../lib/hospitalityService';

interface AccommodationViewProps {
  onNavigate?: (tab: string) => void;
}

type CategoryFilter = 'All' | 'Hotels' | 'Guest Houses' | 'Residencies' | 'Homestays';
type SortMode = 'nearest' | 'farthest' | 'name';

const CATEGORY_FILTER_MAP: Record<Exclude<CategoryFilter, 'All'>, AccommodationCategory> = {
  Hotels: 'Hotel',
  'Guest Houses': 'Guest House',
  Residencies: 'Residency',
  Homestays: 'Homestay',
};

const CATEGORY_BADGE_STYLES: Record<AccommodationCategory, string> = {
  Hotel: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
  'Guest House': 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
  Residency: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Homestay: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
};

export const AccommodationView: React.FC<AccommodationViewProps> = ({ onNavigate }) => {
  const [accommodations, setAccommodations] = useState<AccommodationProperty[]>(() =>
    sortAccommodationsByDistance(VERIFIED_ACCOMMODATION_PROPERTIES, 'nearest')
  );
  const [attractions, setAttractions] = useState<TouristAttraction[]>(() =>
    sortAttractionsByDistance(VERIFIED_PLACES_TO_VISIT)
  );

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [localityFilter, setLocalityFilter] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('nearest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load any Org. Secretary Firestore updates cleanly over verified defaults
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAccommodationDirectory(false),
      fetchAttractionsDirectory(false),
    ])
      .then(([accResult, attrResult]) => {
        if (!active) return;
        setAccommodations(accResult.items);
        setAttractions(attrResult.items);
      })
      .catch((err) => {
        console.warn('Using verified static accommodation defaults:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  const localities = useMemo(() => {
    const unique = Array.from(new Set(accommodations.map((item) => item.locality)));
    return ['All', ...unique];
  }, [accommodations]);

  const categoryCounts = useMemo(() => {
    return {
      All: accommodations.length,
      Hotels: accommodations.filter((i) => i.category === 'Hotel').length,
      'Guest Houses': accommodations.filter((i) => i.category === 'Guest House').length,
      Residencies: accommodations.filter((i) => i.category === 'Residency').length,
      Homestays: accommodations.filter((i) => i.category === 'Homestay').length,
    };
  }, [accommodations]);

  const filteredAccommodations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = accommodations.filter((item) => {
      if (categoryFilter !== 'All') {
        if (item.category !== CATEGORY_FILTER_MAP[categoryFilter]) return false;
      }
      if (localityFilter !== 'All' && item.locality !== localityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.locality.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
    return sortAccommodationsByDistance(filtered, sortMode);
  }, [accommodations, categoryFilter, localityFilter, sortMode, searchQuery]);

  const sortedAttractions = useMemo(
    () => sortAttractionsByDistance(attractions),
    [attractions]
  );

  const resetFilters = () => {
    setCategoryFilter('All');
    setLocalityFilter('All');
    setSortMode('nearest');
    setSearchQuery('');
  };

  const hasActiveFilters =
    categoryFilter !== 'All' ||
    localityFilter !== 'All' ||
    sortMode !== 'nearest' ||
    searchQuery.trim() !== '';

  return (
    <div className="w-full bg-gradient-to-b from-[#EBF2FF] via-[#F4F1FD] to-[#E9F3FF] min-h-screen font-['Inter',sans-serif] pb-14 sm:pb-18">
      {/* =======================================================================
          HERO BANNER – Consistent Institutional Header
         ======================================================================= */}
      <section className="relative w-full overflow-hidden bg-[#081B38] text-white">
        <div className="absolute inset-0 w-full h-full">
          <OptimizedPicture
            src={IMAGES.srmistCampusAerial}
            alt="SRMIST Kattankulathur Campus Aerial Panorama"
            className="w-full h-full object-cover object-center scale-105"
            referrerPolicy="no-referrer"
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#081B38]/95 via-[#0A2246]/85 to-transparent sm:to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081B38] via-transparent to-black/20" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 z-10 space-y-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white text-[11px] font-bold tracking-wider uppercase shadow-xs">
            <Compass className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>DELEGATE HOSPITALITY &amp; LOCAL GUIDE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-[42px] lg:text-[44px] font-black font-heading tracking-tight leading-tight max-w-3xl text-balance">
            Accommodation &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#22D3EE]">
              Places to Visit
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-200 max-w-2xl font-normal leading-relaxed">
            Verified hotel, residency, guest house, and homestay directory near SRM Institute of Science and Technology (SRMIST), Kattankulathur, along with regional attractions across Chennai and Mahabalipuram.
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm text-xs sm:text-[13px] text-white/95 font-medium shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>Kattankulathur · Chennai · Tamil Nadu · India</span>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('venue')}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-xs sm:text-[13px] font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>View Venue &amp; Travel Directions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full h-5 sm:h-7 overflow-hidden leading-none relative z-10">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-full text-[#EBF2FF] fill-current"
          >
            <path d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,120 L0,120 Z" />
          </svg>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-10 sm:space-y-12">
        {/* =====================================================================
            SECTION 1: ACCOMMODATION DIRECTORY
           ===================================================================== */}
        <section aria-labelledby="accommodation-heading" className="space-y-6">
          <div className="bg-white/95 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_24px_rgba(113,60,224,0.07)] overflow-hidden">
            {/* Section Card Header */}
            <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#713CE0] to-[#087E8B] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="accommodation-heading"
                    className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading tracking-tight"
                  >
                    Accommodation
                  </h2>
                  <p className="text-xs sm:text-[13px] text-[#45536B] font-medium">
                    Delegate Stay Arrangements &amp; Guidance – 15–16 February 2027
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/85 border border-[#D9D3F9] text-[11.5px] font-semibold text-[#334155] self-start sm:self-auto">
                <Navigation className="w-3.5 h-3.5 text-[#713CE0] shrink-0" />
                <span>Distances measured from Dr. T. P. Ganesan Auditorium, SRMIST</span>
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {/* Supporting Text */}
              <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed max-w-4xl">
                Delegates attending the International Conference on AI-Powered Innovations in Drug Discovery and Development at SRM Institute of Science and Technology (SRMIST), Kattankulathur, can explore the following accommodation options in and around the campus.
              </p>

              {/* Interactive Controls: Category Chips + Locality + Sort + Search */}
              <div className="rounded-xl bg-[#F8F6FF] border border-[#E3DEF9] p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Category Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter accommodation by category">
                    {(['All', 'Hotels', 'Guest Houses', 'Residencies', 'Homestays'] as CategoryFilter[]).map(
                      (cat) => {
                        const isActive = categoryFilter === cat;
                        const count = categoryCounts[cat];
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                              isActive
                                ? 'bg-[#713CE0] text-white border-[#713CE0] shadow-xs'
                                : 'bg-white text-[#334155] border-[#D9D3F9] hover:border-[#713CE0]/50 hover:text-[#101B4B]'
                            }`}
                          >
                            <span>{cat}</span>
                            <span
                              className={`text-[10.5px] px-1.5 py-0.2 rounded-full tabular-nums ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* Showing count + Reset */}
                  <div className="flex items-center gap-2 text-xs text-[#45536B] font-medium tabular-nums">
                    <span>
                      Showing <strong className="text-[#101B4B]">{filteredAccommodations.length}</strong>{' '}
                      {filteredAccommodations.length === 1 ? 'property' : 'properties'}
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#713CE0] hover:text-[#5B21B6] cursor-pointer ml-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Second Row: Search, Locality Dropdown, Sort Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by hotel name, street, or locality..."
                      aria-label="Search accommodation directory"
                      className="w-full pl-8 pr-8 py-2 bg-white border border-[#D9D3F9] rounded-lg text-xs text-[#101B4B] placeholder-slate-400 outline-none focus:border-[#713CE0] focus:ring-2 focus:ring-[#713CE0]/15 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-2 bg-white border border-[#D9D3F9] rounded-lg px-2.5">
                    <MapPin className="w-3.5 h-3.5 text-[#087E8B] shrink-0" />
                    <select
                      aria-label="Filter by locality"
                      value={localityFilter}
                      onChange={(e) => setLocalityFilter(e.target.value)}
                      className="w-full py-2 bg-transparent text-xs font-medium text-[#101B4B] outline-none cursor-pointer"
                    >
                      {localities.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc === 'All' ? 'All Localities' : loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4 flex items-center gap-2 bg-white border border-[#D9D3F9] rounded-lg px-2.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#713CE0] shrink-0" />
                    <select
                      aria-label="Sort accommodation listings"
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="w-full py-2 bg-transparent text-xs font-medium text-[#101B4B] outline-none cursor-pointer"
                    >
                      <option value="nearest">Sort: Nearest to SRMIST</option>
                      <option value="farthest">Sort: Farthest from SRMIST</option>
                      <option value="name">Sort: Name A–Z</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Accommodation Cards Grid */}
              {filteredAccommodations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D9D3F9] bg-[#F8F6FF]/60 p-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-[#101B4B]">
                    No matching accommodation properties found
                  </p>
                  <p className="text-xs text-[#45536B]">
                    Try clearing your search or switching back to All Categories and All Localities.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-[#713CE0] text-white text-xs font-semibold cursor-pointer hover:bg-[#5B21B6] transition-colors"
                  >
                    Show All Verified Stays
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                  {filteredAccommodations.map((property) => {
                    const primaryTelHref = normalizeTelHref(property.phone);
                    const secondaryTelHref = property.secondaryPhone
                      ? normalizeTelHref(property.secondaryPhone)
                      : '';
                    const directionsUrl = buildGoogleMapsDirectionsUrl(property.mapsQuery);

                    return (
                      <article
                        key={property.id}
                        className="group bg-white border border-[#E2DCFB] hover:border-[#713CE0]/45 rounded-xl p-4 sm:p-4.5 shadow-2xs hover:shadow-[0_6px_22px_rgba(113,60,224,0.09)] transition-all flex flex-col justify-between gap-3.5"
                      >
                        <div className="space-y-2.5">
                          {/* Badges Row: Category + Locality + Driving Distance */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                                  CATEGORY_BADGE_STYLES[property.category]
                                }`}
                              >
                                {property.category}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium text-[#334155]">
                                {property.locality}
                              </span>
                            </div>

                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3EFFE] border border-[#DDD6FE] text-[#5B21B6] text-[11.5px] font-bold tabular-nums shrink-0"
                              title={`Road driving distance from ${CONFERENCE_VENUE_ORIGIN}`}
                            >
                              <Car className="w-3 h-3 text-[#713CE0]" />
                              <span>{property.distanceKm.toFixed(1)} km</span>
                            </span>
                          </div>

                          {/* Property Title & Prominent Proximity Subtitle */}
                          <div>
                            <h3 className="text-[16px] font-bold text-[#101B4B] font-heading leading-snug group-hover:text-[#5B21B6] transition-colors">
                              {property.name}
                            </h3>
                            <p className="text-[11.5px] font-semibold text-[#087E8B] mt-0.5 tabular-nums">
                              {property.distanceKm.toFixed(1)} km from conference venue
                              {property.driveMinutes ? ` · ~${property.driveMinutes} min drive` : ''}
                            </p>
                          </div>

                          {/* Full Verified Address */}
                          <div className="flex items-start gap-2 text-xs text-[#45536B] leading-relaxed">
                            <MapPin className="w-3.5 h-3.5 text-[#713CE0] shrink-0 mt-0.5" />
                            <span>{property.address}</span>
                          </div>

                          {/* Verified Telephone Contact */}
                          <div className="space-y-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                              <a
                                href={primaryTelHref}
                                className="inline-flex items-center gap-1.5 font-semibold text-[#101B4B] hover:text-[#713CE0] transition-colors tabular-nums"
                              >
                                <Phone className="w-3.5 h-3.5 text-[#087E8B] shrink-0" />
                                <span>{property.phone}</span>
                              </a>
                              {property.secondaryPhone && secondaryTelHref && (
                                <a
                                  href={secondaryTelHref}
                                  className="inline-flex items-center text-[11.5px] font-medium text-[#45536B] hover:text-[#713CE0] transition-colors tabular-nums"
                                >
                                  / {property.secondaryPhone}
                                </a>
                              )}
                            </div>
                            {property.phoneTypeNote && (
                              <p className="text-[10.5px] text-slate-500 pl-5">
                                {property.phoneTypeNote}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Links: Call Now + View Directions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                          <a
                            href={primaryTelHref}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#713CE0] hover:bg-[#5B21B6] text-white text-xs font-semibold transition-colors shadow-2xs"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call Now</span>
                          </a>

                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#F8F6FF] hover:bg-[#EDE9FD] text-[#5B21B6] border border-[#DDD6FE] text-xs font-semibold transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Directions</span>
                            <ExternalLink className="w-3 h-3 opacity-75" />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Bottom Institutional Panels: Delegate Notice + Accommodation Coordination */}
              <div className="pt-2 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Delegate Notice */}
                <div className="lg:col-span-7 rounded-xl bg-[#F8F6FF] border border-[#DDD6FE] p-4 sm:p-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#5B21B6]">
                      <Info className="w-4 h-4 shrink-0" />
                      <h3 className="text-sm sm:text-[15px] font-bold font-heading">
                        Delegate Stay Booking &amp; Distance Guidance
                      </h3>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[#45536B] leading-relaxed">
                      Room reservations, tariffs, check-in schedules, and availability are managed directly by the respective hotels, residencies, guest houses, and homestays. Delegates are requested to contact their preferred property directly prior to arrival.
                    </p>
                    <p className="text-xs sm:text-[13px] text-[#45536B] leading-relaxed">
                      Driving distances listed above are measured by road from{' '}
                      <strong className="text-[#101B4B]">
                        Dr. T. P. Ganesan Auditorium, SRMIST, Kattankulathur
                      </strong>{' '}
                      and are intended solely as a planning guide; actual travel times may vary depending on GST Road traffic conditions.
                    </p>
                  </div>
                </div>

                {/* Retained Coordination Contact Panel */}
                <div className="lg:col-span-5 rounded-xl bg-slate-50/95 border border-slate-200/90 p-4 sm:p-5 space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087E8B]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Accommodation Coordination</span>
                    </div>
                    <p className="text-sm font-bold text-[#101B4B] font-heading">
                      Transport and Accommodation Committee
                    </p>
                    <p className="text-xs sm:text-[13px] text-[#45536B]">
                      Convenor: <span className="font-semibold text-[#101B4B]">Dr. V. Manimaran</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-200/80 pt-3 space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#713CE0]">
                      Conference Venue
                    </div>
                    <div className="flex items-start gap-2 text-xs sm:text-[12.5px] text-[#45536B] leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-[#713CE0] shrink-0 mt-0.5" />
                      <span>
                        Dr. T. P. Ganesan Auditorium, SRMIST, Kattankulathur, Tamil Nadu – 603203, India
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 pt-3 space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">
                      Secretariat Contact
                    </div>
                    <div className="flex flex-col gap-1 text-xs sm:text-[12.5px]">
                      <a
                        href="mailto:org.secy.cp@srmist.edu.in"
                        className="inline-flex items-center gap-1.5 text-[#101B4B] hover:text-[#713CE0] font-medium transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#713CE0] shrink-0" />
                        <span>org.secy.cp@srmist.edu.in</span>
                      </a>
                      <a
                        href="mailto:dean.pharmacy.ktr@srmist.edu.in"
                        className="inline-flex items-center gap-1.5 text-[#101B4B] hover:text-[#713CE0] font-medium transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#087E8B] shrink-0" />
                        <span>dean.pharmacy.ktr@srmist.edu.in</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 2: PLACES TO VISIT (FINAL SECTION OF THE PAGE)
           ===================================================================== */}
        <section aria-labelledby="places-to-visit-heading" className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#713CE0] to-[#087E8B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="places-to-visit-heading"
                  className="text-2xl sm:text-[28px] font-bold text-[#101B4B] font-heading tracking-tight leading-tight"
                >
                  Places to Visit
                </h2>
                <p className="text-xs sm:text-[13.5px] text-[#45536B] font-medium">
                  Explore Chennai and its surroundings during your visit to SRMIST.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/85 border border-[#D9D3F9] text-[11.5px] font-semibold text-[#5B21B6] self-start md:self-auto">
              <Car className="w-3.5 h-3.5 text-[#713CE0]" />
              <span>{sortedAttractions.length} attractions · Sorted by driving distance from SRMIST</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {sortedAttractions.map((attraction) => {
              const directionsUrl = buildGoogleMapsDirectionsUrl(attraction.mapsQuery);

              return (
                <article
                  key={attraction.id}
                  className="group bg-white/95 backdrop-blur-md border border-[#D9D3F9] hover:border-[#713CE0]/50 rounded-2xl overflow-hidden shadow-xs hover:shadow-[0_8px_24px_rgba(113,60,224,0.1)] transition-all flex flex-col justify-between h-full"
                >
                  <div>
                    {/* Attraction Image or Clean Neutral Location Fallback */}
                    <div className="w-full aspect-[16/10] overflow-hidden bg-slate-100 relative border-b border-slate-100">
                      {attraction.image ? (
                        <OptimizedPicture
                          src={attraction.image}
                          alt={`${attraction.name}, ${attraction.locality}`}
                          className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-300 block"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#EFEBFD] via-[#F4F7FF] to-[#E6F6FA] flex flex-col items-center justify-center gap-2 p-4 text-center">
                          <div className="w-11 h-11 rounded-full bg-white/90 border border-[#DDD6FE] shadow-2xs flex items-center justify-center text-[#713CE0]">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-semibold text-[#5B21B6]">
                            {attraction.locality}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-[#081B38]/85 backdrop-blur-xs text-white text-[11px] font-bold tabular-nums shadow-xs">
                        {attraction.distanceKm.toFixed(1)} km from SRMIST
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="p-4 space-y-1.5">
                      <h3 className="text-[15px] font-bold text-[#101B4B] font-heading leading-snug group-hover:text-[#5B21B6] transition-colors">
                        {attraction.name}
                      </h3>
                      <p className="text-[11.5px] font-semibold text-[#087E8B] flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{attraction.locality}</span>
                      </p>
                      <p className="text-xs text-[#45536B] leading-relaxed pt-0.5">
                        {attraction.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Verified Distance + Google Maps Directions */}
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
                    <div className="text-[11.5px] font-semibold text-[#334155] tabular-nums">
                      {attraction.distanceKm.toFixed(1)} km
                      {attraction.driveMinutes ? (
                        <span className="text-slate-400 font-normal">
                          {' '}
                          · ~{attraction.driveMinutes} min
                        </span>
                      ) : null}
                    </div>

                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F3EFFE] hover:bg-[#713CE0] text-[#5B21B6] hover:text-white border border-[#DDD6FE] hover:border-[#713CE0] text-[11.5px] font-semibold transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Directions</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

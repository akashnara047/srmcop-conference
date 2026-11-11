import React from 'react';
import {
  MapPin,
  Plane,
  Train,
  Car,
  Compass,
  Building,
  Navigation,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { IMAGES } from '../lib/images';

export const VenueView: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-b from-[#EBF2FF] via-[#F4F1FD] to-[#E9F3FF] min-h-screen font-['Inter',sans-serif] pb-12 sm:pb-16">
      {/* =======================================================================
          1. HERO BANNER – Wide Campus Aerial Photograph with Navy Overlay
         ======================================================================= */}
      <section className="relative w-full overflow-hidden bg-[#081B38] text-white">
        {/* Background Aerial Campus Photograph */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={IMAGES.srmistCampusAerial}
            alt="SRMIST Kattankulathur Campus Aerial Panorama"
            className="w-full h-full object-cover object-center scale-105"
          />
          {/* Deep Navy Gradient Scrim Overlay for high legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#081B38]/95 via-[#0A2246]/85 to-transparent sm:to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081B38] via-transparent to-black/20" />
        </div>

        {/* Content Container */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 z-10 space-y-4">
          {/* Small Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white text-[11px] font-bold tracking-wider uppercase shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>CONFERENCE VENUE</span>
          </div>

          {/* Main Page Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-[44px] lg:text-[46px] font-black font-heading tracking-tight leading-tight max-w-3xl">
            Venue &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#713CE0]">
              Accessibility
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-200 max-w-2xl font-normal leading-relaxed">
            Dr. T. P. Ganesan Auditorium, SRM Institute of Science and Technology (SRMIST), Kattankulathur, Tamil Nadu, India.
          </p>

          {/* Location Indicator Pill */}
          <div className="pt-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm text-xs sm:text-[13px] text-white/95 font-medium shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>Kattankulathur · Chennai · Tamil Nadu · India</span>
            </div>
          </div>
        </div>

        {/* Subtle Wave Cut / Curve along lower edge */}
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

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-8 sm:space-y-10">
        {/* =====================================================================
            2. CONFERENCE VENUE & LOCATION ON GOOGLE MAPS – Two-Column Layout
           ===================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {/* Left Card: Conference Venue */}
          <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden flex flex-col justify-between">
            {/* Pale Lavender Header Banner */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Building className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                Conference Venue
              </h2>
            </div>

            {/* Card Body */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
              {/* Exact Auditorium Photograph Uploaded by User */}
              <div className="relative w-full h-56 sm:h-64 lg:h-[280px] rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs bg-slate-100">
                <img
                  src="/assets/aistudio/image_e62a06de.png"
                  alt="Dr. T. P. Ganesan Auditorium - SRM Institute of Science and Technology, Kattankulathur"
                  className="w-full h-full object-cover object-center hover:scale-102 transition-transform duration-300"
                />
              </div>

              {/* Venue Details */}
              <div className="space-y-1 pt-0.5">
                <h3 className="text-lg sm:text-xl font-bold text-[#101B4B] font-heading">
                  Dr. T. P. Ganesan Auditorium
                </h3>
                <div className="flex items-start gap-2 text-[13px] text-slate-600 leading-relaxed">
                  <MapPin className="w-4 h-4 text-[#713CE0] shrink-0 mt-0.5" />
                  <span>
                    SRM Institute of Science and Technology (SRMIST), Kattankulathur, Tamil Nadu – 603203, India.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Location on Google Maps */}
          <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden flex flex-col justify-between">
            {/* Pale Lavender Header Banner */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Location on Google Maps
                </h2>
              </div>

              {/* External Link directly to user's Google Maps link */}
              <a
                href="https://maps.app.goo.gl/DLUcxqPnt8fQia316"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-[#713CE0] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors"
                title="Open in Google Maps"
              >
                <span>Open App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Card Body with Embedded Map */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
              {/* Responsive Google Maps Iframe */}
              <div className="relative w-full h-56 sm:h-64 lg:h-[280px] rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs bg-slate-100">
                <iframe
                  src="https://maps.google.com/maps?q=Dr.+T.P+Ganesan+Auditorium,+SRM+Institute+of+Science+and+Technology,+Kattankulathur&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                  title="Dr. T. P. Ganesan Auditorium Google Map Location"
                />

                {/* Floating Map Label Badge matching mockup */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-lg shadow-sm text-left max-w-[240px] pointer-events-none hidden sm:block">
                  <strong className="text-[12px] font-bold text-[#101B4B] block leading-tight">
                    Dr. T. P. Ganesan Auditorium
                  </strong>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                    SRMIST, Kattankulathur, Tamil Nadu 603203
                  </span>
                </div>
              </div>

              {/* Map Footer Information */}
              <div className="flex items-center justify-between text-[12px] text-slate-500 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#713CE0]" />
                  <span>Coordinates: 12.8248° N, 80.0467° E</span>
                </div>
                <a
                  href="https://maps.app.goo.gl/DLUcxqPnt8fQia316"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#713CE0] hover:underline font-semibold"
                >
                  View larger map
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            3. HOW TO REACH THE VENUE – Two-Column Grid with 4 Cards
           ===================================================================== */}
        <section className="space-y-4">
          {/* Section Heading Bar */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Navigation className="w-4 h-4" />
            </div>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#101B4B] font-heading tracking-tight">
              How to Reach the Venue
            </h2>
            <div className="hidden sm:block flex-1 h-[1px] bg-gradient-to-r from-[#D9D3F9] to-transparent ml-2" />
          </div>

          {/* 4 Transport Cards in a 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Card 1: Suburban Railway – Potheri Halt */}
            <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl p-5 shadow-[0_4px_20px_rgba(113,60,224,0.05)] hover:shadow-md transition-shadow space-y-3">
              {/* Header with Icon and Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE9FD] text-[#713CE0] flex items-center justify-center shrink-0 shadow-2xs">
                    <Train className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#101B4B] font-heading leading-snug">
                      Suburban Railway – Potheri Halt
                    </h3>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#713CE0] mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>≈ 1 – 1.5 km (Walkable)</span>
                    </div>
                  </div>
                </div>

                {/* Nearest Station Pill Badge */}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  Nearest Station
                </span>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-1.5 text-[13px] text-slate-600 leading-relaxed pt-1">
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Potheri Halt Railway Station (POTI) is located opposite the SRMIST Kattankulathur campus.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Part of the Chennai suburban railway network (Chennai Beach – Tambaram – Chengalpattu line).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>From Chennai, board a train towards Chengalpattu and alight at Potheri.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Reach the campus entrance and follow the signs to the auditorium.</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Chennai International Airport (MAA) */}
            <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl p-5 shadow-[0_4px_20px_rgba(113,60,224,0.05)] hover:shadow-md transition-shadow space-y-3">
              {/* Header with Icon */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FD] text-[#713CE0] flex items-center justify-center shrink-0 shadow-2xs">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#101B4B] font-heading leading-snug">
                    Chennai International Airport (MAA)
                  </h3>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#713CE0] mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>≈ 23 – 25 km (≈ 45 – 60 minutes by road)</span>
                  </div>
                </div>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-1.5 text-[13px] text-slate-600 leading-relaxed pt-1">
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Nearest major airport for domestic and international delegates.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Prepaid taxis and app-based cab services are readily available.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>The nearest suburban station to the airport is Tirusulam, opposite the airport.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>From Tirusulam, take a suburban train towards Chengalpattu and alight at Potheri, or travel directly by taxi via GST Road.</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Long-Distance Railway Connectivity */}
            <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl p-5 shadow-[0_4px_20px_rgba(113,60,224,0.05)] hover:shadow-md transition-shadow space-y-3.5">
              {/* Header with Icon */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FD] text-[#713CE0] flex items-center justify-center shrink-0 shadow-2xs">
                  <Train className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#101B4B] font-heading leading-snug">
                    Long-Distance Railway Connectivity
                  </h3>
                </div>
              </div>

              {/* Subsection 1: Chennai Central */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[14px] font-bold text-[#101B4B] flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-[#713CE0]" />
                    <span>Chennai Central – Dr. MGR Central Railway Station</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EDE9FD] text-[#713CE0] border border-[#DDD6FE] shrink-0">
                    ≈ 42 km
                  </span>
                </div>
                <ul className="space-y-1 text-[13px] text-slate-600 pl-5">
                  <li className="list-disc">Major arrival point for delegates from other Indian states.</li>
                  <li className="list-disc">From Chennai Central, reach Chennai Park suburban station, board a train towards Chengalpattu and alight at Potheri, or travel by road.</li>
                </ul>
              </div>

              {/* Subsection 2: Chennai Egmore */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[14px] font-bold text-[#101B4B] flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-[#713CE0]" />
                    <span>Chennai Egmore Railway Station</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EDE9FD] text-[#713CE0] border border-[#DDD6FE] shrink-0">
                    ≈ 40 km
                  </span>
                </div>
                <ul className="space-y-1 text-[13px] text-slate-600 pl-5">
                  <li className="list-disc">Another key long-distance railway terminal.</li>
                  <li className="list-disc">Suburban services towards Chengalpattu connect to Potheri.</li>
                </ul>
              </div>
            </div>

            {/* Card 4: Road Connectivity */}
            <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl p-5 shadow-[0_4px_20px_rgba(113,60,224,0.05)] hover:shadow-md transition-shadow space-y-3">
              {/* Header with Icon */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FD] text-[#713CE0] flex items-center justify-center shrink-0 shadow-2xs">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#101B4B] font-heading leading-snug">
                    Road Connectivity
                  </h3>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#713CE0] mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Via GST Road (NH 45)</span>
                  </div>
                </div>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-1.5 text-[13px] text-slate-600 leading-relaxed pt-1">
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>SRMIST Kattankulathur campus is situated along the GST Road corridor (NH 45).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Approximately 15 km from Tambaram.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Accessible by private vehicles, taxis and app-based cab services.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>MTC and other bus services operate along GST Road towards Chengalpattu, with stops at SRM College / Potheri.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#713CE0] font-bold">•</span>
                  <span>Visitors arriving through Kilambakkam (CMBT South / KCBT) can continue towards Kattankulathur by road or connecting public transport.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. EXPLORE CHENNAI – Tourist Attractions (5 Cards in a Row)
           ===================================================================== */}
        <section className="space-y-4">
          {/* Section Heading Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Camera className="w-4 h-4" />
              </div>
              <h2 className="text-2xl sm:text-[28px] font-bold text-[#101B4B] font-heading tracking-tight">
                Explore Chennai
              </h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-[#713CE0] font-medium">
              Make the most of your visit by exploring some popular attractions around Chennai.
            </p>
          </div>

          {/* 5 Attraction Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
            {[
              {
                id: 'kapaleeshwarar',
                name: 'Kapaleeshwarar Temple',
                locationSubtitle: 'Chennai',
                distance: '≈ 40 km',
                image: '/assets/attractions/kapaleeshwarar_temple.png',
              },
              {
                id: 'mahabalipuram',
                name: 'Mahabalipuram',
                locationSubtitle: 'UNESCO World Heritage Site',
                distance: '≈ 60 km',
                image: '/assets/attractions/mahabalipuram.png',
              },
              {
                id: 'marina_beach',
                name: 'Marina Beach',
                locationSubtitle: 'Chennai',
                distance: '≈ 42 km',
                image: '/assets/attractions/marina_beach.png',
              },
              {
                id: 'fort_st_george',
                name: 'Fort St. George',
                locationSubtitle: 'Chennai',
                distance: '≈ 43 km',
                image: '/assets/attractions/fort_st_george.png',
              },
              {
                id: 'vgp_marine',
                name: 'VGP Marine Kingdom',
                locationSubtitle: 'Chennai',
                distance: '≈ 48 km',
                image: '/assets/attractions/vgp_marine_kingdom.png',
              },
            ].map((attraction) => (
              <div
                key={attraction.id}
                className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full"
              >
                {/* Fixed 16:9 Aspect Ratio Image Container */}
                <div className="w-full aspect-video overflow-hidden bg-slate-100 rounded-t-2xl">
                  <img
                    src={attraction.image}
                    alt={attraction.name}
                    className="w-full h-full object-cover object-center block"
                  />
                </div>

                {/* Attraction Details */}
                <div className="p-3 sm:p-3.5 space-y-1.5 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-sm sm:text-[15px] font-bold text-[#101B4B] font-heading leading-tight truncate">
                      {attraction.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] sm:text-[12px] font-semibold text-[#713CE0]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{attraction.distance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

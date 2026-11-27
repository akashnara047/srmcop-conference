import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Award, ExternalLink, FlaskConical, Mic, User, X } from 'lucide-react';
import { SectionBackToTop } from './BackToTop';
import { OptimizedPicture } from './OptimizedImage';

export type SpeakerCategory = 'International' | 'National';

export interface InvitedSpeakerProfile {
  id: string;
  category: SpeakerCategory;
  name: string;
  specialty: string;
  designation: string;
  department?: string;
  affiliation?: string;
  additionalPositions?: string[];
  biography: string;
  researchInterests?: string[];
  researchHighlights?: string[];
  achievements?: string[];
  officialProfileUrl?: string;
  officialProfileLabel?: string;
  /**
   * Confirmed or provisional talk title.
   */
  provisionalTalkTitle: string;
  isTalkConfirmed?: boolean;
  isTalkPending?: boolean;
  photoUrl?: string;
  photoPosition?: string;
}

/**
 * Editable speaker & provisional talk-title configuration.
 * Replace `provisionalTalkTitle` strings when official titles are confirmed.
 * Replace missing `photoUrl` entries with verified portrait image paths when provided.
 */
const INVITED_SPEAKERS_DATA: InvitedSpeakerProfile[] = [
  {
    id: 'speaker-1',
    category: 'International',
    name: 'Professor Dr. Geetha Subramaniam',
    specialty: 'Pharmaceutical Science & Biotechnology',
    designation: 'Professor',
    affiliation: 'INTI International University, Malaysia',
    biography:
      "Professor Dr. Geetha Subramaniam is a Professor at INTI International University, Malaysia. She graduated from the University of Malaya (UM) in 1999 with a PhD in Medical Virology.\n\nHer academic leadership experience includes five years as Head of Programme for the Bachelor of Biotechnology, followed by serving as Dean of the Faculty and Interim Pro-Vice Chancellor for Academic Operations at INTI International University. She subsequently redirected her focus towards research excellence.\n\nShe currently serves as Deputy Chair of the Safety, Security and Health Committee and is a certified ISO 45001:2018 auditor and former Lead Auditor. As a founding member of INTI's ESG Task Force, she has championed projects integrating ESG principles across the institution.\n\nWith more than 30 years of research experience, her primary research interests include antibiotic resistance in pathogens and antimicrobial susceptibility profiling to support treatment decisions. She also investigates indigenous herbs for antimicrobial activity and their potential to replace or enhance conventional antibiotics.\n\nHer additional research interests include the utilisation of agro-economic waste for mushroom cultivation, supported by an industrial grant, and vaccine hesitancy towards COVID-19 vaccines. Her research team has published three Scopus-cited papers on COVID-19 vaccine hesitancy.\n\nHer achievements include the Asia International Research Awards in Microbiology (2023), invitations as a keynote speaker at international conferences in India, Uzbekistan, Prague and Indonesia, and appointment as Adjunct Professor at Sharda University, Delhi, in 2025.\n\nShe brings six years of diagnostic laboratory experience into her teaching and actively encourages student research through final-year project supervision, with several resulting publications in Scopus-cited journals.\n\nHer educational achievements include a National Teaching Excellence Award from the Private Education Cooperation in 2022, selection as a panelist for EDUTech Asia 2024 and recognition as an Australian Fellowship Awards (DFAT) recipient in 2025.",
    researchInterests: [
      'Medical Virology',
      'Antibiotic Resistance',
      'Antimicrobial Susceptibility',
      'Herbal Antimicrobials',
      'Vaccine Hesitancy',
      'COVID-19 Research',
      'Sustainable Biotechnology',
      'Mushroom Cultivation',
      'ESG in Higher Education',
    ],
    provisionalTalkTitle:
      'From Algorithm to Bedside – How AI is rewiring drug discovery and development',
    isTalkConfirmed: true,
    photoUrl: '/assets/aistudio/Prof._Geetha_new_profile_pic_2383af5d.jpg',
    photoPosition: 'object-[50%_24%]',
  },
  {
    id: 'speaker-2',
    category: 'International',
    name: 'Prof. Claudiu T. Supuran',
    specialty: 'Medicinal Chemistry & Enzyme Inhibition',
    designation: 'Full Professor of Medicinal Chemistry',
    affiliation: 'University of Florence, Italy',
    biography:
      'Prof. Claudiu T. Supuran is an internationally recognised medicinal chemist whose research focuses on the medicinal chemistry and biochemistry of metalloenzymes, particularly carbonic anhydrases. His work includes the discovery and characterisation of carbonic anhydrase families and isoforms, the design of novel enzyme inhibitors and activators, and investigation of their molecular mechanisms and therapeutic applications. One of the inhibitors developed in his laboratory, SLC-0111, is currently in Phase 1b/2 clinical trials for metastatic hypoxic tumours.',
    provisionalTalkTitle:
      'Human versus artificial intelligence in drug design of enzyme inhibitors, exemplified by carbonic anhydrases',
    isTalkConfirmed: true,
    photoUrl: '/assets/aistudio/Supuran_photo_ea0209e5.jpg',
  },
  {
    id: 'speaker-3',
    category: 'National',
    name: 'Maitri Sanghavi, M.S.',
    specialty: 'Biopharmaceutics & Mechanistic Modelling',
    designation: 'Research Scientist, Simcyp, Certara',
    biography:
      'Maitri Sanghavi is a Research Scientist with the Simcyp division of Certara, specialising in biopharmaceutics and mechanistic modelling and simulation for drug product development. She holds an M.S. in Pharmaceutical Sciences from the National Institute of Pharmaceutical Education and Research (NIPER), Mohali, and has approximately ten years of pharmaceutical industry experience.\n\nHer expertise includes physiologically based pharmacokinetic (PBPK) modelling, physiologically based biopharmaceutics modelling (PBBM), in vitro–in vivo correlation (IVIVC/IVIVR), virtual bioequivalence, formulation optimisation, food-effect assessment and model-informed drug development. Her work also involves applying modelling approaches to support regulatory submissions and pharmaceutical development decisions.',
    provisionalTalkTitle:
      'Role of MIDD to accelerate the drug development process and regulatory approvals',
    isTalkConfirmed: true,
    photoUrl: '/assets/aistudio/image_4c8c2952.png',
    photoPosition: 'object-[50%_26%]',
  },
  {
    id: 'speaker-4',
    category: 'International',
    name: 'Prof. Michael Katz',
    specialty: 'Clinical Research & Pharmacy',
    designation: 'Professor',
    affiliation: 'University of Arizona College of Pharmacy, Tucson, Arizona, USA.',
    biography:
      'Professor Michael Katz is a distinguished academic at the University of Arizona College of Pharmacy, where he has served as Professor since 1979. With over 47 years of academic experience, his professional expertise includes clinical research, pharmacy and pharmaceutical practice. He holds a Pharm.D. degree from the University of Kentucky and a B.S. in Pharmacy from Massachusetts College of Pharmacy and Health Sciences.',
    provisionalTalkTitle: 'Clinical Research and Translational Pharmacy: Current Perspectives',
    photoUrl: '/assets/aistudio/micheal_katz_7596f691.jpg',
  },
  {
    id: 'speaker-5',
    category: 'National',
    name: 'Dr. Biswadip Banerji',
    specialty: 'Organic & Medicinal Chemistry',
    designation:
      'Scientist-G and Head, Organic & Medicinal Chemistry Division and Central Instrumentation Facility Division',
    affiliation:
      'Organic & Medicinal Chemistry Division, Indian Institute of Chemical Biology (CSIR-IICB), 4, Raja S. C. Mullick Road, Jadavpur, Kolkata, India – 700032.',
    biography:
      'Dr. Biswadip Banerji is an accomplished organic chemist whose research integrates innovative synthetic chemistry with biomedical applications. His work focuses on developing novel synthetic methodologies for constructing libraries of biologically relevant small molecules (NCEs), followed by their systematic biological evaluation. His research experience includes postdoctoral work at the University of Oxford, UK, and the Institute of Chemical and Engineering Sciences, Singapore. Prior to joining CSIR-IICB, he served as a Team Leader at TCG Lifesciences, Kolkata.',
    provisionalTalkTitle: 'Developing a Hybrid PARP-1 Inhibitor; Glioma and Our Recent Results',
    isTalkConfirmed: true,
    photoUrl: '/assets/aistudio/PP-26_5b724be8.jpg',
    photoPosition: 'object-top',
  },
  {
    id: 'speaker-6',
    category: 'International',
    name: 'Dr. Parthiban Periasamy',
    specialty: 'AI-Driven Proteomics & Immunopeptidomics',
    designation: 'Senior Scientist and Lead Mass Spectrometry Scientist',
    affiliation: 'A*STAR – Institute of Molecular and Cell Biology, Singapore',
    biography:
      "Dr. Parthiban Periasamy is a Senior Scientist and Lead Mass Spectrometry Scientist at A*STAR's Institute of Molecular and Cell Biology, Singapore. He holds a PhD from QIMR Berghofer and The University of Queensland. He combines artificial intelligence with proteomics and immunopeptidomics, using AI-predicted small molecules to increase neoantigen presentation and improve cancer immunotherapy.",
    provisionalTalkTitle:
      'Beyond the Algorithm: Benefits and Limitations of AI in Small-Molecule Discovery, and How Pharmacologists Can Bridge AI and Conventional Drug Development',
    isTalkConfirmed: true,
    photoUrl: '/assets/aistudio/Profile_Photo_Blue_Suit_White_BG_600dpi_d48a8fa1.jpg',
    photoPosition: 'object-top',
  },
  {
    id: 'speaker-7',
    category: 'National',
    name: 'Prof. Swati Biswas',
    specialty: 'Nanomedicine & Targeted Drug Delivery',
    designation: 'Professor',
    department: 'Department of Pharmacy',
    affiliation: 'Birla Institute of Technology and Science (BITS) Pilani, Hyderabad Campus, India.',
    additionalPositions: [
      'Principal Investigator, Nanomedicine Research Laboratory.',
      'Director, Krishavaa LifeSciences.',
    ],
    biography:
      'Prof. Swati Biswas is a Professor in the Department of Pharmacy at BITS Pilani, Hyderabad Campus, and Principal Investigator of the Nanomedicine Research Laboratory. She is also Director of Krishavaa LifeSciences. Her research focuses on the development of advanced nanomedicine platforms and targeted therapeutic delivery systems for cancer, ocular diseases and infectious conditions.\n\nHer research encompasses multifunctional nanocarriers, combination chemotherapy, photothermal and photodynamic therapy, ocular drug delivery, antimicrobial nanotherapeutics and peptide-based therapeutic strategies. Her work integrates pharmaceutical formulation, nanotechnology and translational drug delivery to develop innovative approaches for challenging therapeutic conditions.',
    researchInterests: [
      'Pharmaceutical Nanotechnology',
      'Nanomedicine',
      'Targeted Drug Delivery',
      'Cancer Nanotherapeutics',
      'Photothermal Therapy',
      'Photodynamic Therapy',
      'Ocular Therapeutics',
      'Antimicrobial Peptides',
      'Antimicrobial Resistance',
      'Smart Wound Dressings',
      'Tissue Regeneration',
    ],
    researchHighlights: [
      'Brain-targeted nanotherapeutics for neuroprotection and ischemic stroke.',
      'Multifunctional nanoplatforms for combination cancer therapy.',
      'Light-responsive therapeutic delivery systems.',
      'Antimicrobial nanomedicine for infected wounds and ocular infections.',
      'Peptide-based approaches to combat antimicrobial resistance.',
    ],
    achievements: [
      'Featured among World Top 2% Scientists, 2025.',
      'Shri B.K. Birla and Smt. Sarala Birla Chair Professor at BITS Pilani, 2025.',
      'Recognised by ScholarGPS among the top 0.5% scholars worldwide, 2025.',
    ],
    officialProfileUrl: 'https://www.bits-pilani.ac.in/hyderabad/prof-swati-biswas/',
    officialProfileLabel: 'Official Faculty Profile – BITS Pilani',
    provisionalTalkTitle:
      'SMART Nanocarriers for Drug Delivery to Treat Cancer and Infectious Diseases',
    isTalkConfirmed: true,
    photoUrl: '/assets/aistudio/swati_biswas_68b10bbf.jpg',
    photoPosition: 'object-[50%_18%]',
  },
  {
    id: 'speaker-8',
    category: 'National',
    name: 'Dr. Parven Kumar Luthra',
    specialty: 'API R&D & Pharmaceutical Process Chemistry',
    designation: 'Chief Scientific Officer – API R&D',
    affiliation: 'Apitoria Pharma Pvt. Ltd. (100% subsidiary of Aurobindo Pharma Ltd.)',
    biography:
      'Dr. Parven Kumar Luthra is a pharmaceutical research and development leader with extensive experience in active pharmaceutical ingredient (API) development, process chemistry and pharmaceutical innovation. He currently serves as Chief Scientific Officer – API R&D at Apitoria Pharma Pvt. Ltd., a subsidiary of Aurobindo Pharma Ltd.\n\nHe holds a Ph.D. in Organic Chemistry from the University of Delhi and a postgraduate diploma in Patent Law from NALSAR University. His professional experience spans API research and development, process development, process optimisation, scale-up, technology transfer, intellectual property management and regulatory considerations. His work has contributed to pharmaceutical process innovation and the development of non-infringing manufacturing processes.',
    researchInterests: [
      'API Research and Development',
      'Process Chemistry and Development',
      'Process Optimisation and Scale-up',
      'Pharmaceutical Process Innovation',
      'Intellectual Property and Patent Strategy',
      'Technology Transfer',
    ],
    provisionalTalkTitle: 'To be announced',
    isTalkPending: true,
    photoUrl: '/assets/aistudio/image_4fc91463.png',
    photoPosition: 'object-[50%_12%]',
  },
];

export const SpeakersView: React.FC = () => {
  const [selectedSpeaker, setSelectedSpeaker] = useState<InvitedSpeakerProfile | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Lock background scroll, bind Escape key, and manage dialog focus while modal is open
  useEffect(() => {
    if (!selectedSpeaker) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedSpeaker(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      lastTriggerRef.current?.focus();
    };
  }, [selectedSpeaker]);

  const handleOpenSpeaker = (
    speaker: InvitedSpeakerProfile,
    triggerElement: HTMLButtonElement
  ) => {
    lastTriggerRef.current = triggerElement;
    setSelectedSpeaker(speaker);
  };

  return (
    <div className="w-full overflow-x-hidden">
      <section
        className="relative min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] bg-[#F4FAFC] flex flex-col justify-between py-10 sm:py-12 overflow-hidden"
      >
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <OptimizedPicture
            src="/assets/aistudio/background_88a32b7f.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            sizes="100vw"
            loading="eager"
          />
        </div>

        <div className="relative z-10 w-[95%] max-w-[1680px] mx-auto space-y-6">
          {/* Section Heading */}
          <div className="text-center space-y-2.5 max-w-4xl mx-auto pb-1">
            {/* Flanked Pill Badge: GLOBAL EXPERTS & THOUGHT LEADERS */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#7554D9]/40" />
              <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-sm">
                <Mic className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase">
                  GLOBAL EXPERTS &amp; THOUGHT LEADERS
                </span>
              </div>
              <div className="w-10 sm:w-16 md:w-24 h-[1.5px] bg-[#22C5D9]/50" />
            </div>

            {/* Main Heading: Meet Our Invited Speakers */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-black text-[#082746] font-heading tracking-tight leading-[1.18]">
              Meet Our{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] bg-clip-text text-transparent">
                  Invited Speakers
                </span>
                <svg
                  aria-hidden="true"
                  className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-2"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="speakersTitleUnderline" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7554D9" />
                      <stop offset="50%" stopColor="#8B50E8" />
                      <stop offset="100%" stopColor="#22C5D9" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,5 Q50,0 100,5"
                    stroke="url(#speakersTitleUnderline)"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          </div>

          {/* Categorised Speaker Sections (International Speakers & National Speakers) */}
          {(['International', 'National'] as const).map((category) => {
            const categorySpeakers = INVITED_SPEAKERS_DATA.filter(
              (speaker) => speaker.category === category
            );
            const headingLabel =
              category === 'International' ? 'International Speakers' : 'National Speakers';

            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#082746] font-heading tracking-tight whitespace-nowrap">
                    {headingLabel}
                  </h2>
                  <div
                    className={`h-[1.5px] flex-1 bg-gradient-to-r ${
                      category === 'International'
                        ? 'from-[#7554D9]/35 via-[#22C5D9]/25'
                        : 'from-[#087E8B]/35 via-[#7554D9]/25'
                    } to-transparent`}
                  />
                </div>

                {/* 4-Column Desktop Grid (lg+), 2-Col Tablet (md), 1-Col Mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                  {categorySpeakers.map((speaker) => (
                    <button
                      key={speaker.id}
                      type="button"
                      onClick={(e) => handleOpenSpeaker(speaker, e.currentTarget)}
                      aria-label={`View speaker details for ${speaker.name}`}
                      className="group w-full h-full text-left bg-white/94 hover:bg-white border border-[#DDD6FE]/90 hover:border-[#7554D9]/60 rounded-2xl p-3.5 sm:p-4 shadow-[0_6px_20px_rgba(117,84,217,0.06)] hover:shadow-[0_12px_28px_rgba(117,84,217,0.12)] transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7554D9]"
                    >
                      {/* Top Group: Compact 4:3 Photo + Speaker Identity */}
                      <div className="w-full">
                        {/* 1. Compact Speaker Photograph (~125–140px desktop height) or Neutral Placeholder */}
                        <div className="w-full aspect-[4/3] max-h-[210px] lg:aspect-auto lg:h-[132px] xl:h-[138px] rounded-xl overflow-hidden bg-gradient-to-br from-[#EDE9FE]/85 via-[#F5F2FF] to-[#E6F4FE]/85 border border-[#E4DDFB]/85 flex items-center justify-center mb-3">
                          {speaker.photoUrl ? (
                            <OptimizedPicture
                              src={speaker.photoUrl}
                              alt={speaker.name}
                              className={`w-full h-full object-cover ${
                                speaker.photoPosition || 'object-[50%_20%]'
                              } transition-transform duration-300 group-hover:scale-[1.02]`}
                              sizes="(max-width: 768px) 100vw, 360px"
                              loading={category === 'International' ? 'eager' : 'lazy'}
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex flex-col items-center justify-center text-[#7554D9]/45 select-none"
                            >
                              <User className="w-12 h-12 stroke-[1.4]" />
                            </div>
                          )}
                        </div>

                        {/* 2–5. Name, Research Specialty, Designation, Institutional Affiliation */}
                        <div className="min-w-0">
                          <h3 className="text-[17px] xl:text-[18px] font-bold text-[#082746] font-heading leading-snug">
                            {speaker.name}
                          </h3>

                          <p className="text-[12.5px] xl:text-[13px] font-semibold text-[#087E8B] leading-snug mt-0.5">
                            {speaker.specialty}
                          </p>

                          <p className="text-[12px] xl:text-[12.5px] font-medium text-[#1E293B] leading-snug mt-1">
                            {speaker.department
                              ? `${speaker.designation}, ${speaker.department}`
                              : speaker.designation}
                          </p>

                          {speaker.affiliation && (
                            <p className="text-[12px] font-normal text-[#475569] leading-snug mt-0.5">
                              {speaker.affiliation}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom Group: Compact Talk Panel + View Speaker Details Indicator */}
                      <div className="w-full mt-3 space-y-2.5">
                        {/* 6. Compact Pale-Lavender Talk Panel */}
                        <div className="bg-gradient-to-r from-[#F3EFFD] via-[#F5F2FE] to-[#EFF7FE] border border-[#E4DDFB] rounded-xl px-2.5 py-2.5 flex items-start gap-2">
                          <div className="w-6 h-6 rounded-md bg-white/90 border border-[#DDD6FE] text-[#7554D9] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Mic className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-[12px] xl:text-[12.5px] leading-snug text-[#082746] min-w-0 break-words">
                            <span className="font-bold text-[#7554D9] mr-1">Talk:</span>
                            <span
                              className={
                                speaker.isTalkPending
                                  ? 'font-medium italic text-[#475569]'
                                  : 'font-bold text-[#082746]'
                              }
                            >
                              {speaker.provisionalTalkTitle}
                            </span>
                            {!speaker.isTalkConfirmed && !speaker.isTalkPending && (
                              <>
                                {' '}
                                <span className="text-[11px] font-medium text-[#64748B] italic whitespace-nowrap">
                                  (Provisional)
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* 7. Subtle "View Speaker Details" Cue */}
                        <div className="flex items-center justify-end gap-1 text-[12px] font-semibold text-[#7554D9] group-hover:text-[#5B21B6] transition-colors pr-0.5">
                          <span>View Speaker Details</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Back to Top control */}
        <div className="relative z-10 pt-6">
          <SectionBackToTop variant="light" />
        </div>
      </section>

      {/* =====================================================================
          SPEAKER PROFILE MODAL (Opened on card click; no duplicated talk panel)
         ===================================================================== */}
      {selectedSpeaker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedSpeaker(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="speaker-modal-name"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl bg-white/95 backdrop-blur-md border border-[#DDD6FE] rounded-[24px] p-5 sm:p-7 shadow-[0_24px_60px_rgba(16,27,75,0.22)] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
          >
            {/* Top Bar: SPEAKER PROFILE badge + Close button */}
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EFFD] border border-[#E4DDFB]">
                <span className="w-2 h-2 rounded-full bg-[#7554D9] shrink-0" />
                <span className="text-[11px] font-bold tracking-widest text-[#7554D9] uppercase">
                  SPEAKER PROFILE
                </span>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSelectedSpeaker(null)}
                aria-label="Close speaker profile"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[#F3EFFD] text-slate-600 hover:text-[#7554D9] flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7554D9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Main Body: Large Photo Left + Identity & Full Biography Right */}
            <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
              {/* Left: Larger Speaker Photograph or Neutral Placeholder */}
              <div className="w-full max-w-[260px] mx-auto sm:mx-0 sm:w-[230px] md:w-[250px] aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-[#EDE9FE] via-[#F3EFFE] to-[#E6ECFF] border border-[#DDD6FE] shrink-0 flex items-center justify-center shadow-xs">
                {selectedSpeaker.photoUrl ? (
                  <OptimizedPicture
                    src={selectedSpeaker.photoUrl}
                    alt={selectedSpeaker.name}
                    className="w-full h-full object-cover object-top"
                    sizes="260px"
                    loading="eager"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex flex-col items-center justify-center text-[#7554D9]/45 select-none"
                  >
                    <User className="w-20 h-20 stroke-[1.3]" />
                  </div>
                )}
              </div>

              {/* Right: Identity Details + Divider + About the Speaker + Full Biography */}
              <div className="min-w-0 flex-1">
                <h2
                  id="speaker-modal-name"
                  className="text-[23px] sm:text-[26px] font-bold text-[#082746] font-heading leading-tight"
                >
                  {selectedSpeaker.name}
                </h2>

                <p className="text-[15px] sm:text-[16px] font-semibold text-[#087E8B] leading-snug mt-1">
                  {selectedSpeaker.specialty}
                </p>

                <p className="text-[14px] sm:text-[14.5px] font-medium text-[#1E293B] leading-snug mt-2">
                  {selectedSpeaker.department
                    ? `${selectedSpeaker.designation}, ${selectedSpeaker.department}`
                    : selectedSpeaker.designation}
                </p>

                {selectedSpeaker.affiliation && (
                  <p className="text-[13.5px] sm:text-[14px] font-normal text-[#475569] leading-snug mt-0.5">
                    {selectedSpeaker.affiliation}
                  </p>
                )}

                {selectedSpeaker.additionalPositions &&
                  selectedSpeaker.additionalPositions.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[13px] sm:text-[13.5px] text-[#334155]">
                      {selectedSpeaker.additionalPositions.map((position) => (
                        <li key={position} className="flex items-start gap-1.5 leading-snug">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7554D9]/70 shrink-0" />
                          <span>{position}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                <div className="my-4 border-t border-[#E6E0F8]" />

                <h3 className="text-[16px] sm:text-[17px] font-bold text-[#082746] font-heading mb-1.5">
                  About the Speaker
                </h3>

                <div className="space-y-2.5 text-[14px] sm:text-[15px] font-normal text-[#334155] leading-relaxed">
                  {selectedSpeaker.biography.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>

                {selectedSpeaker.researchInterests &&
                  selectedSpeaker.researchInterests.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#082746] mb-2">
                        Research Interests
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSpeaker.researchInterests.map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium bg-[#F3EFFD] text-[#5B21B6] border border-[#E4DDFB]"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedSpeaker.researchHighlights &&
                  selectedSpeaker.researchHighlights.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-[#ECE7FA]">
                      <h4 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-[#082746] mb-2">
                        <FlaskConical className="w-3.5 h-3.5 text-[#087E8B] shrink-0" />
                        <span>Selected Research Themes</span>
                      </h4>
                      <ol className="space-y-1.5 text-[13.5px] sm:text-[14px] text-[#334155] leading-snug">
                        {selectedSpeaker.researchHighlights.map((theme, idx) => (
                          <li key={theme} className="flex items-start gap-2">
                            <span className="text-[12px] font-bold text-[#087E8B] tabular-nums mt-0.5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span>{theme}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                {selectedSpeaker.achievements &&
                  selectedSpeaker.achievements.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-[#ECE7FA]">
                      <h4 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-[#082746] mb-2">
                        <Award className="w-3.5 h-3.5 text-[#7554D9] shrink-0" />
                        <span>Selected Distinctions &amp; Recognition</span>
                      </h4>
                      <ul className="space-y-1.5 text-[13.5px] sm:text-[14px] text-[#334155] leading-snug">
                        {selectedSpeaker.achievements.map((achievement) => (
                          <li key={achievement} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7554D9] shrink-0" />
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="mt-4 bg-gradient-to-r from-[#F3EFFD] via-[#F5F2FE] to-[#EFF7FE] border border-[#E4DDFB] rounded-xl px-3.5 py-3 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-white/90 border border-[#DDD6FE] text-[#7554D9] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Mic className="w-4 h-4" />
                  </div>
                  <p className="text-[13px] sm:text-[13.5px] leading-snug text-[#082746] min-w-0 break-words">
                    <span className="font-bold text-[#7554D9] mr-1">Talk:</span>
                    <span
                      className={
                        selectedSpeaker.isTalkPending
                          ? 'font-medium italic text-[#475569]'
                          : 'font-bold text-[#082746]'
                      }
                    >
                      {selectedSpeaker.provisionalTalkTitle}
                    </span>
                    {!selectedSpeaker.isTalkConfirmed && !selectedSpeaker.isTalkPending && (
                      <>
                        {' '}
                        <span className="text-[12px] font-medium text-[#64748B] italic whitespace-nowrap">
                          (Provisional)
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {selectedSpeaker.officialProfileUrl && (
                  <div className="mt-3 pt-2.5 border-t border-[#EFEBFB] flex items-center justify-end">
                    <a
                      href={selectedSpeaker.officialProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#475569] hover:text-[#7554D9] transition-colors"
                    >
                      <span>
                        {selectedSpeaker.officialProfileLabel || 'Official Faculty Profile'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

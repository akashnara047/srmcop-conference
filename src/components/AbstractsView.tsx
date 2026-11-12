import React, { useState, useEffect } from 'react';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';
import { IMAGES } from '../lib/images';
import {
  FileText,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  PenLine,
  Users,
  Trash2,
  Plus,
  Tag,
  X,
  Layers,
  ShieldCheck,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
  List,
  Monitor,
  Layout,
  Tv,
  Printer,
  Download,
  Award,
  Sparkles,
  Lock,
  Unlock,
  ExternalLink,
  RefreshCw,
  Calendar,
  Clock,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import confetti from 'canvas-confetti';
import { SectionBackToTop } from './BackToTop';
import {
  verifyRegistrationForAbstractSubmission,
  submitAbstractWithAtomicId,
  generateAcceptanceLetterPDF,
  generateSubmissionReceiptPDF,
  AbstractRecord,
  RegistrationRecord,
} from '../lib/managementService';

interface AbstractsViewProps {
  initialTrackId?: string;
  onNavigateToRegistration?: () => void;
}

interface CoAuthorItem {
  id: string;
  name: string;
  affiliation: string;
}

export const AbstractsView: React.FC<AbstractsViewProps> = ({
  initialTrackId,
  onNavigateToRegistration,
}) => {
  // Navigation toggle: 'submit' (Submit Abstract) | 'track' (Track Status)
  const [activeTab, setActiveTab] = useState<'submit' | 'track'>('submit');

  // =========================================================================
  // STEP 1: REGISTRATION ID VERIFICATION (GATEKEEPER)
  // =========================================================================
  const [registrationIdInput, setRegistrationIdInput] = useState('');
  const [verifyingReg, setVerifyingReg] = useState(false);
  const [verifiedRegistration, setVerifiedRegistration] = useState<RegistrationRecord | null>(null);
  const [regVerificationError, setRegVerificationError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'not_found' | 'payment_pending' | 'already_submitted' | 'general' | null>(null);
  const [linkedExistingAbstractId, setLinkedExistingAbstractId] = useState<string | null>(null);

  // Presenting Author Details (Pre-filled from verified registration)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const [affiliation, setAffiliation] = useState('');

  // =========================================================================
  // STEP 2: ABSTRACT DETAILS & AUTHOR INFORMATION
  // =========================================================================
  const [title, setTitle] = useState('');

  // Co-authors list
  const [coAuthors, setCoAuthors] = useState<CoAuthorItem[]>([
    { id: '1', name: '', affiliation: '' },
    { id: '2', name: '', affiliation: '' },
  ]);

  // Abstract text (Max 250 words)
  const [abstractText, setAbstractText] = useState('');

  // Keywords (3 to 5 keywords required)
  const [keywords, setKeywords] = useState<string[]>([
    'Drug Discovery',
    'HDAC Inhibition',
    'Computational Pharmacology',
  ]);
  const [keywordInput, setKeywordInput] = useState('');

  // =========================================================================
  // STEP 3: SCIENTIFIC TRACK & TYPE OF PRESENTATION
  // =========================================================================
  const [selectedTrack, setSelectedTrack] = useState<string>(initialTrackId || 'track-01');
  const [presentationType, setPresentationType] = useState<
    'Oral Presentation' | 'Poster Presentation' | 'E-Poster Presentation'
  >('Oral Presentation');

  // =========================================================================
  // STEP 4: DECLARATION
  // =========================================================================
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // =========================================================================
  // SUBMISSION, CONFIRMATION MODAL & TRACKING STATES
  // =========================================================================
  const [submitting, setSubmitting] = useState(false);
  const [submittedAbstractData, setSubmittedAbstractData] = useState<AbstractRecord | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [copiedAbstractId, setCopiedAbstractId] = useState(false);
  const [copiedRegId, setCopiedRegId] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Status Lookup state
  const [lookupId, setLookupId] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [searchingLookup, setSearchingLookup] = useState(false);
  const [lookupResult, setLookupResult] = useState<AbstractRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrackId) {
      setSelectedTrack(initialTrackId);
      setActiveTab('submit');
    }
  }, [initialTrackId]);

  // Word count computation
  const computeWordCount = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  const wordCount = computeWordCount(abstractText);
  const isWordCountExceeded = wordCount > 300;

  // Verify Registration ID handler
  const handleVerifyRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegVerificationError(null);
    setErrorType(null);
    setLinkedExistingAbstractId(null);

    const cleanInput = registrationIdInput.trim().toUpperCase();
    if (!cleanInput) {
      setRegVerificationError('Please enter your official Registration ID (e.g. AICONDD001).');
      setErrorType('general');
      return;
    }

    setVerifyingReg(true);
    try {
      const res = await verifyRegistrationForAbstractSubmission(cleanInput);
      const reg = res.registration;
      setVerifiedRegistration(reg);

      // Pre-populate presenting author details
      setFullName(reg.fullName || '');
      setEmail(reg.email || '');
      setMobile(reg.mobile || '');
      setDesignation(reg.courseOrDesignation || '');
      setAffiliation(reg.institution || '');

      // Set presentation preference from registration if specified
      if (reg.presentationPlan) {
        if (reg.presentationPlan.toLowerCase().includes('poster')) {
          setPresentationType('Poster Presentation');
        } else if (reg.presentationPlan.toLowerCase().includes('oral')) {
          setPresentationType('Oral Presentation');
        } else if (reg.presentationPlan.toLowerCase().includes('e-poster')) {
          setPresentationType('E-Poster Presentation');
        }
      }

      setRegVerificationError(null);
      setErrorType(null);
    } catch (err: any) {
      const msg = err.message || 'Registration verification failed.';
      setRegVerificationError(msg);

      if (msg.includes('not found')) {
        setErrorType('not_found');
      } else if (msg.includes('Payment verification is pending')) {
        setErrorType('payment_pending');
      } else if (msg.includes('already been submitted')) {
        setErrorType('already_submitted');
        // Extract abstract ID if present in message
        const match = msg.match(/AICONDD-ABS-\d+/);
        if (match) setLinkedExistingAbstractId(match[0]);
      } else {
        setErrorType('general');
      }
    } finally {
      setVerifyingReg(false);
    }
  };

  const handleResetVerification = () => {
    setVerifiedRegistration(null);
    setRegistrationIdInput('');
    setRegVerificationError(null);
    setErrorType(null);
    setLinkedExistingAbstractId(null);
  };

  // Co-authors handlers
  const handleAddCoAuthor = () => {
    setCoAuthors((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', affiliation: '' },
    ]);
  };

  const handleUpdateCoAuthor = (
    id: string,
    field: 'name' | 'affiliation',
    value: string
  ) => {
    setCoAuthors((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveCoAuthor = (id: string) => {
    setCoAuthors((prev) => prev.filter((item) => item.id !== id));
  };

  // Keywords handlers
  const handleAddKeyword = () => {
    const cleaned = keywordInput.trim().replace(/^,+|,+$/g, '');
    if (!cleaned) return;
    if (keywords.length >= 5) {
      setFormErrors((prev) => ({
        ...prev,
        keywords: 'Maximum 5 keywords permitted.',
      }));
      return;
    }

    if (!keywords.includes(cleaned)) {
      setKeywords((prev) => [...prev, cleaned]);
      setKeywordInput('');
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy.keywords;
        return copy;
      });
    } else {
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keywordToRemove));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1));
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!verifiedRegistration) {
      errors.registration = 'Please verify your official Registration ID first.';
    }

    if (!fullName.trim()) errors.fullName = 'Presenting Author Full Name is required.';
    if (!email.trim()) {
      errors.email = 'Registered Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!mobile.trim()) errors.mobile = 'Mobile Number is required.';
    if (!designation.trim()) errors.designation = 'Academic Designation is required.';
    if (!affiliation.trim()) errors.affiliation = 'Institution / University is required.';

    if (!title.trim()) errors.title = 'Title of the Abstract is required.';

    if (!abstractText.trim()) {
      errors.abstract = 'Abstract content is required.';
    } else if (wordCount > 300) {
      errors.abstract = `Abstract exceeds 300 words limit (current: ${wordCount} words). Please reduce your text to within 300 words.`;
    }

    if (keywords.length < 3) {
      errors.keywords = `Please specify at least 3 keywords (currently ${keywords.length}).`;
    } else if (keywords.length > 5) {
      errors.keywords = 'Maximum 5 keywords allowed.';
    }

    if (!selectedTrack) {
      errors.track = 'Please select a Scientific Track.';
    }

    if (!declarationAccepted) {
      errors.declaration = 'You must accept the originality and co-author consent declaration.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Abstract
  const handleSubmitAbstract = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      setGeneralError('Please review the form and correct the indicated fields before submitting.');
      window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }

    if (!verifiedRegistration) return;

    setSubmitting(true);

    try {
      const regId = verifiedRegistration.registrationId || registrationIdInput.trim().toUpperCase();

      const validCoAuthors = coAuthors
        .filter((c) => c.name.trim() !== '')
        .map((c) => ({
          name: c.name.trim(),
          affiliation: c.affiliation.trim() || affiliation.trim(),
        }));

      // Allocate sequential Abstract ID: AICONDD-ABS-001, AICONDD-ABS-002...
      const allocatedAbstractId = await submitAbstractWithAtomicId({
        registrationId: regId,
        regDocId: verifiedRegistration.id || regId,
        title: title.trim(),
        trackId: selectedTrack,
        presentationPreference: presentationType,
        presentingAuthor: {
          fullName: fullName.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          designation: designation.trim(),
          affiliation: affiliation.trim(),
        },
        coAuthors: validCoAuthors,
        abstractContent: abstractText.trim(),
        keywords,
        recordType: verifiedRegistration.recordType || 'live',
      });

      const submittedRecord: AbstractRecord = {
        id: allocatedAbstractId,
        registrationId: regId,
        title: title.trim(),
        trackId: selectedTrack,
        presentationPreference: presentationType,
        presentingAuthor: {
          fullName: fullName.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          designation: designation.trim(),
          affiliation: affiliation.trim(),
        },
        coAuthors: validCoAuthors,
        abstractContent: { text: abstractText.trim() },
        keywords,
        status: 'Submitted',
        createdAt: new Date().toISOString(),
      };

      setSubmittedAbstractData(submittedRecord);
      setShowConfirmationModal(true);
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 } });
      window.scrollTo({ top: 150, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Abstract submission error:', err);
      setGeneralError(err.message || 'Abstract submission failed. Please verify your Registration ID.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Tracking Lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupId.trim()) return;

    setSearchingLookup(true);
    setLookupResult(null);
    setLookupError(null);

    const queryKey = lookupId.trim().toUpperCase();

    try {
      const snap = await getDoc(doc(db, 'abstractSubmissions', queryKey));
      if (snap.exists()) {
        const data = snap.data() as AbstractRecord;
        if (lookupEmail.trim() && data.presentingAuthor?.email) {
          if (data.presentingAuthor.email.toLowerCase() !== lookupEmail.trim().toLowerCase()) {
            setLookupError('Email address does not match the presenting author on record for this Abstract ID.');
            return;
          }
        }
        setLookupResult(data);
      } else {
        setLookupError(
          `No abstract found matching ID "${queryKey}". Please verify your reference number (Format: AICONDD-ABS-001).`
        );
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setLookupError('Unable to fetch abstract status. Please check your internet connection.');
    } finally {
      setSearchingLookup(false);
    }
  };

  const copyAbstractId = () => {
    if (submittedAbstractData?.id) {
      navigator.clipboard.writeText(submittedAbstractData.id);
      setCopiedAbstractId(true);
      setTimeout(() => setCopiedAbstractId(false), 2000);
    }
  };

  const copyRegId = () => {
    if (submittedAbstractData?.registrationId) {
      navigator.clipboard.writeText(submittedAbstractData.registrationId);
      setCopiedRegId(true);
      setTimeout(() => setCopiedRegId(false), 2000);
    }
  };

  const handleResetForNewSubmission = () => {
    setShowConfirmationModal(false);
    setSubmittedAbstractData(null);
    setVerifiedRegistration(null);
    setRegistrationIdInput('');
    setTitle('');
    setAbstractText('');
    setCoAuthors([
      { id: '1', name: '', affiliation: '' },
      { id: '2', name: '', affiliation: '' },
    ]);
    setKeywords(['Drug Discovery', 'HDAC Inhibition', 'Computational Pharmacology']);
    setDeclarationAccepted(false);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#FAF8FF] via-[#F4F0FF] to-[#FAF8FF] text-slate-800 font-['Inter',sans-serif] relative overflow-hidden pb-20 pt-6">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-[#06B6D4]/12 rounded-full blur-3xl pointer-events-none" />

      <div className="w-[94%] sm:w-[92%] max-w-5xl mx-auto relative z-10 space-y-6">
        {/* =====================================================================
            HERO SECTION: Match approved conference branding
           ===================================================================== */}
        <section className="relative overflow-hidden pt-2 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
            {/* Campus photograph on left */}
            <div className="hidden lg:block w-48 xl:w-56 h-36 rounded-2xl overflow-hidden border-2 border-white/80 shadow-md shrink-0 relative group">
              <img
                src={IMAGES.srmPharmacyBuilding}
                alt="SRM College of Pharmacy"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent flex items-end p-2.5">
                <span className="text-[10px] font-bold text-white tracking-wide">
                  SRM College of Pharmacy
                </span>
              </div>
            </div>

            {/* Central Hero Titles & Action Toggle */}
            <div className="flex-1 text-center space-y-3 z-10 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAE5FC] border border-[#DDD6FE] text-[#6745C5] text-[11px] font-bold tracking-wider uppercase shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-[#6745C5]" />
                <span>PEER-REVIEWED SCIENTIFIC PROCEEDINGS</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black text-[#101B4B] font-heading tracking-tight leading-tight">
                Abstract Submission Portal
              </h1>

              {/* Mode Toggle Buttons: Submit Abstract & Track Status */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className={`px-6 py-2.5 rounded-full text-sm sm:text-[15px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'submit'
                      ? 'bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md scale-102'
                      : 'bg-white/90 hover:bg-white text-[#1E1B4B] border border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Submit Abstract</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('track')}
                  className={`px-6 py-2.5 rounded-full text-sm sm:text-[15px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'track'
                      ? 'bg-gradient-to-r from-[#101B4B] to-[#1E293B] text-white shadow-md scale-102'
                      : 'bg-white/90 hover:bg-white text-[#1E1B4B] border border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>Track Status</span>
                </button>
              </div>
            </div>

            {/* Scientific 3D Capsule & DNA Illustration on right */}
            <div className="hidden lg:block w-48 xl:w-56 h-36 shrink-0 relative flex items-center justify-center select-none pointer-events-none">
              <svg viewBox="0 0 240 180" className="w-full h-full drop-shadow-[0_12px_24px_rgba(113,60,224,0.25)]" fill="none">
                <defs>
                  <radialGradient id="molPurple" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="35%" stopColor="#C084FC" />
                    <stop offset="80%" stopColor="#8B50E8" />
                    <stop offset="100%" stopColor="#581C87" />
                  </radialGradient>
                  <radialGradient id="molCyan" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="35%" stopColor="#67E8F9" />
                    <stop offset="80%" stopColor="#0891B2" />
                    <stop offset="100%" stopColor="#0E7490" />
                  </radialGradient>
                  <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C084FC" />
                    <stop offset="45%" stopColor="#713CE0" />
                    <stop offset="100%" stopColor="#12B8D6" />
                  </linearGradient>
                  <linearGradient id="dnaCurve" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C084FC" />
                    <stop offset="50%" stopColor="#22D3EE" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>

                <path d="M150 20 C180 50 180 80 150 110 C120 140 120 170 150 190" stroke="url(#dnaCurve)" strokeWidth="3" strokeDasharray="4 3" opacity="0.8" />
                <path d="M170 20 C140 50 140 80 170 110 C200 140 200 170 170 190" stroke="url(#dnaCurve)" strokeWidth="3" strokeDasharray="4 3" opacity="0.6" />

                <line x1="30" y1="40" x2="70" y2="75" stroke="#DDD6FE" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="70" y1="75" x2="25" y2="120" stroke="#BAE6FD" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="30" cy="40" r="13" fill="url(#molPurple)" />
                <circle cx="25" cy="120" r="14" fill="url(#molPurple)" />
                <circle cx="70" cy="75" r="17" fill="url(#molPurple)" />

                <g transform="translate(130, 85) rotate(-35)">
                  <rect x="-20" y="-45" width="40" height="90" rx="20" fill="#FFFFFF" fillOpacity="0.4" stroke="#DDD6FE" strokeWidth="2.5" />
                  <path d="M-20,0 L20,0 L20,25 C20,36 11,45 0,45 C-11,45 -20,36 -20,25 Z" fill="url(#capGrad)" fillOpacity="0.95" />
                  <circle cx="0" cy="18" r="9" fill="#FFFFFF" fillOpacity="0.9" />
                  <text x="0" y="21" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#713CE0" fontFamily="sans-serif">
                    AI
                  </text>
                </g>

                <circle cx="185" cy="45" r="11" fill="url(#molCyan)" />
                <circle cx="165" cy="155" r="11" fill="url(#molCyan)" />
              </svg>
            </div>
          </div>
        </section>

        {/* =====================================================================
            TRACK STATUS VIEW
           ===================================================================== */}
        {activeTab === 'track' ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-[#E4E8F4] shadow-sm space-y-6 max-w-3xl mx-auto">
            <div className="space-y-1.5 border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#6D28D9] uppercase font-mono">
                <Search className="w-4 h-4" />
                <span>ABSTRACT STATUS INQUIRY</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                Check Scientific Review Progress
              </h2>
              <p className="text-xs text-slate-500">
                Enter your unique Abstract ID (Format: <code>AICONDD-ABS-001</code>) and registered email address.
              </p>
            </div>

            <form onSubmit={handleLookup} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Abstract ID (e.g. AICONDD-ABS-001)"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  className="h-12 px-4 bg-[#FBFBFF] border border-slate-300 rounded-xl font-mono uppercase text-xs sm:text-sm focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] outline-none transition"
                />

                <input
                  type="email"
                  placeholder="Presenting Author Email (Optional)"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="h-12 px-4 bg-[#FBFBFF] border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={searchingLookup}
                className="w-full h-12 px-6 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:opacity-95 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition"
              >
                <Search className="w-4 h-4" />
                <span>{searchingLookup ? 'Searching Records...' : 'Check Abstract Status'}</span>
              </button>
            </form>

            {lookupError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            {lookupResult && (
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Abstract ID</span>
                    <div className="font-mono font-bold text-lg text-[#101B4B]">{lookupResult.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        lookupResult.status === 'Accepted'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : lookupResult.status === 'Under Review'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : lookupResult.status === 'Rejected'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-purple-100 text-purple-800 border border-purple-300'
                      }`}
                    >
                      {lookupResult.status || 'Submitted'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#101B4B] font-heading">{lookupResult.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Presenting Author: <strong>{lookupResult.presentingAuthor?.fullName || lookupResult.presentingAuthor?.name}</strong> ({lookupResult.presentingAuthor?.affiliation || lookupResult.presentingAuthor?.institution})
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Track</span>
                    <strong className="text-slate-800 truncate block">{lookupResult.trackId}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reg ID</span>
                    <strong className="text-purple-700 font-mono block">{lookupResult.registrationId}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mode</span>
                    <strong className="text-slate-800 block">{lookupResult.presentationPreference}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Submission Date</span>
                    <strong className="text-slate-800 block">
                      {new Date(lookupResult.createdAt).toLocaleDateString('en-GB')}
                    </strong>
                  </div>
                </div>

                {lookupResult.reviewNotes && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Reviewer Notes</span>
                    <p className="text-slate-700">{lookupResult.reviewNotes}</p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => generateSubmissionReceiptPDF(lookupResult)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Submission Receipt (PDF)</span>
                  </button>

                  {lookupResult.status === 'Accepted' && (
                    <button
                      type="button"
                      onClick={() => generateAcceptanceLetterPDF(lookupResult)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition"
                    >
                      <Award className="w-4 h-4" />
                      <span>Download Acceptance Letter (PDF)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =====================================================================
              PRIMARY SUBMISSION FLOW: VERIFY REGISTRATION -> UNLOCK FORM
             ===================================================================== */
          <div className="space-y-6">
            {/* ===================================================================
                SECTION 1: INITIAL REGISTRATION ID VERIFICATION (MANDATORY GATEKEEPER)
               =================================================================== */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-[#E4E8F4] shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                      Verify Your Conference Registration
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Enter the official Registration ID allocated to you after successful conference registration.
                    </p>
                  </div>
                </div>

                {verifiedRegistration && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registration Verified</span>
                  </span>
                )}
              </div>

              {!verifiedRegistration ? (
                /* Unverified State: Registration ID Verification Box */
                <div className="space-y-4">
                  <form onSubmit={handleVerifyRegistration} className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Official Registration ID <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-400 font-mono">Example: AICONDD001</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1 flex items-center">
                          <ShieldCheck className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={registrationIdInput}
                            onChange={(e) => {
                              setRegistrationIdInput(e.target.value.toUpperCase());
                              if (regVerificationError) setRegVerificationError(null);
                            }}
                            placeholder="Enter Registration ID (e.g. AICONDD001)"
                            className={`h-12 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm font-mono text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition ${
                              regVerificationError
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-slate-300 focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={verifyingReg || !registrationIdInput.trim()}
                          className="h-12 px-6 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {verifyingReg ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Verifying Registration ID...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Verify Registration ID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Context-aware friendly verification feedback alerts */}
                  {regVerificationError && (
                    <div className="p-4 rounded-xl border space-y-2 text-xs animate-in fade-in duration-200 bg-red-50/90 border-red-200 text-red-800">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold">{regVerificationError}</p>

                          {errorType === 'not_found' && (
                            <p className="text-[11px] text-red-700 leading-relaxed">
                              Haven't registered for the conference yet? Complete registration to receive your official Registration ID and submit your abstract.
                            </p>
                          )}

                          {errorType === 'payment_pending' && (
                            <p className="text-[11px] text-red-700 leading-relaxed">
                              The organizing secretariat is actively validating transaction references against bank accounts. Once approved by the Organising Secretary, abstract submission will automatically unlock.
                            </p>
                          )}

                          {errorType === 'already_submitted' && linkedExistingAbstractId && (
                            <div className="pt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setLookupId(linkedExistingAbstractId);
                                  setActiveTab('track');
                                }}
                                className="px-3 py-1 bg-purple-700 text-white rounded-lg font-bold text-[11px] hover:bg-purple-800 transition cursor-pointer"
                              >
                                View Linked Abstract ({linkedExistingAbstractId})
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {errorType === 'not_found' && onNavigateToRegistration && (
                        <div className="pt-2 pl-6">
                          <button
                            type="button"
                            onClick={onNavigateToRegistration}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                          >
                            <span>Go to Conference Registration Portal</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Informational callout on verification rules */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Note:</strong> Abstract submission is reserved for registered and verified delegates. Do not enter an Abstract ID here; your unique Abstract ID will be generated automatically upon submission.
                    </div>
                  </div>
                </div>
              ) : (
                /* Verified Banner & Details Summary */
                <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
                            Registration Verified
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-mono text-xs font-bold">
                            {verifiedRegistration.registrationId || registrationIdInput}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm sm:text-base">
                          {verifiedRegistration.fullName}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetVerification}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg self-start sm:self-auto cursor-pointer transition shadow-2xs"
                    >
                      Verify Different ID
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs border-t border-emerald-200/60 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Institution</span>
                      <strong className="text-slate-800">{verifiedRegistration.institution}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Category</span>
                      <strong className="text-slate-800">{verifiedRegistration.category}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Registered Email</span>
                      <strong className="text-slate-800">{verifiedRegistration.email}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ===================================================================
                LOCKED STATE PLACEHOLDER (WHEN NOT YET VERIFIED)
               =================================================================== */}
            {!verifiedRegistration ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-slate-200/80 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center mx-auto shadow-2xs">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-[#101B4B]">
                    Abstract Submission Form is Locked
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Please verify your official conference Registration ID above to unlock the abstract submission fields, author pre-population, and scientific track selection.
                  </p>
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                    <span className="font-bold text-[#7C3AED] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Step 1</span>
                    </span>
                    <p className="text-slate-600 text-[11px]">Enter your official Registration ID (e.g. AICONDD001).</p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                    <span className="font-bold text-[#7C3AED] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Step 2</span>
                    </span>
                    <p className="text-slate-600 text-[11px]">Presenting author fields pre-fill automatically.</p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                    <span className="font-bold text-[#7C3AED] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Step 3</span>
                    </span>
                    <p className="text-slate-600 text-[11px]">Receive sequential Abstract ID & PDF receipt.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* ===================================================================
                  UNLOCKED ABSTRACT SUBMISSION FORM
                 =================================================================== */
              <form onSubmit={handleSubmitAbstract} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {generalError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{generalError}</span>
                  </div>
                )}

                {/* =================================================================
                    FORM SECTION 1: PRESENTING AUTHOR DETAILS (PRE-FILLED)
                   ================================================================= */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#101B4B] font-heading">
                          Presenting Author Details
                        </h3>
                        <p className="text-xs text-slate-500">
                          Pre-populated from your verified conference registration.
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-mono font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{verifiedRegistration.registrationId || registrationIdInput}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {/* Read-Only Registration ID Badge */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Linked Registration ID <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          readOnly
                          value={verifiedRegistration.registrationId || registrationIdInput}
                          className="h-11 pl-10 pr-3.5 w-full rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs sm:text-sm font-mono font-bold text-emerald-900 cursor-not-allowed select-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Locked to your verified registration. Each Registration ID permits one abstract submission.
                      </p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Presenting Author Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
                          }}
                          placeholder="Dr. / Prof. / Scholar Name"
                          className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                            formErrors.fullName ? 'border-red-400' : 'border-slate-200 focus:border-[#7C3AED]'
                          }`}
                        />
                      </div>
                      {formErrors.fullName && <p className="text-[11px] text-red-500">{formErrors.fullName}</p>}
                    </div>

                    {/* Registered Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Registered Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                          }}
                          placeholder="author@institution.edu"
                          className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                            formErrors.email ? 'border-red-400' : 'border-slate-200 focus:border-[#7C3AED]'
                          }`}
                        />
                      </div>
                      {formErrors.email && <p className="text-[11px] text-red-500">{formErrors.email}</p>}
                    </div>

                    {/* Mobile Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => {
                            setMobile(e.target.value);
                            if (formErrors.mobile) setFormErrors((prev) => ({ ...prev, mobile: '' }));
                          }}
                          placeholder="+91 98765 43210"
                          className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                            formErrors.mobile ? 'border-red-400' : 'border-slate-200 focus:border-[#7C3AED]'
                          }`}
                        />
                      </div>
                      {formErrors.mobile && <p className="text-[11px] text-red-500">{formErrors.mobile}</p>}
                    </div>

                    {/* Academic Designation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Academic Designation <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <GraduationCap className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={designation}
                          onChange={(e) => {
                            setDesignation(e.target.value);
                            if (formErrors.designation) setFormErrors((prev) => ({ ...prev, designation: '' }));
                          }}
                          placeholder="e.g. Associate Professor / PhD Scholar"
                          className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                            formErrors.designation ? 'border-red-400' : 'border-slate-200 focus:border-[#7C3AED]'
                          }`}
                        />
                      </div>
                      {formErrors.designation && <p className="text-[11px] text-red-500">{formErrors.designation}</p>}
                    </div>

                    {/* Institution / University */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Institution / University / Department <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Building2 className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={affiliation}
                          onChange={(e) => {
                            setAffiliation(e.target.value);
                            if (formErrors.affiliation) setFormErrors((prev) => ({ ...prev, affiliation: '' }));
                          }}
                          placeholder="e.g. Department of Pharmacology, SRM College of Pharmacy, SRMIST"
                          className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                            formErrors.affiliation ? 'border-red-400' : 'border-slate-200 focus:border-[#7C3AED]'
                          }`}
                        />
                      </div>
                      {formErrors.affiliation && <p className="text-[11px] text-red-500">{formErrors.affiliation}</p>}
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    FORM SECTION 2: ABSTRACT DETAILS & AUTHOR INFORMATION
                   ================================================================= */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-5">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-[#101B4B] font-heading">
                      Abstract Details & Author Information
                    </h3>
                  </div>

                  {/* Title of Abstract */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Title of the Abstract <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <PenLine className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
                        }}
                        placeholder="Enter the complete title of your research abstract"
                        className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                          formErrors.title ? 'border-red-400' : 'border-slate-200 focus:border-[#7C3AED]'
                        }`}
                      />
                    </div>
                    {formErrors.title && <p className="text-[11px] text-red-500">{formErrors.title}</p>}
                  </div>

                  {/* Co-Authors Block */}
                  <div className="space-y-3 pt-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-xs font-bold">
                      <Users className="w-3.5 h-3.5" />
                      <span>Co-Author(s) (Optional)</span>
                    </div>

                    <div className="space-y-3">
                      {coAuthors.map((coAuthor, idx) => (
                        <div key={coAuthor.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          <div className="md:col-span-6 relative flex items-center">
                            <User className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                            <input
                              type="text"
                              value={coAuthor.name}
                              onChange={(e) => handleUpdateCoAuthor(coAuthor.id, 'name', e.target.value)}
                              placeholder={`Co-author ${idx + 1} Name`}
                              className="h-11 pl-10 pr-3.5 w-full rounded-xl border border-slate-200 bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition"
                            />
                          </div>

                          <div className="md:col-span-5 relative flex items-center">
                            <Building2 className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                            <input
                              type="text"
                              value={coAuthor.affiliation}
                              onChange={(e) => handleUpdateCoAuthor(coAuthor.id, 'affiliation', e.target.value)}
                              placeholder="Affiliation / Department"
                              className="h-11 pl-10 pr-3.5 w-full rounded-xl border border-slate-200 bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition"
                            />
                          </div>

                          <div className="md:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveCoAuthor(coAuthor.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Remove co-author"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCoAuthor}
                      className="px-4 py-2 rounded-full border border-[#7C3AED] text-[#7C3AED] bg-white hover:bg-[#EDE9FE]/50 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Co-Author</span>
                    </button>
                  </div>

                  {/* Abstract Content */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Abstract Content <span className="text-red-500">*</span> (Maximum 300 words)
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={abstractText}
                      onChange={(e) => {
                        setAbstractText(e.target.value);
                        if (formErrors.abstract) setFormErrors((prev) => ({ ...prev, abstract: '' }));
                      }}
                      placeholder="Enter structured abstract content (Background, Objectives, Methodology, Results, Conclusion)..."
                      className={`w-full p-4 rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition leading-relaxed ${
                        formErrors.abstract || isWordCountExceeded
                          ? 'border-red-400'
                          : 'border-slate-200 focus:border-[#7C3AED]'
                      }`}
                    />

                    {/* LIVE WORD COUNTER DIRECTLY BELOW INPUT */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-0.5">
                      <div
                        className={`text-xs font-semibold flex items-center gap-2 ${
                          isWordCountExceeded
                            ? 'text-red-600 font-bold'
                            : wordCount > 0
                            ? 'text-purple-700'
                            : 'text-slate-500'
                        }`}
                      >
                        <span className="font-mono">Word Count: {wordCount} / 300</span>
                        {isWordCountExceeded && (
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                            Exceeded by {wordCount - 300} words
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Updates in real time as you type, paste, or edit text
                      </span>
                    </div>

                    {formErrors.abstract && (
                      <p className="text-[11px] text-red-500 pt-0.5">{formErrors.abstract}</p>
                    )}
                  </div>

                  {/* Keywords */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Keywords <span className="text-red-500">*</span> (Specify 3 to 5 keywords)
                      </label>
                      <span className="text-[11px] text-slate-400">{keywords.length} of 5 keywords added</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="relative flex-1 w-full">
                        <Tag className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={handleKeywordKeyDown}
                          placeholder="Type a keyword and press Enter or comma"
                          className="h-11 pl-10 pr-3.5 w-full rounded-xl border border-slate-200 bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        {keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] text-xs font-medium shadow-2xs"
                          >
                            <span>{kw}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(kw)}
                              className="hover:text-red-600 p-0.5 rounded-full cursor-pointer transition"
                              title="Remove keyword"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    {formErrors.keywords && <p className="text-[11px] text-red-500">{formErrors.keywords}</p>}
                  </div>
                </div>

                {/* =================================================================
                    FORM SECTION 3: SCIENTIFIC TRACK & TYPE OF PRESENTATION
                   ================================================================= */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-5">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-[#101B4B] font-heading">
                      Scientific Track & Type of Presentation
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Scientific Track Dropdown */}
                    <div className="lg:col-span-5 space-y-2">
                      <label className="text-sm font-semibold text-slate-700 block">
                        Scientific Track <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedTrack}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-[#FBFBFF] px-3.5 text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition cursor-pointer"
                      >
                        {SCIENTIFIC_TRACKS.map((t) => (
                          <option key={t.id} value={t.id}>
                            Track {t.number}: {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Presentation Preference Cards */}
                    <div className="lg:col-span-7 space-y-2">
                      <label className="text-sm font-semibold text-slate-700 block">
                        Type of Presentation <span className="text-red-500">*</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <label
                          onClick={() => setPresentationType('Oral Presentation')}
                          className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                            presentationType === 'Oral Presentation'
                              ? 'border-[#7C3AED] bg-[#F5F2FF] shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="presentationPreference"
                            checked={presentationType === 'Oral Presentation'}
                            onChange={() => setPresentationType('Oral Presentation')}
                            className="accent-[#7C3AED] w-4 h-4 cursor-pointer"
                          />
                          <Monitor className="w-5 h-5 text-[#7C3AED] shrink-0" />
                          <span className="text-sm font-bold text-slate-800 leading-tight">
                            Oral
                          </span>
                        </label>

                        <label
                          onClick={() => setPresentationType('Poster Presentation')}
                          className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                            presentationType === 'Poster Presentation'
                              ? 'border-[#7C3AED] bg-[#F5F2FF] shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="presentationPreference"
                            checked={presentationType === 'Poster Presentation'}
                            onChange={() => setPresentationType('Poster Presentation')}
                            className="accent-[#7C3AED] w-4 h-4 cursor-pointer"
                          />
                          <Layout className="w-5 h-5 text-[#7C3AED] shrink-0" />
                          <span className="text-sm font-bold text-slate-800 leading-tight">
                            Poster
                          </span>
                        </label>

                        <label
                          onClick={() => setPresentationType('E-Poster Presentation')}
                          className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                            presentationType === 'E-Poster Presentation'
                              ? 'border-[#7C3AED] bg-[#F5F2FF] shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="presentationPreference"
                            checked={presentationType === 'E-Poster Presentation'}
                            onChange={() => setPresentationType('E-Poster Presentation')}
                            className="accent-[#7C3AED] w-4 h-4 cursor-pointer"
                          />
                          <Tv className="w-5 h-5 text-[#7C3AED] shrink-0" />
                          <span className="text-sm font-bold text-slate-800 leading-tight">
                            E-Poster
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    FORM SECTION 4: DECLARATION
                   ================================================================= */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-[#101B4B] font-heading">
                      Declaration
                    </h3>
                  </div>

                  <label className="flex items-start gap-3.5 cursor-pointer pt-1 group">
                    <input
                      type="checkbox"
                      required
                      checked={declarationAccepted}
                      onChange={(e) => {
                        setDeclarationAccepted(e.target.checked);
                        if (formErrors.declaration) setFormErrors((prev) => ({ ...prev, declaration: '' }));
                      }}
                      className="w-5 h-5 mt-0.5 rounded-md accent-[#7C3AED] cursor-pointer shrink-0"
                    />
                    <span className="text-sm sm:text-base text-slate-700 leading-relaxed group-hover:text-slate-900">
                      I hereby declare that the abstract submitted is original, has not been published elsewhere, and all co-authors have consented to its submission for this conference. <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {formErrors.declaration && <p className="text-[11px] text-red-500">{formErrors.declaration}</p>}
                </div>

                {/* =================================================================
                    SUBMISSION BUTTON
                   ================================================================= */}
                <div className="pt-2 text-center">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2.5 px-10 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#06B6D4] text-white text-base sm:text-[17px] font-bold shadow-lg hover:shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Allocating Abstract ID & Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Submit Abstract</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Section Back to Top */}
        <div className="pt-4">
          <SectionBackToTop variant="light" />
        </div>
      </div>

      {/* =======================================================================
          CONFIRMATION DIALOG MODAL (ELEVATED CONFIRMATION DIALOG)
         ======================================================================= */}
      {showConfirmationModal && submittedAbstractData && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-in zoom-in-95 duration-200">
            {/* Header Icon & Title */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OFFICIAL SUBMISSION CONFIRMED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#101B4B] font-heading">
                Abstract Submitted Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                Your abstract has been successfully submitted for the international conference.
              </p>
            </div>

            {/* Conference Particulars Header */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl space-y-1 text-center shadow-xs">
              <div className="text-[11px] font-medium text-cyan-300 uppercase tracking-wider">
                AI-Powered Innovations in Drug Discovery and Development
              </div>
              <div className="text-xs text-slate-300 flex items-center justify-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>15–16 February 2027</span>
                </span>
                <span>•</span>
                <span>SRM College of Pharmacy, SRMIST</span>
              </div>
            </div>

            {/* Official Credentials Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                {/* Assigned Abstract ID */}
                <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-700 uppercase font-bold tracking-wider">
                      Assigned Abstract ID
                    </span>
                    <button
                      type="button"
                      onClick={copyAbstractId}
                      className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition cursor-pointer"
                      title="Copy Abstract ID"
                    >
                      {copiedAbstractId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono font-black text-xl sm:text-2xl text-[#6D28D9]">
                    {submittedAbstractData.id}
                  </div>
                </div>

                {/* Linked Registration ID */}
                <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Registration ID
                    </span>
                    <button
                      type="button"
                      onClick={copyRegId}
                      className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded transition cursor-pointer"
                      title="Copy Registration ID"
                    >
                      {copiedRegId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-slate-800">
                    {submittedAbstractData.registrationId}
                  </div>
                </div>
              </div>

              {/* Submission Particulars */}
              <div className="space-y-2 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500 font-medium">Participant Name:</span>{' '}
                  <strong className="text-slate-900">
                    {submittedAbstractData.presentingAuthor?.fullName || fullName}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Abstract Title:</span>{' '}
                  <strong className="text-slate-900">{submittedAbstractData.title}</strong>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 font-medium">Presentation Preference:</span>{' '}
                    <strong className="text-purple-700">
                      {submittedAbstractData.presentationPreference}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Submission Date:</span>{' '}
                    <strong className="text-slate-800">
                      {new Date(submittedAbstractData.createdAt).toLocaleString('en-GB')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => generateSubmissionReceiptPDF(submittedAbstractData, verifiedRegistration || undefined)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:opacity-95 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Abstract Submission Receipt (PDF)</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setLookupId(submittedAbstractData.id);
                    setActiveTab('track');
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track Review Status</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForNewSubmission}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

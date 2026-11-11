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
  Clock,
  ArrowRight,
  BookOpen,
  List,
  Monitor,
  Layout,
  Tv,
  Printer,
  Download,
  Award,
  Sparkles,
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
  // SECTION 1: REGISTRATION ID & PRESENTING AUTHOR DETAILS
  // =========================================================================
  const [registrationId, setRegistrationId] = useState('');
  const [verifiedRegistration, setVerifiedRegistration] = useState<RegistrationRecord | null>(null);
  const [verifyingReg, setVerifyingReg] = useState(false);
  const [regVerificationError, setRegVerificationError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const [affiliation, setAffiliation] = useState('');

  // =========================================================================
  // SECTION 2: ABSTRACT DETAILS & AUTHOR INFORMATION
  // =========================================================================
  const [title, setTitle] = useState('');
  const [authorNameOverride, setAuthorNameOverride] = useState('');
  const [authorAffiliationOverride, setAuthorAffiliationOverride] = useState('');

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
    'Depression',
  ]);
  const [keywordInput, setKeywordInput] = useState('');

  // =========================================================================
  // SECTION 3: SCIENTIFIC TRACK & TYPE OF PRESENTATION
  // =========================================================================
  const [selectedTrack, setSelectedTrack] = useState<string>(initialTrackId || 'track-01');
  const [presentationType, setPresentationType] = useState<
    'Oral Presentation' | 'Poster Presentation' | 'E-Poster Presentation'
  >('Oral Presentation');

  // =========================================================================
  // SECTION 4: DECLARATION
  // =========================================================================
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // =========================================================================
  // SUBMISSION & TRACKING STATES
  // =========================================================================
  const [submitting, setSubmitting] = useState(false);
  const [submittedAbstractData, setSubmittedAbstractData] = useState<AbstractRecord | null>(null);
  const [copied, setCopied] = useState(false);
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
  const isWordCountExceeded = wordCount > 250;

  // Add / remove co-authors
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

  // Keywords management
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

  // Pre-validate Registration ID button
  const handleVerifyRegistration = async () => {
    setRegVerificationError(null);
    setVerifiedRegistration(null);

    if (!registrationId.trim()) {
      setRegVerificationError('Please enter your Registration ID (e.g., AICONDD001).');
      return;
    }
    if (!email.trim()) {
      setRegVerificationError('Please enter your presenting author email address to verify.');
      return;
    }

    setVerifyingReg(true);
    try {
      const res = await verifyRegistrationForAbstractSubmission(registrationId, email);
      setVerifiedRegistration(res.registration);
      // Autofill details from verified registration if fields are empty
      if (!fullName) setFullName(res.registration.fullName);
      if (!mobile) setMobile(res.registration.mobile);
      if (!affiliation) setAffiliation(res.registration.institution);
      if (!designation) setDesignation(res.registration.courseOrDesignation || '');
    } catch (err: any) {
      setRegVerificationError(err.message || 'Registration verification failed.');
    } finally {
      setVerifyingReg(false);
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!registrationId.trim()) {
      errors.registrationId = 'Registration ID is required (e.g. AICONDD001).';
    }
    if (!fullName.trim()) errors.fullName = 'Full Name is required.';
    if (!email.trim()) {
      errors.email = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!mobile.trim()) errors.mobile = 'Mobile Number is required.';
    if (!designation.trim()) errors.designation = 'Academic Designation is required.';
    if (!affiliation.trim()) errors.affiliation = 'Affiliation / University is required.';

    if (!title.trim()) errors.title = 'Title of the Abstract is required.';

    const effectiveAuthorName = authorNameOverride.trim() || fullName.trim();
    if (!effectiveAuthorName) errors.authorName = 'Presenting Author name is required.';

    const effectiveAffiliation = authorAffiliationOverride.trim() || affiliation.trim();
    if (!effectiveAffiliation) errors.authorAffiliation = 'Presenting Author affiliation is required.';

    if (!abstractText.trim()) {
      errors.abstract = 'Abstract content is required.';
    } else if (wordCount > 250) {
      errors.abstract = `Abstract exceeds maximum 250 words limit (current: ${wordCount} words).`;
    }

    if (keywords.length < 3) {
      errors.keywords = 'Please specify at least 3 keywords (currently ' + keywords.length + ').';
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

  // Submit Abstract to Firestore
  const handleSubmitAbstract = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      setGeneralError('Please review the form and correct the indicated errors before submitting.');
      window.scrollTo({ top: 320, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Verify Registration ID eligibility (Rules 1 to 4)
      const verifResult = await verifyRegistrationForAbstractSubmission(
        registrationId,
        email
      );

      const effectiveAuthorName = authorNameOverride.trim() || fullName.trim();
      const effectiveAffiliation = authorAffiliationOverride.trim() || affiliation.trim();

      const validCoAuthors = coAuthors
        .filter((c) => c.name.trim() !== '')
        .map((c) => ({
          name: c.name.trim(),
          affiliation: c.affiliation.trim() || effectiveAffiliation,
        }));

      // 2. Submit abstract with atomic sequence counter (AICONDD-ABS-xxx)
      const allocatedAbstractId = await submitAbstractWithAtomicId({
        registrationId: verifResult.registration.registrationId || registrationId.trim().toUpperCase(),
        regDocId: verifResult.regDocId,
        title: title.trim(),
        trackId: selectedTrack,
        presentationPreference: presentationType,
        presentingAuthor: {
          fullName: effectiveAuthorName,
          email: email.trim(),
          mobile: mobile.trim(),
          designation: designation.trim(),
          affiliation: effectiveAffiliation,
        },
        coAuthors: validCoAuthors,
        abstractContent: abstractText.trim(),
        keywords,
        recordType: verifResult.registration.recordType || 'live',
      });

      const submittedRecord: AbstractRecord = {
        id: allocatedAbstractId,
        registrationId: verifResult.registration.registrationId || registrationId.trim().toUpperCase(),
        title: title.trim(),
        trackId: selectedTrack,
        presentationPreference: presentationType,
        presentingAuthor: {
          fullName: effectiveAuthorName,
          email: email.trim(),
          mobile: mobile.trim(),
          designation: designation.trim(),
          affiliation: effectiveAffiliation,
        },
        coAuthors: validCoAuthors,
        abstractContent: { text: abstractText.trim() },
        keywords,
        status: 'Submitted',
        createdAt: new Date().toISOString(),
      };

      setSubmittedAbstractData(submittedRecord);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      window.scrollTo({ top: 180, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Abstract submission error:', err);
      setGeneralError(err.message || 'Abstract submission failed. Please verify your Registration ID.');
      window.scrollTo({ top: 280, behavior: 'smooth' });
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
        // Verify email match if entered
        if (lookupEmail.trim() && data.presentingAuthor?.email) {
          if (data.presentingAuthor.email.toLowerCase() !== lookupEmail.trim().toLowerCase()) {
            setLookupError('Email address does not match the presenting author on record for this Abstract ID.');
            return;
          }
        }
        setLookupResult(data);
      } else {
        setLookupError(
          `No abstract found matching ID "${queryKey}". Please verify your reference number (Format: AICONDD-ABS-xxx).`
        );
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setLookupError('Unable to fetch abstract status. Please check your internet connection.');
    } finally {
      setSearchingLookup(false);
    }
  };

  const copyId = () => {
    if (submittedAbstractData?.id) {
      navigator.clipboard.writeText(submittedAbstractData.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetForNewSubmission = () => {
    setSubmittedAbstractData(null);
    setRegistrationId('');
    setVerifiedRegistration(null);
    setTitle('');
    setAbstractText('');
    setAuthorNameOverride('');
    setAuthorAffiliationOverride('');
    setCoAuthors([
      { id: '1', name: '', affiliation: '' },
      { id: '2', name: '', affiliation: '' },
    ]);
    setKeywords(['Drug Discovery', 'HDAC Inhibition', 'Depression']);
    setDeclarationAccepted(false);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#FAF8FF] via-[#F4F0FF] to-[#FAF8FF] text-slate-800 font-['Inter',sans-serif] relative overflow-hidden pb-20 pt-6">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-[#06B6D4]/12 rounded-full blur-3xl pointer-events-none" />

      <div className="w-[94%] sm:w-[92%] max-w-5xl mx-auto relative z-10 space-y-6">
        {/* =====================================================================
            HERO SECTION: Match approved reference mockup
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-2.5">
                <span className="text-[10px] font-bold text-white tracking-wide">
                  SRM College of Pharmacy
                </span>
              </div>
            </div>

            {/* Central Hero Titles & Action Toggle */}
            <div className="flex-1 text-center space-y-3.5 z-10 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAE5FC] border border-[#DDD6FE] text-[#6745C5] text-[11px] font-bold tracking-wider uppercase shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-[#6745C5]" />
                <span>PEER-REVIEWED SCIENTIFIC PROCEEDINGS</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-[44px] font-black text-[#101B4B] font-heading tracking-tight leading-tight">
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
            CONDITIONAL VIEW: SUCCESS CONFIRMATION MODAL / PANEL
           ===================================================================== */}
        {submittedAbstractData ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 sm:p-10 border-2 border-emerald-400 shadow-xl space-y-6 max-w-3xl mx-auto text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                OFFICIALLY REGISTERED IN FIRESTORE
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#101B4B] font-heading">
                Abstract Submitted Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                Thank you, <strong>{submittedAbstractData.presentingAuthor?.fullName || fullName}</strong>. Your abstract has been logged for peer review by the Scientific Proceedings Committee.
              </p>
            </div>

            {/* Official Credentials Box */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-left max-w-xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Abstract ID</span>
                  <span className="font-mono font-extrabold text-2xl text-[#6D28D9] tracking-wider">
                    {submittedAbstractData.id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Linked Registration ID</span>
                  <span className="font-mono font-bold text-xl text-slate-800">
                    {submittedAbstractData.registrationId}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-slate-700">
                <div><strong>Title:</strong> {submittedAbstractData.title}</div>
                <div><strong>Track:</strong> {submittedAbstractData.trackId}</div>
                <div><strong>Presentation Preference:</strong> {submittedAbstractData.presentationPreference}</div>
                <div><strong>Submission Status:</strong> <span className="font-bold text-purple-700">Submitted – Under Review</span></div>
              </div>
            </div>

            {/* Print & PDF Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => generateSubmissionReceiptPDF(submittedAbstractData)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Save as PDF Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-2xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Confirmation</span>
              </button>

              <button
                type="button"
                onClick={copyId}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>

            {/* Free tier notification disclaimer */}
            <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-xs text-purple-900 max-w-xl mx-auto">
              <strong>Notice:</strong> Your submission receipt is saved in the database. You can track your peer review status anytime on the <strong>Track Status</strong> tab using your Abstract ID and registered email address.
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLookupId(submittedAbstractData.id);
                  setLookupEmail(submittedAbstractData.presentingAuthor?.email || email);
                  setActiveTab('track');
                }}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#1E1B4B] bg-white border border-slate-300 hover:bg-slate-50 rounded-full cursor-pointer transition"
              >
                Go to Status Inquiry
              </button>

              <button
                type="button"
                onClick={handleResetForNewSubmission}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close & Submit Another
              </button>
            </div>
          </div>
        ) : activeTab === 'track' ? (
          /* =====================================================================
              TRACK STATUS VIEW
             ===================================================================== */
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
                Enter your unique Abstract ID (Format: AICONDD-ABS-xxx) and registered email address.
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

                {/* If Accepted, Download Acceptance Letter */}
                {lookupResult.status === 'Accepted' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => generateAcceptanceLetterPDF(lookupResult)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition"
                    >
                      <Award className="w-4 h-4" />
                      <span>Download Official Acceptance Letter (PDF)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* =====================================================================
              PRIMARY SINGLE-PAGE ABSTRACT SUBMISSION FORM
             ===================================================================== */
          <form onSubmit={handleSubmitAbstract} className="space-y-6">
            {generalError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Spark plan optimization notice */}
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Prerequisite:</strong> Abstract submission requires an official verified Registration ID (Format: <code>AICONDDxxx</code>). One Registration ID permits exactly one abstract submission.
              </span>
            </div>

            {/* =====================================================================
                SECTION 1: REGISTRATION ID & PRESENTING AUTHOR DETAILS
               ===================================================================== */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-5">
              {/* Header Strip */}
              <div className="flex items-center gap-3 pb-1 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                    Presenting Author & Registration Verification
                  </h2>
                  <p className="text-[12px] sm:text-[13px] text-slate-500">
                    Enter the official Registration ID allocated to you upon payment verification.
                  </p>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Registration ID Input */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Official Registration ID <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">Format: AICONDDxxx</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1 flex items-center">
                      <ShieldCheck className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={registrationId}
                        onChange={(e) => {
                          setRegistrationId(e.target.value.toUpperCase());
                          if (formErrors.registrationId) setFormErrors((prev) => ({ ...prev, registrationId: '' }));
                          setRegVerificationError(null);
                        }}
                        placeholder="e.g. AICONDD001"
                        className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm font-mono text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                          formErrors.registrationId || regVerificationError
                            ? 'border-red-400'
                            : 'border-slate-200 focus:border-[#7C3AED]'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={verifyingReg}
                      onClick={handleVerifyRegistration}
                      className="px-4 h-11 bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold text-xs rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {verifyingReg ? 'Checking...' : 'Verify ID'}
                    </button>
                  </div>

                  {regVerificationError && (
                    <p className="text-[11px] text-red-600 font-medium pt-0.5">{regVerificationError}</p>
                  )}
                  {formErrors.registrationId && !regVerificationError && (
                    <p className="text-[11px] text-red-500 font-medium pt-0.5">{formErrors.registrationId}</p>
                  )}
                  {verifiedRegistration && (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-0.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verified: {verifiedRegistration.fullName} ({verifiedRegistration.institution})</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
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

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Full Name <span className="text-red-500">*</span>
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

                {/* Affiliation / University */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Affiliation / University <span className="text-red-500">*</span>
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

            {/* =====================================================================
                SECTION 2: ABSTRACT DETAILS & AUTHOR INFORMATION
               ===================================================================== */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-1 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Abstract Details & Author Information
                </h2>
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
                    placeholder="Enter the title of your abstract"
                    className={`h-11 pl-10 pr-3.5 w-full rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                      formErrors.title ? 'border-red-400' : 'border-slate-200 focus:border-[#7C3AED]'
                    }`}
                  />
                </div>
                {formErrors.title && <p className="text-[11px] text-red-500">{formErrors.title}</p>}
              </div>

              {/* Co-Authors Block */}
              <div className="space-y-3 pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-xs font-bold">
                  <Users className="w-3.5 h-3.5" />
                  <span>Co-Author(s) (Optional)</span>
                </div>

                <div className="space-y-3">
                  {coAuthors.map((coAuthor) => (
                    <div key={coAuthor.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-6 relative flex items-center">
                        <User className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={coAuthor.name}
                          onChange={(e) => handleUpdateCoAuthor(coAuthor.id, 'name', e.target.value)}
                          placeholder="Co-author name"
                          className="h-11 pl-10 pr-3.5 w-full rounded-xl border border-slate-200 bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition"
                        />
                      </div>

                      <div className="md:col-span-5 relative flex items-center">
                        <Building2 className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={coAuthor.affiliation}
                          onChange={(e) => handleUpdateCoAuthor(coAuthor.id, 'affiliation', e.target.value)}
                          placeholder="Affiliation / Institution"
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

              {/* Abstract Text Area */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Abstract Content <span className="text-red-500">*</span> (Maximum 250 words)
                  </label>
                  <span
                    className={`text-xs font-semibold ${
                      isWordCountExceeded ? 'text-red-600 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {wordCount} / 250 words
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={abstractText}
                  onChange={(e) => {
                    setAbstractText(e.target.value);
                    if (formErrors.abstract) setFormErrors((prev) => ({ ...prev, abstract: '' }));
                  }}
                  placeholder="Enter your structured abstract text here (Background, Methodology, Results, Conclusion)..."
                  className={`w-full p-4 rounded-xl border bg-[#FBFBFF] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition leading-relaxed ${
                    formErrors.abstract || isWordCountExceeded
                      ? 'border-red-400'
                      : 'border-slate-200 focus:border-[#7C3AED]'
                  }`}
                />
                {isWordCountExceeded && (
                  <p className="text-[11px] text-red-600">
                    Your abstract exceeds 250 words by {wordCount - 250} words.
                  </p>
                )}
                {formErrors.abstract && !isWordCountExceeded && (
                  <p className="text-[11px] text-red-500">{formErrors.abstract}</p>
                )}
              </div>

              {/* Keywords */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Keywords <span className="text-red-500">*</span> (Enter 3 – 5 keywords)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1 w-full">
                    <Tag className="w-4 h-4 text-[#7C3AED] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleKeywordKeyDown}
                      placeholder="Type a keyword and press Enter"
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

            {/* =====================================================================
                SECTION 3: SCIENTIFIC TRACK & TYPE OF PRESENTATION
               ===================================================================== */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-1 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Scientific Track & Type of Presentation
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Track */}
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

                {/* Presentation Type */}
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

            {/* =====================================================================
                SECTION 4: DECLARATION
               ===================================================================== */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-[#E4E8F4] shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-1 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">Declaration</h2>
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
                  className="w-5 h-5 mt-0.5 rounded-md accent-[#7C3AED] cursor-pointer"
                />
                <span className="text-sm sm:text-base text-slate-700 leading-relaxed group-hover:text-slate-900">
                  I hereby declare that the abstract submitted is original, has not been published elsewhere, and all co-authors have consented to its submission for this conference. <span className="text-red-500">*</span>
                </span>
              </label>
              {formErrors.declaration && <p className="text-[11px] text-red-500">{formErrors.declaration}</p>}
            </div>

            {/* =====================================================================
                SUBMISSION BUTTON
               ===================================================================== */}
            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2.5 px-10 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#06B6D4] text-white text-base sm:text-[17px] font-bold shadow-lg hover:shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Allocating Abstract ID & Submitting...' : 'Submit Abstract'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Section Back to Top */}
        <div className="pt-4">
          <SectionBackToTop variant="light" />
        </div>
      </div>
    </div>
  );
};

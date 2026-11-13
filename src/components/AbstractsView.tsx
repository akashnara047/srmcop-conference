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
  ExternalLink,
  RefreshCw,
  Calendar,
  Upload,
  FileCheck,
  Info,
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

const ACCEPTED_DOC_EXTENSIONS = ['.doc', '.docx', '.pdf'];
const ACCEPTED_DOC_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];
const MAX_DOC_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

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

  // Abstract text (Max 300 words)
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
  // STEP 4: SUPPORTING ABSTRACT DOCUMENT (OPTIONAL, DOC/DOCX/PDF <= 2 MB)
  // =========================================================================
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);
  const [supportingDocData, setSupportingDocData] = useState<string>('');
  const [supportingDocError, setSupportingDocError] = useState<string | null>(null);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);

  // =========================================================================
  // STEP 5: DECLARATION
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

  // Supporting Document Upload Handlers (DOC, DOCX, PDF, max 2 MB)
  const processSupportingDocument = (file: File) => {
    setSupportingDocError(null);
    const lowerName = file.name.toLowerCase();
    const hasValidExt = ACCEPTED_DOC_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = ACCEPTED_DOC_MIME_TYPES.includes(file.type) || file.type === '';

    if (!hasValidExt && !hasValidMime) {
      setSupportingDocError('Unsupported format. Please upload a DOC, DOCX, or PDF file.');
      return;
    }

    if (file.size > MAX_DOC_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setSupportingDocError(`File size (${sizeMB} MB) exceeds the 2 MB limit. Please upload a smaller file.`);
      return;
    }

    setSupportingDocFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = (event.target?.result as string) || '';
      setSupportingDocData(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSupportingDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSupportingDocument(file);
    }
  };

  const handleSupportingDocDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingDoc(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSupportingDocument(file);
    }
  };

  const removeSupportingDocument = () => {
    setSupportingDocFile(null);
    setSupportingDocData('');
    setSupportingDocError(null);
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
        supportingDocumentFile: supportingDocFile,
        supportingDocumentData: supportingDocData || undefined,
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
        ...(supportingDocFile ? { supportingDocumentName: supportingDocFile.name } : {}),
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
    setSupportingDocFile(null);
    setSupportingDocData('');
    setSupportingDocError(null);
    setDeclarationAccepted(false);
  };

  return (
    <div
      className="w-full min-h-screen text-slate-800 font-['Inter',sans-serif] relative overflow-x-clip pb-20"
      style={{
        backgroundColor: '#F3EEFF',
        backgroundImage: `url(${IMAGES.abstractSubmissionBg})`,
        backgroundSize: '100% auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'repeat-y',
      }}
    >
      {/* Subtle readability veil preserving full-page background artwork across all heights */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/10 via-[#F8F6FF]/15 to-white/10"
      />

      {/* =====================================================================
          HERO SECTION: Centered badge, heading & action buttons over page background
         ===================================================================== */}
      <section className="relative z-10 w-full pt-10 pb-8 sm:pt-14 sm:pb-10">
        {/* Centered Hero Header & Actions */}
        <div className="w-[94%] sm:w-[93%] lg:w-[92%] max-w-[1440px] mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/85 backdrop-blur-md border border-[#D8CEFA] text-[#3B219B] text-xs sm:text-[13px] font-extrabold tracking-[0.1em] uppercase shadow-xs">
            <BookOpen className="w-4 h-4 text-[#6366F1]" />
            <span>PEER-REVIEWED SCIENTIFIC PROCEEDINGS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-[52px] xl:text-[56px] font-black text-[#101B4B] font-heading tracking-tight leading-[1.1]">
            Abstract Submission Portal
          </h1>

          {/* Mode Toggle Buttons: Submit Abstract & Track Status */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className={`px-8 py-3.5 rounded-full text-sm sm:text-base font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'submit'
                  ? 'bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#6D28D9] text-white shadow-[0_10px_24px_rgba(109,40,217,0.3)] scale-[1.02]'
                  : 'bg-white/92 hover:bg-white text-[#101B4B] border border-[#D9D1F5] shadow-sm'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Submit Abstract</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`px-8 py-3.5 rounded-full text-sm sm:text-base font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'track'
                  ? 'bg-gradient-to-r from-[#101B4B] to-[#1E293B] text-white shadow-[0_10px_24px_rgba(16,27,75,0.28)] scale-[1.02]'
                  : 'bg-white/92 hover:bg-white text-[#101B4B] border border-[#D9D1F5] shadow-sm'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Track Status</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          MAIN PORTAL CONTENT CONTAINER (92–94% Desktop Width)
         ===================================================================== */}
      <div className="w-[94%] sm:w-[93%] lg:w-[92%] max-w-[1440px] mx-auto relative z-10 space-y-7">
        {/* ===================================================================
            TRACK STATUS VIEW
           =================================================================== */}
        {activeTab === 'track' ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-[#DCD3FA] shadow-[0_14px_40px_rgba(103,69,197,0.09)] overflow-hidden">
            {/* Soft Violet Header Strip */}
            <div className="bg-gradient-to-r from-[#E6E0FC] via-[#EFEBFD] to-[#F7F5FE] px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E3DCF9] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-sm shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#101B4B] font-heading">
                    Check Scientific Review Progress
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B557A]">
                    Enter your unique Abstract ID (Format: <code className="font-mono font-semibold text-[#5B21B6]">AICONDD-ABS-001</code>) and registered email address.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleLookup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-sm font-bold text-[#101B4B] block">
                      Official Abstract ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AICONDD-ABS-001"
                      value={lookupId}
                      onChange={(e) => setLookupId(e.target.value)}
                      className="h-12 sm:h-[52px] px-4 w-full bg-white border border-[#D4D9EC] rounded-xl font-mono uppercase text-sm sm:text-[15px] text-slate-800 focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-sm font-bold text-[#101B4B] block">
                      Presenting Author Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="author@institution.edu"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      className="h-12 sm:h-[52px] px-4 w-full bg-white border border-[#D4D9EC] rounded-xl text-sm sm:text-[15px] text-slate-800 focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="submit"
                      disabled={searchingLookup}
                      className="w-full h-12 sm:h-[52px] px-5 text-sm font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:opacity-95 rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition whitespace-nowrap"
                    >
                      <Search className="w-4 h-4" />
                      <span>{searchingLookup ? 'Checking...' : 'Check Status'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {lookupError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {lookupResult && (
                <div className="bg-[#FAF8FF] border border-[#DFD6FA] rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5DDFB]">
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-500 block">Abstract ID</span>
                      <div className="font-mono font-black text-xl text-[#101B4B]">{lookupResult.id}</div>
                    </div>
                    <span
                      className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider ${
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

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#101B4B] font-heading">{lookupResult.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Presenting Author: <strong className="text-slate-900">{lookupResult.presentingAuthor?.fullName || lookupResult.presentingAuthor?.name}</strong> ({lookupResult.presentingAuthor?.affiliation || lookupResult.presentingAuthor?.institution})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-sm pt-1">
                    <div className="p-3.5 bg-white rounded-xl border border-[#E5DDFB]">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold block">Track</span>
                      <strong className="text-slate-800 truncate block">{lookupResult.trackId}</strong>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-[#E5DDFB]">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold block">Registration ID</span>
                      <strong className="text-purple-700 font-mono block">{lookupResult.registrationId}</strong>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-[#E5DDFB]">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold block">Presentation Mode</span>
                      <strong className="text-slate-800 block">{lookupResult.presentationPreference}</strong>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-[#E5DDFB]">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold block">Submission Date</span>
                      <strong className="text-slate-800 block">
                        {new Date(lookupResult.createdAt).toLocaleDateString('en-GB')}
                      </strong>
                    </div>
                  </div>

                  {lookupResult.reviewNotes && (
                    <div className="p-4 bg-white rounded-xl border border-[#E5DDFB] text-sm space-y-1">
                      <span className="text-xs uppercase font-bold text-slate-500">Reviewer Notes</span>
                      <p className="text-slate-700">{lookupResult.reviewNotes}</p>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => generateSubmissionReceiptPDF(lookupResult)}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Submission Receipt (PDF)</span>
                    </button>

                    {lookupResult.status === 'Accepted' && (
                      <button
                        type="button"
                        onClick={() => generateAcceptanceLetterPDF(lookupResult)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition"
                      >
                        <Award className="w-4 h-4" />
                        <span>Download Acceptance Letter (PDF)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ===================================================================
              PRIMARY SUBMISSION FLOW: VERIFY REGISTRATION -> UNLOCK FORM
             =================================================================== */
          <div className="space-y-7">
            {/* =================================================================
                PANEL 0: INITIAL REGISTRATION ID VERIFICATION (GATEKEEPER)
               ================================================================= */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-[#DCD3FA] shadow-[0_14px_40px_rgba(103,69,197,0.09)] overflow-hidden">
              {/* Soft Violet Header Strip */}
              <div className="bg-gradient-to-r from-[#E6E0FC] via-[#EFEBFD] to-[#F7F5FE] px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E3DCF9] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-sm shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-[23px] font-extrabold text-[#101B4B] font-heading">
                      Verify Your Conference Registration
                    </h2>
                    <p className="text-xs sm:text-sm text-[#4B557A]">
                      Enter the official Registration ID allocated to you after successful conference registration.
                    </p>
                  </div>
                </div>

                {verifiedRegistration && (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registration Verified</span>
                  </span>
                )}
              </div>

              <div className="p-6 sm:p-8">
                {!verifiedRegistration ? (
                  <div className="space-y-5">
                    <form onSubmit={handleVerifyRegistration} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-sm sm:text-[15px] font-bold text-[#101B4B]">
                          Official Registration ID <span className="text-red-500">*</span>
                        </label>
                        <span className="text-xs sm:text-[13px] font-mono font-semibold text-[#5B21B6] bg-[#F3EFFE] border border-[#E2DAF8] px-3 py-1 rounded-full">
                          Example format: AICONDD001
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3.5">
                        <div className="relative flex-1 flex items-center">
                          <ShieldCheck className="w-5 h-5 text-[#7C3AED] absolute left-4 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={registrationIdInput}
                            onChange={(e) => {
                              setRegistrationIdInput(e.target.value.toUpperCase());
                              if (regVerificationError) setRegVerificationError(null);
                            }}
                            placeholder="Enter your Official Registration ID (e.g. AICONDD001)"
                            className={`h-13 sm:h-[54px] pl-12 pr-4 w-full rounded-xl border bg-white text-sm sm:text-base font-mono font-semibold text-slate-900 uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition ${
                              regVerificationError
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={verifyingReg || !registrationIdInput.trim()}
                          className="h-13 sm:h-[54px] px-8 bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#6D28D9] hover:opacity-95 text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_8px_20px_rgba(124,58,237,0.25)] transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                        >
                          {verifyingReg ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Verifying Registration ID...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Verify Registration ID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Context-aware verification feedback alerts */}
                    {regVerificationError && (
                      <div className="p-4 sm:p-5 rounded-2xl border space-y-2.5 text-sm animate-in fade-in duration-200 bg-red-50/95 border-red-200 text-red-800">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="space-y-1.5">
                            <p className="font-bold">{regVerificationError}</p>

                            {errorType === 'not_found' && (
                              <p className="text-xs sm:text-sm text-red-700 leading-relaxed">
                                Haven't registered for the conference yet? Complete conference registration first to receive your official Registration ID and submit your abstract.
                              </p>
                            )}

                            {errorType === 'payment_pending' && (
                              <p className="text-xs sm:text-sm text-red-700 leading-relaxed">
                                The organising secretariat is actively validating transaction references against bank accounts. Once approved by the Organising Secretary, abstract submission will automatically unlock.
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
                                  className="px-4 py-1.5 bg-purple-700 text-white rounded-lg font-bold text-xs sm:text-sm hover:bg-purple-800 transition cursor-pointer"
                                >
                                  View Linked Abstract ({linkedExistingAbstractId})
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {errorType === 'not_found' && onNavigateToRegistration && (
                          <div className="pt-1 pl-8">
                            <button
                              type="button"
                              onClick={onNavigateToRegistration}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
                            >
                              <span>Go to Conference Registration Portal</span>
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Informational Note Box */}
                    <div className="p-4 sm:p-5 bg-[#F6F3FE] border border-[#E2DAF8] rounded-2xl text-xs sm:text-sm text-[#384162] flex items-start gap-3 leading-relaxed">
                      <Info className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#101B4B]">Delegate Verification Notice:</strong> Abstract submission is strictly restricted to verified registered conference delegates (one abstract per Registration ID). Do not enter an Abstract ID here — your official sequential Abstract ID (<span className="font-mono font-semibold text-[#5B21B6]">AICONDD-ABS-xxx</span>) will be generated automatically upon submission.
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Verified Banner & Details Summary */
                  <div className="p-5 sm:p-6 bg-emerald-50/85 border border-emerald-300 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs uppercase font-extrabold text-emerald-800 tracking-wider">
                              Registration Verified
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-200 text-emerald-950 font-mono text-xs sm:text-sm font-bold">
                              {verifiedRegistration.registrationId || registrationIdInput}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 text-base sm:text-lg">
                            {verifiedRegistration.fullName}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetVerification}
                        className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-xl self-start sm:self-auto cursor-pointer transition shadow-2xs"
                      >
                        Verify Different ID
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-sm border-t border-emerald-200/80 text-slate-700">
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase font-bold block">Institution</span>
                        <strong className="text-slate-900">{verifiedRegistration.institution}</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase font-bold block">Delegate Category</span>
                        <strong className="text-slate-900">{verifiedRegistration.category}</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase font-bold block">Registered Email</span>
                        <strong className="text-slate-900">{verifiedRegistration.email}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =================================================================
                LOCKED STATE PLACEHOLDER (WHEN NOT YET VERIFIED)
               ================================================================= */}
            {!verifiedRegistration ? (
              <div className="bg-white/85 backdrop-blur-xl rounded-[24px] p-8 sm:p-12 border border-[#DCD3FA] text-center space-y-6 shadow-[0_14px_40px_rgba(103,69,197,0.08)]">
                <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs border border-[#DDD6FE]">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-xl mx-auto">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#101B4B] font-heading">
                    Abstract Submission Form is Locked
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Please verify your official conference Registration ID above to unlock all submission panels, automatic presenting author pre-population, and scientific track selection.
                  </p>
                </div>

                <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
                  <div className="p-5 bg-[#FAF8FF] rounded-2xl border border-[#E2DAF8] space-y-1.5">
                    <span className="font-bold text-sm text-[#6D28D9] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>1. Verify Registration ID</span>
                    </span>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Enter your verified conference ID (e.g. AICONDD001) to validate delegate eligibility.
                    </p>
                  </div>

                  <div className="p-5 bg-[#FAF8FF] rounded-2xl border border-[#E2DAF8] space-y-1.5">
                    <span className="font-bold text-sm text-[#6D28D9] flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>2. Auto-Populated Details</span>
                    </span>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Presenting author fields pre-fill automatically from your verified registration record.
                    </p>
                  </div>

                  <div className="p-5 bg-[#FAF8FF] rounded-2xl border border-[#E2DAF8] space-y-1.5">
                    <span className="font-bold text-sm text-[#6D28D9] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>3. Instant Abstract ID & PDF</span>
                    </span>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Receive an automatically generated Abstract ID and downloadable PDF receipt upon submission.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* =================================================================
                  UNLOCKED ABSTRACT SUBMISSION FORM (WIDE FROSTED-GLASS PANELS)
                 ================================================================= */
              <form onSubmit={handleSubmitAbstract} className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {generalError && (
                  <div className="p-4 sm:p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700 shadow-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{generalError}</span>
                  </div>
                )}

                {/* ===============================================================
                    FORM PANEL 1: PRESENTING AUTHOR DETAILS
                   =============================================================== */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-[#DCD3FA] shadow-[0_14px_40px_rgba(103,69,197,0.08)] overflow-hidden">
                  {/* Soft Violet Header Strip */}
                  <div className="bg-gradient-to-r from-[#E6E0FC] via-[#EFEBFD] to-[#F7F5FE] px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E3DCF9] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-sm shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-[23px] font-extrabold text-[#101B4B] font-heading">
                          Presenting Author Details
                        </h3>
                        <p className="text-xs sm:text-sm text-[#4B557A]">
                          Pre-populated from your verified registration record (one abstract per Registration ID).
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#5B21B6] border border-[#D4C7FA] text-xs sm:text-sm font-mono font-bold shadow-2xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{verifiedRegistration.registrationId || registrationIdInput}</span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                      {/* Full Name */}
                      <div className="space-y-2">
                        <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <User className="w-5 h-5 text-[#7C3AED] absolute left-4 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
                            }}
                            placeholder="Dr. / Prof. / Scholar Name"
                            className={`h-12 sm:h-[52px] pl-12 pr-4 w-full rounded-xl border bg-white text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                              formErrors.fullName ? 'border-red-400' : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>
                        {formErrors.fullName && <p className="text-xs text-red-500 font-medium">{formErrors.fullName}</p>}
                      </div>

                      {/* Email Address */}
                      <div className="space-y-2">
                        <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <Mail className="w-5 h-5 text-[#7C3AED] absolute left-4 pointer-events-none" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                            }}
                            placeholder="author@institution.edu"
                            className={`h-12 sm:h-[52px] pl-12 pr-4 w-full rounded-xl border bg-white text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                              formErrors.email ? 'border-red-400' : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>
                        {formErrors.email && <p className="text-xs text-red-500 font-medium">{formErrors.email}</p>}
                      </div>

                      {/* Mobile Number */}
                      <div className="space-y-2">
                        <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <Phone className="w-5 h-5 text-[#7C3AED] absolute left-4 pointer-events-none" />
                          <input
                            type="tel"
                            required
                            value={mobile}
                            onChange={(e) => {
                              setMobile(e.target.value);
                              if (formErrors.mobile) setFormErrors((prev) => ({ ...prev, mobile: '' }));
                            }}
                            placeholder="+91 98765 43210"
                            className={`h-12 sm:h-[52px] pl-12 pr-4 w-full rounded-xl border bg-white text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                              formErrors.mobile ? 'border-red-400' : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>
                        {formErrors.mobile && <p className="text-xs text-red-500 font-medium">{formErrors.mobile}</p>}
                      </div>

                      {/* Academic Designation */}
                      <div className="space-y-2">
                        <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                          Academic Designation <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <GraduationCap className="w-5 h-5 text-[#7C3AED] absolute left-4 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={designation}
                            onChange={(e) => {
                              setDesignation(e.target.value);
                              if (formErrors.designation) setFormErrors((prev) => ({ ...prev, designation: '' }));
                            }}
                            placeholder="e.g. Associate Professor / PhD Scholar"
                            className={`h-12 sm:h-[52px] pl-12 pr-4 w-full rounded-xl border bg-white text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                              formErrors.designation ? 'border-red-400' : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>
                        {formErrors.designation && <p className="text-xs text-red-500 font-medium">{formErrors.designation}</p>}
                      </div>

                      {/* Affiliation / University (Full Width) */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                          Affiliation / University <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <Building2 className="w-5 h-5 text-[#7C3AED] absolute left-4 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={affiliation}
                            onChange={(e) => {
                              setAffiliation(e.target.value);
                              if (formErrors.affiliation) setFormErrors((prev) => ({ ...prev, affiliation: '' }));
                            }}
                            placeholder="e.g. Department of Pharmacology, SRM College of Pharmacy, SRMIST"
                            className={`h-12 sm:h-[52px] pl-12 pr-4 w-full rounded-xl border bg-white text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                              formErrors.affiliation ? 'border-red-400' : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>
                        {formErrors.affiliation && <p className="text-xs text-red-500 font-medium">{formErrors.affiliation}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===============================================================
                    FORM PANEL 2: ABSTRACT DETAILS & AUTHOR INFORMATION
                   =============================================================== */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-[#DCD3FA] shadow-[0_14px_40px_rgba(103,69,197,0.08)] overflow-hidden">
                  <div className="bg-gradient-to-r from-[#E6E0FC] via-[#EFEBFD] to-[#F7F5FE] px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E3DCF9] flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-sm shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-[23px] font-extrabold text-[#101B4B] font-heading">
                        Abstract Details & Author Information
                      </h3>
                      <p className="text-xs sm:text-sm text-[#4B557A]">
                        Provide the complete abstract title, author listing, structured text, and keywords.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Title of Abstract */}
                    <div className="space-y-2">
                      <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                        Title of the Abstract <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <PenLine className="w-5 h-5 text-[#7C3AED] absolute left-4 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => {
                            setTitle(e.target.value);
                            if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
                          }}
                          placeholder="Enter the complete title of your research abstract"
                          className={`h-12 sm:h-[52px] pl-12 pr-4 w-full rounded-xl border bg-white text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition ${
                            formErrors.title ? 'border-red-400' : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                          }`}
                        />
                      </div>
                      {formErrors.title && <p className="text-xs text-red-500 font-medium">{formErrors.title}</p>}
                    </div>

                    {/* Presenting Author Name & Affiliation Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 sm:p-5 rounded-2xl bg-[#FAF8FF] border border-[#E4DCF9]">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] block">
                          Presenting Author Name
                        </span>
                        <div className="text-sm sm:text-base font-bold text-[#101B4B]">
                          {fullName.trim() || 'Enter Presenting Author Full Name above'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] block">
                          Presenting Author Affiliation
                        </span>
                        <div className="text-sm sm:text-base font-semibold text-slate-700">
                          {affiliation.trim() || 'Enter Affiliation / University above'}
                        </div>
                      </div>
                    </div>

                    {/* Co-Authors Block */}
                    <div className="space-y-3.5 pt-1 border-t border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="inline-flex items-center gap-2 text-sm sm:text-[15px] font-bold text-[#101B4B]">
                          <Users className="w-4 h-4 text-[#7C3AED]" />
                          <span>Co-Author(s) (Optional)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCoAuthor}
                          className="px-4 py-2 rounded-full border border-[#7C3AED] text-[#7C3AED] bg-white hover:bg-[#F3EFFE] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Co-Author</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {coAuthors.map((coAuthor, idx) => (
                          <div key={coAuthor.id} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                            <div className="md:col-span-5 relative flex items-center">
                              <User className="w-4 h-4 text-[#7C3AED] absolute left-4 pointer-events-none" />
                              <input
                                type="text"
                                value={coAuthor.name}
                                onChange={(e) => handleUpdateCoAuthor(coAuthor.id, 'name', e.target.value)}
                                placeholder={`Co-author ${idx + 1} Full Name`}
                                className="h-12 pl-11 pr-4 w-full rounded-xl border border-[#D4D9EC] bg-white text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition"
                              />
                            </div>

                            <div className="md:col-span-6 relative flex items-center">
                              <Building2 className="w-4 h-4 text-[#7C3AED] absolute left-4 pointer-events-none" />
                              <input
                                type="text"
                                value={coAuthor.affiliation}
                                onChange={(e) => handleUpdateCoAuthor(coAuthor.id, 'affiliation', e.target.value)}
                                placeholder="Department / Institution / University"
                                className="h-12 pl-11 pr-4 w-full rounded-xl border border-[#D4D9EC] bg-white text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition"
                              />
                            </div>

                            <div className="md:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveCoAuthor(coAuthor.id)}
                                className="px-3 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                                title="Remove co-author"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="md:hidden">Remove</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Abstract Text Area + Live Word Counter */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block pt-2">
                        Abstract Content <span className="text-red-500">*</span> <span className="text-xs sm:text-sm font-medium text-slate-500">(Maximum 300 words)</span>
                      </label>
                      <textarea
                        rows={7}
                        required
                        value={abstractText}
                        onChange={(e) => {
                          setAbstractText(e.target.value);
                          if (formErrors.abstract) setFormErrors((prev) => ({ ...prev, abstract: '' }));
                        }}
                        placeholder="Enter structured abstract text covering Background, Objectives, Methodology, Results, and Conclusion..."
                        className={`w-full p-4 sm:p-5 rounded-xl border bg-white text-sm sm:text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 transition leading-relaxed ${
                          formErrors.abstract || isWordCountExceeded
                            ? 'border-red-400'
                            : 'border-[#D4D9EC] focus:border-[#7C3AED]'
                        }`}
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <div
                          className={`text-sm font-semibold flex items-center gap-2.5 ${
                            isWordCountExceeded
                              ? 'text-red-600 font-bold'
                              : wordCount > 0
                              ? 'text-[#6D28D9]'
                              : 'text-slate-600'
                          }`}
                        >
                          <span className="font-mono tabular-nums px-3 py-1 rounded-lg bg-[#F4F0FE] border border-[#E2DAF8]">
                            Word Count: {wordCount} / 300
                          </span>
                          {isWordCountExceeded && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                              Exceeded by {wordCount - 300} words
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          Updates in real time as you type, paste, or edit text
                        </span>
                      </div>

                      {formErrors.abstract && (
                        <p className="text-xs text-red-500 font-medium pt-0.5">{formErrors.abstract}</p>
                      )}
                    </div>

                    {/* Keywords */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                          Keywords <span className="text-red-500">*</span> <span className="text-xs sm:text-sm font-medium text-slate-500">(Specify 3 to 5 keywords)</span>
                        </label>
                        <span className="text-xs font-semibold text-[#5B21B6]">
                          {keywords.length} of 5 keywords added
                        </span>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center">
                        <div className="flex gap-2 flex-1">
                          <div className="relative flex-1 flex items-center">
                            <Tag className="w-4 h-4 text-[#7C3AED] absolute left-4 pointer-events-none" />
                            <input
                              type="text"
                              value={keywordInput}
                              onChange={(e) => setKeywordInput(e.target.value)}
                              onKeyDown={handleKeywordKeyDown}
                              placeholder="Type a keyword and press Enter or click Add"
                              className="h-12 pl-11 pr-4 w-full rounded-xl border border-[#D4D9EC] bg-white text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddKeyword}
                            className="h-12 px-5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#5B21B6] font-bold text-sm transition cursor-pointer shrink-0"
                          >
                            Add
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                          {keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#EDE9FE] text-[#5B21B6] border border-[#D4C7FA] text-xs sm:text-sm font-semibold shadow-2xs"
                            >
                              <span>{kw}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyword(kw)}
                                className="hover:text-red-600 p-0.5 rounded-full cursor-pointer transition"
                                title="Remove keyword"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      {formErrors.keywords && <p className="text-xs text-red-500 font-medium">{formErrors.keywords}</p>}
                    </div>
                  </div>
                </div>

                {/* ===============================================================
                    FORM PANEL 3: SCIENTIFIC TRACK & TYPE OF PRESENTATION
                   =============================================================== */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-[#DCD3FA] shadow-[0_14px_40px_rgba(103,69,197,0.08)] overflow-hidden">
                  <div className="bg-gradient-to-r from-[#E6E0FC] via-[#EFEBFD] to-[#F7F5FE] px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E3DCF9] flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-sm shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-[23px] font-extrabold text-[#101B4B] font-heading">
                        Scientific Track & Type of Presentation
                      </h3>
                      <p className="text-xs sm:text-sm text-[#4B557A]">
                        Select the primary scientific theme and your preferred presentation category.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Scientific Track Dropdown */}
                    <div className="space-y-2">
                      <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                        Scientific Track <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedTrack}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                        className="h-12 sm:h-[52px] w-full rounded-xl border border-[#D4D9EC] bg-white px-4 text-sm sm:text-[15px] text-slate-800 font-medium focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition cursor-pointer"
                      >
                        {SCIENTIFIC_TRACKS.map((t) => (
                          <option key={t.id} value={t.id}>
                            Track {t.number}: {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Type of Presentation (3-column cards on desktop) */}
                    <div className="space-y-2.5">
                      <label className="text-sm sm:text-[15px] font-bold text-[#101B4B] block">
                        Type of Presentation <span className="text-red-500">*</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <label
                          onClick={() => setPresentationType('Oral Presentation')}
                          className={`p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-3.5 cursor-pointer transition ${
                            presentationType === 'Oral Presentation'
                              ? 'border-[#7C3AED] bg-[#F5F2FF] shadow-sm'
                              : 'border-[#DCE0EE] bg-white hover:border-[#B6A5F5]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="presentationPreference"
                            checked={presentationType === 'Oral Presentation'}
                            onChange={() => setPresentationType('Oral Presentation')}
                            className="accent-[#7C3AED] w-5 h-5 cursor-pointer shrink-0"
                          />
                          <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                            <Monitor className="w-5 h-5" />
                          </div>
                          <span className="text-sm sm:text-base font-bold text-[#101B4B] leading-tight">
                            Oral Presentation
                          </span>
                        </label>

                        <label
                          onClick={() => setPresentationType('Poster Presentation')}
                          className={`p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-3.5 cursor-pointer transition ${
                            presentationType === 'Poster Presentation'
                              ? 'border-[#7C3AED] bg-[#F5F2FF] shadow-sm'
                              : 'border-[#DCE0EE] bg-white hover:border-[#B6A5F5]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="presentationPreference"
                            checked={presentationType === 'Poster Presentation'}
                            onChange={() => setPresentationType('Poster Presentation')}
                            className="accent-[#7C3AED] w-5 h-5 cursor-pointer shrink-0"
                          />
                          <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                            <Layout className="w-5 h-5" />
                          </div>
                          <span className="text-sm sm:text-base font-bold text-[#101B4B] leading-tight">
                            Poster Presentation
                          </span>
                        </label>

                        <label
                          onClick={() => setPresentationType('E-Poster Presentation')}
                          className={`p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-3.5 cursor-pointer transition ${
                            presentationType === 'E-Poster Presentation'
                              ? 'border-[#7C3AED] bg-[#F5F2FF] shadow-sm'
                              : 'border-[#DCE0EE] bg-white hover:border-[#B6A5F5]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="presentationPreference"
                            checked={presentationType === 'E-Poster Presentation'}
                            onChange={() => setPresentationType('E-Poster Presentation')}
                            className="accent-[#7C3AED] w-5 h-5 cursor-pointer shrink-0"
                          />
                          <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                            <Tv className="w-5 h-5" />
                          </div>
                          <span className="text-sm sm:text-base font-bold text-[#101B4B] leading-tight">
                            E-Poster Presentation
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===============================================================
                    FORM PANEL 4: SUPPORTING ABSTRACT DOCUMENT (OPTIONAL)
                   =============================================================== */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-[#DCD3FA] shadow-[0_14px_40px_rgba(103,69,197,0.08)] overflow-hidden">
                  <div className="bg-gradient-to-r from-[#E6E0FC] via-[#EFEBFD] to-[#F7F5FE] px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E3DCF9] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-sm shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-[23px] font-extrabold text-[#101B4B] font-heading">
                          Supporting Abstract Document
                        </h3>
                        <p className="text-xs sm:text-sm text-[#4B557A]">
                          Optional document upload in DOC, DOCX, or PDF format (Maximum 2 MB).
                        </p>
                      </div>
                    </div>
                    <span className="px-3.5 py-1 rounded-full bg-white text-[#5B21B6] border border-[#D4C7FA] text-xs font-bold uppercase tracking-wide">
                      Optional
                    </span>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      {/* Left Dropzone */}
                      <div className="lg:col-span-7 flex flex-col">
                        <label
                          htmlFor="supporting-abstract-doc"
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingDoc(true);
                          }}
                          onDragLeave={() => setIsDraggingDoc(false)}
                          onDrop={handleSupportingDocDrop}
                          className={`flex-1 min-h-[190px] border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                            supportingDocError
                              ? 'border-red-400 bg-red-50/30'
                              : isDraggingDoc
                              ? 'border-[#7C3AED] bg-[#F1ECFE]'
                              : 'border-[#C5B6F5] bg-[#FAF8FF] hover:bg-[#F3EEFE] hover:border-[#7C3AED]'
                          }`}
                        >
                          {supportingDocFile ? (
                            <div className="space-y-3 flex flex-col items-center">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
                                <FileCheck className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-sm sm:text-base font-bold text-[#101B4B] break-all max-w-md">
                                  {supportingDocFile.name}
                                </p>
                                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                  {(supportingDocFile.size / 1024).toFixed(1)} KB · Ready to attach
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeSupportingDocument();
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Remove File</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3 flex flex-col items-center">
                              <div className="w-12 h-12 rounded-2xl bg-[#EAE5FC] text-[#7C3AED] flex items-center justify-center">
                                <Upload className="w-6 h-6" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm sm:text-base font-bold text-[#101B4B]">
                                  Drag and drop your abstract file here, or click to upload
                                </p>
                                <p className="text-xs sm:text-sm text-slate-500">
                                  DOC, DOCX or PDF (Max. 2 MB)
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#C9BBF5] text-[#4C1D95] text-xs sm:text-sm font-bold shadow-2xs">
                                <Upload className="w-4 h-4 text-[#7C3AED]" />
                                <span>Choose File</span>
                              </span>
                            </div>
                          )}

                          <input
                            id="supporting-abstract-doc"
                            type="file"
                            accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                            onChange={handleSupportingDocChange}
                            className="hidden"
                          />
                        </label>

                        {supportingDocError && (
                          <p className="text-xs sm:text-sm text-red-600 font-medium mt-2">{supportingDocError}</p>
                        )}
                      </div>

                      {/* Right Format Guidelines Card */}
                      <div className="lg:col-span-5 bg-[#F5F2FE] border border-[#E1D8F8] rounded-2xl p-6 flex flex-col justify-center space-y-3">
                        <div className="flex items-center gap-2 text-[#5B21B6] font-extrabold text-sm sm:text-base">
                          <Info className="w-5 h-5 text-[#7C3AED] shrink-0" />
                          <span>Abstract Format</span>
                        </div>
                        <ul className="space-y-2 text-xs sm:text-sm text-[#2E3659] list-disc pl-5 leading-relaxed">
                          <li>Supporting file upload is optional.</li>
                          <li>Accepted formats: <strong>DOC, DOCX and PDF</strong>.</li>
                          <li>Maximum file size: <strong>2 MB</strong>.</li>
                          <li>All submitted abstracts undergo peer review for scientific acceptance.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===============================================================
                    FORM PANEL 5: DECLARATION & SUBMIT BUTTON
                   =============================================================== */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-[#DCD3FA] shadow-[0_14px_40px_rgba(103,69,197,0.08)] overflow-hidden">
                  <div className="bg-gradient-to-r from-[#E6E0FC] via-[#EFEBFD] to-[#F7F5FE] px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E3DCF9] flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-sm shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl sm:text-[23px] font-extrabold text-[#101B4B] font-heading">
                      Declaration
                    </h3>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    <label className="flex items-start gap-3.5 cursor-pointer group">
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
                    {formErrors.declaration && <p className="text-xs text-red-500 font-medium">{formErrors.declaration}</p>}

                    <div className="pt-4 border-t border-slate-100 text-center">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-3 px-12 py-4 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#14B8D4] text-white text-base sm:text-lg font-bold shadow-[0_12px_30px_rgba(109,40,217,0.3)] hover:shadow-[0_16px_36px_rgba(109,40,217,0.38)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
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
                  </div>
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

      {/* =====================================================================
          CONFIRMATION DIALOG MODAL (ELEVATED CONFIRMATION DIALOG)
         ===================================================================== */}
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

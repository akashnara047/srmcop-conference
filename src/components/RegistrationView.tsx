import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  MapPin,
  Globe,
  Users,
  Briefcase,
  FlaskConical,
  MoreHorizontal,
  FileText,
  CreditCard,
  Upload,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  RefreshCw,
  Edit,
  ClipboardList,
  CheckSquare,
  Square,
  FileCheck,
  X,
  Download,
  Calendar,
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { dispatchRegistrationEmails } from '../lib/emailService';
import {
  submitConferenceRegistration,
  generateRegistrationReceiptPDF,
  type RegistrationRecord,
} from '../lib/managementService';
import { IMAGES } from '../lib/images';
import confetti from 'canvas-confetti';

// Available categories
export type RegistrationCategory =
  | 'Student / Scholar'
  | 'Faculty'
  | 'Industry Professional'
  | 'Researcher'
  | 'Others';

const COMMON_COUNTRIES = [
  'India',
  'Malaysia',
  'United States',
  'United Kingdom',
  'Singapore',
  'Australia',
  'Germany',
  'Canada',
  'United Arab Emirates',
  'Saudi Arabia',
  'Japan',
  'South Korea',
  'France',
  'Italy',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'South Africa',
  'Brazil',
  'New Zealand',
  'Other',
];

const ACCEPTED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // Strict 1 MB (1,048,576 bytes)

export const RegistrationView: React.FC = () => {
  // Top-right tab toggle: 'register' (New Registration) or 'status' (Registration Status)
  const [activeTab, setActiveTab] = useState<'register' | 'status'>('register');

  // =========================================================================
  // SECTION 1: PARTICIPANT DETAILS
  // =========================================================================
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [courseOrDesignation, setCourseOrDesignation] = useState('');
  const [institution, setInstitution] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');

  // =========================================================================
  // SECTION 2: REGISTRATION CATEGORY & CONDITIONAL OTHERS SPECIFICATION
  // =========================================================================
  const [category, setCategory] = useState<RegistrationCategory>('Student / Scholar');
  const [otherCategoryDescription, setOtherCategoryDescription] = useState('');

  // =========================================================================
  // SECTION 3: REGISTRATION DETAILS
  // =========================================================================
  const [participationMode, setParticipationMode] = useState<
    'Offline (On-site at SRMIST)' | 'Online (Virtual)'
  >('Offline (On-site at SRMIST)');
  const [presentationPlans, setPresentationPlans] = useState<string[]>([]);
  const [participatePharmaQuest, setParticipatePharmaQuest] = useState<'Yes' | 'No'>('No');

  // =========================================================================
  // SECTION 4: PAYMENT DETAILS (Manual Amount Entry & 1 MB File Upload)
  // =========================================================================
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofName, setPaymentProofName] = useState('');
  const [paymentProofSize, setPaymentProofSize] = useState<number | null>(null);
  const [paymentProofData, setPaymentProofData] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // =========================================================================
  // SECTION 5: ADDITIONAL INFORMATION (Dietary Preference Only)
  // =========================================================================
  const [dietaryPreference, setDietaryPreference] = useState('');

  // =========================================================================
  // SUBMISSION & VALIDATION STATES
  // =========================================================================
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<RegistrationRecord | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // =========================================================================
  // STATUS LOOKUP & RESUBMISSION STATES
  // =========================================================================
  const [lookupRegId, setLookupRegId] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupRecord, setLookupRecord] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [newTransRef, setNewTransRef] = useState('');
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  // Category change handler: when moving away from 'Others', clear its custom specification
  const handleCategorySelect = (selected: RegistrationCategory) => {
    setCategory(selected);
    if (selected !== 'Others') {
      setOtherCategoryDescription('');
    }
    if (validationErrors.category || validationErrors.otherCategoryDescription) {
      setValidationErrors((prev) => ({ ...prev, category: '', otherCategoryDescription: '' }));
    }
  };

  // Toggle presentation preference checkboxes
  const togglePresentationPlan = (plan: string) => {
    setPresentationPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  };

  // Payment proof file upload handler (STRICT 1 MB MAXIMUM & FORMAT VALIDATION)
  const processUploadedFile = (file: File) => {
    setUploadError(null);
    setValidationErrors((prev) => ({ ...prev, paymentProof: '' }));

    // 1. Validate file extension & mime type
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = ACCEPTED_FILE_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
    const hasValidMime = ACCEPTED_MIME_TYPES.includes(file.type) || file.type === '';

    if (!hasValidExt && !hasValidMime) {
      const err = 'Unsupported file format. Please upload a PDF, JPG, or PNG document.';
      setUploadError(err);
      setValidationErrors((prev) => ({ ...prev, paymentProof: err }));
      return;
    }

    // 2. Validate strict 1 MB file size limit (1,048,576 bytes)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const err = `File size (${sizeMB} MB) exceeds the strict 1 MB limit (maximum 1,048,576 bytes). Please upload a smaller copy.`;
      setUploadError(err);
      setValidationErrors((prev) => ({ ...prev, paymentProof: err }));
      return;
    }

    setPaymentProofFile(file);
    setPaymentProofName(file.name);
    setPaymentProofSize(file.size);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = (event.target?.result as string) || '';
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const optimizedData = canvas.toDataURL('image/jpeg', 0.88);
          setPaymentProofData(optimizedData);
        };
        img.src = rawData;
      } else {
        // PDF or raw document
        setPaymentProofData(rawData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const removePaymentProof = () => {
    setPaymentProofFile(null);
    setPaymentProofName('');
    setPaymentProofSize(null);
    setPaymentProofData('');
    setUploadError(null);
  };

  // Comprehensive Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) errors.fullName = 'Full Name is required';

    if (!email.trim()) {
      errors.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!mobile.trim()) {
      errors.mobile = 'Mobile Number is required';
    } else if (mobile.replace(/\D/g, '').length < 8) {
      errors.mobile = 'Please enter a valid mobile phone number';
    }

    if (!courseOrDesignation.trim()) errors.courseOrDesignation = 'Course / Designation is required';
    if (!institution.trim()) errors.institution = 'Institution / Organization is required';
    if (!city.trim()) errors.city = 'City is required';
    if (!country.trim()) errors.country = 'Country is required';

    // Others category requirement
    if (category === 'Others' && !otherCategoryDescription.trim()) {
      errors.otherCategoryDescription = 'Please specify your registration category';
    }

    // Manual Payment Amount Validation (must be positive number)
    const rawAmount = paymentAmount.trim();
    const numericAmount = parseFloat(rawAmount);
    if (!rawAmount) {
      errors.paymentAmount = 'Please enter the registration fee amount paid';
    } else if (isNaN(numericAmount) || numericAmount <= 0) {
      errors.paymentAmount = 'Please enter a valid positive payment amount (greater than ₹0)';
    }

    if (!paymentMode.trim()) errors.paymentMode = 'Please select a payment mode';

    if (!transactionRef.trim()) {
      errors.transactionRef = 'Transaction / Reference Number is required';
    }

    if (!paymentProofName) {
      errors.paymentProof = 'Payment proof upload is required (PDF, JPG, PNG up to 1 MB)';
    } else if (paymentProofSize && paymentProofSize > MAX_FILE_SIZE_BYTES) {
      errors.paymentProof = 'Payment proof exceeds the maximum 1 MB limit';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Final Registration Submission Handler with Concurrency-Safe Automatic ID Allocation
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError('Please complete all required fields indicated below before proceeding.');
      window.scrollTo({ top: 260, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    const parsedAmount = parseFloat(paymentAmount.trim());

    try {
      const regPayload: Omit<RegistrationRecord, 'id' | 'registrationId' | 'createdAt'> = {
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        courseOrDesignation: courseOrDesignation.trim(),
        institution: institution.trim(),
        city: city.trim(),
        country: country.trim(),
        category,
        otherCategoryDescription: category === 'Others' ? otherCategoryDescription.trim() : '',
        participationMode,
        presentationPlans: presentationPlans.length > 0 ? presentationPlans : ['None'],
        participatePharmaQuest,
        paymentMode,
        transactionReference: transactionRef.trim(),
        paymentAmount: parsedAmount,
        paymentProofName: paymentProofName || 'proof_receipt.pdf',
        paymentProofData: paymentProofData || '',
        dietaryPreference: dietaryPreference ? dietaryPreference.trim() : '',
        linkedAbstractId: null,
        abstractSubmitted: false,
        recordType: 'live',
        paymentStatus: 'Pending Verification',
        registrationStatus: 'Awaiting Approval',
        adminRemarks: '',
      };

      // 1. Concurrency-safe atomic transaction write to Firestore (allocates AICONDD001, AICONDD002, etc.)
      const { regDoc, regId } = await submitConferenceRegistration(regPayload);

      // 2. Trigger notification emails to organizers and participant asynchronously without blocking UI
      dispatchRegistrationEmails({
        id: regId,
        fullName: fullName.trim(),
        email: email.trim(),
        institution: institution.trim(),
        category,
        otherCategoryDescription: category === 'Others' ? otherCategoryDescription.trim() : undefined,
        transactionReference: transactionRef.trim(),
        amount: parsedAmount,
      }).catch((emailErr) => {
        console.warn('Background email dispatch note:', emailErr);
      });

      // 3. Update state to display confirmation dialog and downloadable receipt
      setSubmittedRecord(regDoc);
      setRegisteredId(regId);
      setShowConfirmationModal(true);
      confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Registration error:', err);
      setFormError(
        err.message || 'Registration submission failed. Please check your network and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Status Tracking Lookup Handler (Direct document get, privacy-preserving, no collection scan)
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRegId.trim()) return;

    setSearching(true);
    setLookupRecord(null);
    setLookupError(null);
    setResubmitSuccess(false);

    try {
      const snap = await getDoc(doc(db, 'registrations', lookupRegId.trim().toUpperCase()));
      if (snap.exists()) {
        setLookupRecord(snap.data());
      } else {
        setLookupError(`No registration found matching ID "${lookupRegId.trim().toUpperCase()}".`);
      }
    } catch (err) {
      console.error('Lookup error:', err);
      try {
        handleFirestoreError(err, OperationType.GET, `registrations/${lookupRegId.trim()}`);
      } catch (e: any) {
        setLookupError('Could not retrieve registration record.');
      }
    } finally {
      setSearching(false);
    }
  };

  // Resubmit correction handler if payment was rejected by admin
  const handleResubmitCorrection = async () => {
    if (!newTransRef.trim() || !lookupRecord) return;
    setResubmitting(true);

    try {
      await updateDoc(doc(db, 'registrations', lookupRecord.id), {
        transactionReference: newTransRef.trim(),
        paymentStatus: 'Pending Verification',
        updatedAt: new Date().toISOString(),
      });

      setLookupRecord({
        ...lookupRecord,
        transactionReference: newTransRef.trim(),
        paymentStatus: 'Pending Verification',
      });
      setResubmitSuccess(true);
      setNewTransRef('');
    } catch (err) {
      console.error('Resubmission error:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `registrations/${lookupRecord.id}`);
      } catch (e: any) {
        alert(e.message || 'Failed to update transaction reference.');
      }
    } finally {
      setResubmitting(false);
    }
  };

  const copyId = () => {
    if (registeredId) {
      navigator.clipboard.writeText(registeredId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = () => {
    if (submittedRecord) {
      generateRegistrationReceiptPDF(submittedRecord);
    } else if (registeredId) {
      const fallbackRecord: RegistrationRecord = {
        id: registeredId,
        registrationId: registeredId,
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        courseOrDesignation: courseOrDesignation.trim(),
        institution: institution.trim(),
        city: city.trim(),
        country: country.trim(),
        category,
        otherCategoryDescription: category === 'Others' ? otherCategoryDescription.trim() : '',
        participationMode,
        presentationPlans,
        participatePharmaQuest,
        paymentMode,
        transactionReference: transactionRef.trim(),
        paymentAmount: parseFloat(paymentAmount.trim()) || 0,
        amount: parseFloat(paymentAmount.trim()) || 0,
        paymentProofName: paymentProofName || 'proof_receipt.pdf',
        paymentStatus: 'Pending Verification',
        registrationStatus: 'Awaiting Approval',
        dietaryPreference,
        createdAt: new Date().toISOString(),
      };
      generateRegistrationReceiptPDF(fallbackRecord);
    }
  };

  const resetForm = () => {
    setRegisteredId(null);
    setSubmittedRecord(null);
    setShowConfirmationModal(false);
    setFullName('');
    setEmail('');
    setMobile('');
    setCourseOrDesignation('');
    setInstitution('');
    setCity('');
    setCountry('India');
    setCategory('Student / Scholar');
    setOtherCategoryDescription('');
    setParticipationMode('Offline (On-site at SRMIST)');
    setPresentationPlans([]);
    setParticipatePharmaQuest('No');
    setPaymentAmount('');
    setPaymentMode('');
    setTransactionRef('');
    setPaymentProofFile(null);
    setPaymentProofName('');
    setPaymentProofSize(null);
    setPaymentProofData('');
    setUploadError(null);
    setDietaryPreference('');
    setValidationErrors({});
    setFormError(null);
  };

  return (
    <div
      className="w-full bg-[#F4F1FD] bg-cover bg-center bg-no-repeat min-h-screen py-7 sm:py-9 relative overflow-x-hidden font-['Inter',sans-serif]"
      style={{
        backgroundImage: `url(${IMAGES.registrationPageBg})`,
      }}
    >
      {/* =====================================================================
          REGISTRATION CONFIRMATION DIALOG MODAL (Requirement 3)
         ===================================================================== */}
      {showConfirmationModal && registeredId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#D8D2F8] overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Top decorative gradient bar */}
            <div className="h-2.5 bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#12B8D6]" />

            <div className="p-6 sm:p-8 space-y-5 text-center">
              {/* Success Icon */}
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              {/* Heading & Subtitle */}
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-[#101B4B] font-heading">
                  Registration Successful!
                </h3>
                <p className="text-sm sm:text-[14.5px] font-medium text-slate-600">
                  Your conference registration has been successfully submitted.
                </p>
              </div>

              {/* Conference Meta Box */}
              <div className="p-3.5 bg-gradient-to-r from-[#FAF8FE] to-[#F1EDFD] border border-[#DDD6FE] rounded-2xl text-left space-y-1">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#713CE0]">
                  Conference Title & Dates
                </div>
                <div className="text-[13.5px] font-bold text-[#101B4B] leading-snug">
                  AI-Powered Innovations in Drug Discovery and Development
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#713CE0]" />
                  <span>Conference Dates: <strong>15–16 February 2027</strong></span>
                </div>
              </div>

              {/* Prominent Registration ID Display & Participant Name */}
              <div className="p-4 bg-[#EDE9FD] border-2 border-[#C5B9F7] rounded-2xl space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-[#713CE0]">
                  Official Registration ID
                </div>
                <div className="flex items-center justify-center gap-2.5">
                  <span className="font-mono font-black text-2xl sm:text-3xl text-[#101B4B] tracking-wider">
                    {registeredId}
                  </span>
                  <button
                    type="button"
                    onClick={copyId}
                    title="Copy Registration ID"
                    className="p-2 bg-white hover:bg-slate-50 border border-[#D8D2F8] rounded-xl text-xs font-bold text-[#713CE0] flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-xs text-slate-700 pt-1 border-t border-[#DDD6FE]/70">
                  Participant: <strong>{fullName}</strong> ({email})
                </div>
              </div>

              {/* Notice */}
              <p className="text-[11.5px] text-slate-500 leading-relaxed text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                Please retain your Registration ID (<code>{registeredId}</code>). A computer-generated PDF receipt containing all submitted details is ready for download.
              </p>

              {/* Action Buttons: Download Registration Receipt (PDF) & Close */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="w-full sm:flex-1 h-[44px] px-5 bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#12B8D6] hover:opacity-95 text-white font-bold text-[13.5px] rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Registration Receipt (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmationModal(false)}
                  className="w-full sm:w-auto h-[44px] px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13.5px] rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-[94%] sm:w-[95%] max-w-[1240px] mx-auto relative z-10 space-y-4 sm:space-y-5">
        {/* =====================================================================
            PAGE HEADER (Exact recreation of mockup)
           ===================================================================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-1">
          {/* Left: Eyebrow badge, Title, Subtitle */}
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE5FC] border border-[#DDD6FE] text-[#713CE0] text-[11px] font-bold tracking-wider uppercase">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#713CE0]" />
              <span>DELEGATE REGISTRATION & PAYMENT VERIFICATION</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#101B4B] font-heading tracking-tight leading-tight">
              Registration Portal
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              Register for the conference and complete your payment verification in a single, simple form.
            </p>
          </div>

          {/* Right: Switcher (New Registration / Registration Status) */}
          <div className="inline-flex p-1 bg-white/90 border border-[#D8D2F8] rounded-2xl shadow-xs backdrop-blur-sm shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-[#6D3CE2] to-[#8545EB] text-white shadow-xs'
                  : 'text-[#101B4B] hover:text-[#713CE0] hover:bg-slate-50'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>New Registration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-gradient-to-r from-[#6D3CE2] to-[#8545EB] text-white shadow-xs'
                  : 'text-[#101B4B] hover:text-[#713CE0] hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Registration Status</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            CONDITIONAL VIEW: REGISTRATION STATUS LOOKUP
           ===================================================================== */}
        {activeTab === 'status' ? (
          <div className="bg-white/80 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_24px_rgba(113,60,224,0.06)] overflow-hidden animate-in fade-in duration-200">
            {/* Lavender Header Strip */}
            <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                Track Registration & Payment Status
              </h2>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-[13px] text-slate-600">
                Enter your official Registration ID (e.g. AICONDD001) received upon submission to check payment verification and registration approval.
              </p>

              <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder="e.g. AICONDD001"
                    value={lookupRegId}
                    onChange={(e) => setLookupRegId(e.target.value)}
                    className="w-full h-[40px] px-3.5 bg-white border border-[#D8D2F8] rounded-xl font-mono uppercase font-semibold text-[14px] text-[#101B4B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="h-[40px] px-6 text-[13px] font-bold text-white bg-gradient-to-r from-[#6D3CE2] to-[#8545EB] hover:opacity-95 transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span>{searching ? 'Checking...' : 'Check Status'}</span>
                </button>
              </form>

              {lookupError && (
                <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl flex items-center gap-2 text-[13px] text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{lookupError}</span>
                </div>
              )}

              {lookupRecord && (
                <div className="bg-[#FAF8FE] border border-[#E3DEF9] p-4.5 rounded-xl space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">
                        Official Registration ID
                      </span>
                      {lookupRecord.registrationId ? (
                        <div className="font-mono font-bold text-[20px] text-[#713CE0] flex items-center gap-2">
                          <span>{lookupRecord.registrationId}</span>
                          <span className="text-[11px] font-sans font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified · Eligible for Abstract Submission
                          </span>
                        </div>
                      ) : (
                        <div className="text-amber-800 text-[13px] font-medium pt-0.5">
                          Pending Payment Verification · AICONDD ID issued upon approval
                        </div>
                      )}
                      <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                        Application Ref: {lookupRecord.id}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-0.5 text-[12px] font-semibold rounded-full ${
                          lookupRecord.paymentStatus === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : lookupRecord.paymentStatus === 'Rejected'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        Payment: {lookupRecord.paymentStatus}
                      </span>

                      <span
                        className={`px-3 py-0.5 text-[12px] font-semibold rounded-full ${
                          lookupRecord.registrationStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : lookupRecord.registrationStatus === 'Rejected'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-purple-100 text-[#713CE0] border border-purple-200'
                        }`}
                      >
                        Registration: {lookupRecord.registrationStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                    <div>
                      <span className="text-slate-400 text-[11px] uppercase font-medium block">
                        Participant Name
                      </span>
                      <strong className="text-[#101B4B] font-semibold">{lookupRecord.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] uppercase font-medium block">
                        Category
                      </span>
                      <strong className="text-[#101B4B] font-semibold">
                        {lookupRecord.category}
                        {lookupRecord.otherCategoryDescription && ` (${lookupRecord.otherCategoryDescription})`}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] uppercase font-medium block">
                        Fee Amount
                      </span>
                      <strong className="text-[#101B4B] font-mono font-semibold">
                        ₹{lookupRecord.paymentAmount || lookupRecord.amount}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] uppercase font-medium block">
                        UTR / Reference
                      </span>
                      <strong className="text-[#101B4B] font-mono font-semibold truncate block">
                        {lookupRecord.transactionReference}
                      </strong>
                    </div>
                  </div>

                  {lookupRecord.adminRemarks && (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-[13px]">
                      <strong className="text-slate-700 block mb-0.5 font-semibold">Secretariat Remarks:</strong>
                      <span className="text-slate-600">{lookupRecord.adminRemarks}</span>
                    </div>
                  )}

                  {/* Resubmission section if Payment Rejected */}
                  {lookupRecord.paymentStatus === 'Rejected' && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <h4 className="text-[12px] font-bold text-amber-900 uppercase">
                        Payment Correction Required
                      </h4>
                      <p className="text-[12px] text-amber-800">
                        Your transaction reference could not be verified by the secretariat. Please provide the updated bank UTR / transaction reference number below to resubmit for verification.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Correct UTR / Transaction Reference"
                          value={newTransRef}
                          onChange={(e) => setNewTransRef(e.target.value)}
                          className="flex-1 h-[38px] text-[13px] px-3 bg-white border border-amber-300 rounded-lg outline-none"
                        />
                        <button
                          onClick={handleResubmitCorrection}
                          disabled={resubmitting || !newTransRef.trim()}
                          className="px-4 h-[38px] bg-amber-800 text-white text-[12px] font-bold rounded-lg hover:bg-amber-900 disabled:opacity-50 cursor-pointer"
                        >
                          {resubmitting ? 'Updating...' : 'Resubmit Reference'}
                        </button>
                      </div>
                      {resubmitSuccess && (
                        <div className="text-[12px] text-emerald-700 font-medium flex items-center gap-1.5 pt-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Transaction reference updated. Status changed to Pending Verification.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : registeredId ? (
          /* ===================================================================
              REGISTRATION CONFIRMATION SCREEN
             =================================================================== */
          <div className="bg-white/85 backdrop-blur-md border border-emerald-300 p-6 sm:p-9 rounded-2xl text-center space-y-5 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#101B4B] font-heading">
                Registration Successful!
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                Your conference registration has been successfully submitted.
              </p>
            </div>

            {/* Conference Meta Box */}
            <div className="max-w-md mx-auto p-3.5 bg-gradient-to-r from-[#FAF8FE] to-[#F1EDFD] border border-[#DDD6FE] rounded-2xl text-left space-y-1">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#713CE0]">
                Conference Title & Dates
              </div>
              <div className="text-[13.5px] font-bold text-[#101B4B] leading-snug">
                AI-Powered Innovations in Drug Discovery and Development
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pt-0.5">
                <Calendar className="w-3.5 h-3.5 text-[#713CE0]" />
                <span>Conference Dates: <strong>15–16 February 2027</strong></span>
              </div>
            </div>

            {/* Official Registration ID Banner */}
            <div className="p-4 bg-[#EDE9FD] border-2 border-[#C5B9F7] rounded-2xl inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-5 shadow-2xs">
              <div className="text-left">
                <span className="text-[11px] text-[#713CE0] uppercase font-bold tracking-wider block">
                  Official Registration ID
                </span>
                <span className="font-mono font-bold text-[24px] sm:text-[28px] text-[#101B4B] tracking-wide">
                  {registeredId}
                </span>
              </div>
              <button
                type="button"
                onClick={copyId}
                className="h-[38px] px-3.5 bg-white hover:bg-slate-50 border border-[#D8D2F8] rounded-xl text-[12px] font-bold text-[#713CE0] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Registration ID'}</span>
              </button>
            </div>

            {/* Action Buttons: Download PDF Receipt & Register Another */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="w-full sm:w-auto h-[44px] px-6 bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#12B8D6] hover:opacity-95 text-white font-bold text-[13.5px] rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Registration Receipt (PDF)</span>
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto h-[44px] px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13.5px] rounded-xl transition-colors cursor-pointer"
              >
                Register Another Delegate
              </button>
            </div>

            {/* Submission Details Summary Box */}
            <div className="p-4.5 bg-[#FAF8FE] border border-slate-200 rounded-xl text-left max-w-md mx-auto space-y-2 text-[13px]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-normal">Participant Name:</span>
                <strong className="text-[#101B4B] font-semibold">{fullName}</strong>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-normal">Registration Category:</span>
                <strong className="text-[#713CE0] font-semibold">
                  {category}
                  {category === 'Others' && otherCategoryDescription ? ` (${otherCategoryDescription})` : ''}
                </strong>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-normal">Payment Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Pending Verification
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-normal">Registration Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-[#713CE0] border border-purple-200">
                  Awaiting Approval
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-normal">Total Fee Paid:</span>
                <strong className="text-[#101B4B] font-mono font-bold text-[15px]">₹{paymentAmount}</strong>
              </div>
            </div>

            <div className="text-[12px] text-slate-500 max-w-lg mx-auto">
              A formal acknowledgement has been dispatched to <strong>{email}</strong> and the organizing secretariat at <strong>dean.pharmacy.ktr@srmist.edu.in</strong> and <strong>narayanj@srmist.edu.in</strong>.
            </div>
          </div>
        ) : (
          /* ===================================================================
              SINGLE-PAGE SCROLLING REGISTRATION FORM (All 5 Sections Visible)
             =================================================================== */
          <form onSubmit={handleRegisterSubmit} className="space-y-4 sm:space-y-5">
            {/* Global Error Banner if validation fails */}
            {formError && (
              <div className="p-3 bg-red-50/90 border border-red-300 rounded-xl flex items-center gap-2 text-[13px] text-red-800 shadow-2xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* =================================================================
                SECTION 1 – PARTICIPANT DETAILS
               ================================================================= */}
            <div className="bg-white/80 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden">
              {/* Pale Lavender Header Strip with Icon Badge */}
              <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Participant Details
                </h2>
              </div>

              {/* Form Content Area */}
              <div className="p-4 sm:p-5 lg:p-6 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Dr. / Prof. / Full Name"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (validationErrors.fullName) {
                            setValidationErrors((prev) => ({ ...prev, fullName: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] px-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.fullName ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.fullName && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.fullName}
                      </span>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="delegate@institution.edu"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (validationErrors.email) {
                            setValidationErrors((prev) => ({ ...prev, email: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.email ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.email && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={mobile}
                        onChange={(e) => {
                          setMobile(e.target.value);
                          if (validationErrors.mobile) {
                            setValidationErrors((prev) => ({ ...prev, mobile: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.mobile ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.mobile && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.mobile}
                      </span>
                    )}
                  </div>

                  {/* Course / Designation */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Course / Designation <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. M.Pharm Scholar / Assistant Professor"
                        value={courseOrDesignation}
                        onChange={(e) => {
                          setCourseOrDesignation(e.target.value);
                          if (validationErrors.courseOrDesignation) {
                            setValidationErrors((prev) => ({ ...prev, courseOrDesignation: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.courseOrDesignation ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.courseOrDesignation && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.courseOrDesignation}
                      </span>
                    )}
                  </div>

                  {/* Institution / Organization (Full Width on desktop) */}
                  <div className="md:col-span-2">
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Institution / Organization <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. SRM College of Pharmacy, SRMIST"
                        value={institution}
                        onChange={(e) => {
                          setInstitution(e.target.value);
                          if (validationErrors.institution) {
                            setValidationErrors((prev) => ({ ...prev, institution: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.institution ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.institution && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.institution}
                      </span>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Chennai / Kuala Lumpur"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (validationErrors.city) {
                            setValidationErrors((prev) => ({ ...prev, city: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.city ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.city && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.city}
                      </span>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <Globe className="w-4 h-4" />
                      </div>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-[38px] sm:h-[40px] pl-9.5 pr-3.5 text-[14px] rounded-xl border border-[#D8D2F8] bg-white/95 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] appearance-none cursor-pointer"
                      >
                        {COMMON_COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
                SECTION 2 – REGISTRATION CATEGORY & CONDITIONAL OTHERS SPECIFICATION
               ================================================================= */}
            <div className="bg-white/80 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden">
              {/* Pale Lavender Header Strip with Icon Badge */}
              <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Registration Category
                </h2>
              </div>

              {/* Form Content Area: 5 Selectable Cards in One Row on Desktop */}
              <div className="p-4 sm:p-5 lg:p-6 space-y-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    {
                      id: 'Student / Scholar' as RegistrationCategory,
                      label: 'Student / Scholar',
                      icon: GraduationCap,
                    },
                    {
                      id: 'Faculty' as RegistrationCategory,
                      label: 'Faculty',
                      icon: User,
                    },
                    {
                      id: 'Industry Professional' as RegistrationCategory,
                      label: 'Industry Professional',
                      icon: Briefcase,
                    },
                    {
                      id: 'Researcher' as RegistrationCategory,
                      label: 'Researcher',
                      icon: FlaskConical,
                    },
                    {
                      id: 'Others' as RegistrationCategory,
                      label: 'Others',
                      icon: MoreHorizontal,
                    },
                  ].map((item) => {
                    const isSelected = category === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCategorySelect(item.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCategorySelect(item.id)}
                        className={`h-[90px] sm:h-[94px] rounded-xl px-2 py-2 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-between ${
                          isSelected
                            ? 'border-2 border-[#713CE0] bg-[#F1EDFD] shadow-xs'
                            : 'border border-[#D8D2F8] bg-white/70 hover:border-[#C5B9F7] hover:bg-white'
                        }`}
                      >
                        {/* Top Radio Indicator */}
                        <div className="w-4 h-4 rounded-full flex items-center justify-center border transition-all">
                          {isSelected ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#713CE0] flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#713CE0]" />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                          )}
                        </div>

                        {/* Center Icon */}
                        <div className={isSelected ? 'text-[#713CE0]' : 'text-[#713CE0]/75'}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Category Label */}
                        <span className="text-[13px] sm:text-[14px] font-semibold text-[#101B4B] leading-tight truncate max-w-full px-1">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* DYNAMIC CONDITIONAL FIELD FOR "OTHERS" CATEGORY */}
                {category === 'Others' && (
                  <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="p-3.5 rounded-xl bg-[#F0EBFF]/60 border border-[#DDD6FE] space-y-1.5">
                      <label className="text-[13px] font-semibold text-[#101B4B] flex items-center gap-1">
                        <span>Specify Category</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your category"
                        value={otherCategoryDescription}
                        onChange={(e) => {
                          setOtherCategoryDescription(e.target.value);
                          if (validationErrors.otherCategoryDescription) {
                            setValidationErrors((prev) => ({ ...prev, otherCategoryDescription: '' }));
                          }
                        }}
                        className={`w-full h-[38px] px-3.5 text-[14px] rounded-xl border bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.otherCategoryDescription
                            ? 'border-red-400 bg-red-50/20'
                            : 'border-slate-300'
                        }`}
                      />
                      {validationErrors.otherCategoryDescription && (
                        <span className="text-[11px] text-red-600 font-medium block mt-0.5">
                          {validationErrors.otherCategoryDescription}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =================================================================
                SECTION 3 – REGISTRATION DETAILS (3 Columns with Subtle Dividers)
               ================================================================= */}
            <div className="bg-white/80 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden">
              {/* Pale Lavender Header Strip with Icon Badge */}
              <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Registration Details
                </h2>
              </div>

              {/* Form Content Area: 3 Columns with subtle vertical dividers */}
              <div className="p-4 sm:p-5 lg:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                  {/* Column 1: Mode of Participation */}
                  <div className="space-y-2 md:border-r md:border-[#E3DEF9] md:pr-5">
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1">
                      Mode of Participation <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          value: 'Offline (On-site at SRMIST)' as const,
                          label: 'Offline (On-site at SRMIST)',
                          icon: MapPin,
                        },
                        {
                          value: 'Online (Virtual)' as const,
                          label: 'Online (Virtual)',
                          icon: Globe,
                        },
                      ].map((mode) => {
                        const isSelected = participationMode === mode.value;
                        const Icon = mode.icon;
                        return (
                          <div
                            key={mode.value}
                            role="button"
                            tabIndex={0}
                            onClick={() => setParticipationMode(mode.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setParticipationMode(mode.value)}
                            className={`h-[38px] px-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#713CE0]/50 bg-[#F1EDFD] text-[#101B4B] shadow-2xs'
                                : 'border-[#D8D2F8] bg-white/70 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#713CE0]" />}
                            </div>
                            <Icon className="w-3.5 h-3.5 text-[#713CE0] shrink-0" />
                            <span className="text-[13px] sm:text-[14px] font-medium text-[#101B4B] truncate">
                              {mode.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 2: Presentation Plan (If applicable) */}
                  <div className="space-y-2 md:border-r md:border-[#E3DEF9] md:pr-5">
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1">
                      Presentation Plan <span className="text-slate-500 text-[12px] font-normal">(If applicable)</span>
                    </label>
                    <div className="space-y-2">
                      {['Oral Presentation', 'Poster Presentation', 'E-Poster Presentation'].map((plan) => {
                        const isChecked = presentationPlans.includes(plan);
                        return (
                          <div
                            key={plan}
                            role="button"
                            tabIndex={0}
                            onClick={() => togglePresentationPlan(plan)}
                            onKeyDown={(e) => e.key === 'Enter' && togglePresentationPlan(plan)}
                            className={`h-[38px] px-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              isChecked
                                ? 'border-[#713CE0]/50 bg-[#F1EDFD] text-[#101B4B] shadow-2xs'
                                : 'border-[#D8D2F8] bg-white/70 hover:border-slate-300'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#713CE0] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className="text-[13px] sm:text-[14px] font-normal text-[#101B4B] truncate">
                              {plan}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 3: PharmaQuest Participation */}
                  <div className="space-y-2">
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1">
                      Will you participate in PharmaQuest? <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'Yes' as const, label: 'Yes' },
                        { value: 'No' as const, label: 'No' },
                      ].map((opt) => {
                        const isSelected = participatePharmaQuest === opt.value;
                        return (
                          <div
                            key={opt.value}
                            role="button"
                            tabIndex={0}
                            onClick={() => setParticipatePharmaQuest(opt.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setParticipatePharmaQuest(opt.value)}
                            className={`h-[38px] px-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#713CE0]/50 bg-[#F1EDFD] text-[#101B4B] shadow-2xs'
                                : 'border-[#D8D2F8] bg-white/70 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#713CE0]" />}
                            </div>
                            <span className="text-[13px] sm:text-[14px] font-medium text-[#101B4B]">
                              {opt.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
                SECTION 4 – PAYMENT DETAILS (Manual Amount Entry & 1 MB Limit)
               ================================================================= */}
            <div className="bg-white/80 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden">
              {/* Pale Lavender Header Strip with Icon Badge */}
              <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Payment Details
                </h2>
              </div>

              {/* Form Content Area */}
              <div className="p-4 sm:p-5 lg:p-6 space-y-3.5">
                {/* Row 1: 3 Fields across top (Manual Fee Entry, Payment Mode, Transaction Ref) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-3.5">
                  {/* Manual Registration Fee (INR) Entry */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Registration Fee (INR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0] font-bold text-[14px]">
                        ₹
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="e.g. 2000"
                        value={paymentAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^[0-9]*\.?[0-9]*$/.test(val) || val === '') {
                            setPaymentAmount(val);
                            if (validationErrors.paymentAmount) {
                              setValidationErrors((prev) => ({ ...prev, paymentAmount: '' }));
                            }
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-8 pr-3.5 text-[14px] rounded-xl border bg-white/95 font-mono text-[#101B4B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] transition-colors ${
                          validationErrors.paymentAmount ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.paymentAmount && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.paymentAmount}
                      </span>
                    )}
                  </div>

                  {/* Payment Mode Dropdown (Initially displays "Select Payment Mode") */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={paymentMode}
                        onChange={(e) => {
                          setPaymentMode(e.target.value);
                          if (validationErrors.paymentMode) {
                            setValidationErrors((prev) => ({ ...prev, paymentMode: '' }));
                          }
                        }}
                        className="w-full h-[38px] sm:h-[40px] px-3.5 text-[14px] rounded-xl border border-[#D8D2F8] bg-white/95 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] cursor-pointer appearance-none"
                      >
                        <option value="">Select Payment Mode</option>
                        <option value="UPI">UPI</option>
                        <option value="NEFT">NEFT</option>
                        <option value="IMPS">IMPS</option>
                        <option value="Bank Transfer / Other">Bank Transfer / Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                    {validationErrors.paymentMode && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.paymentMode}
                      </span>
                    )}
                  </div>

                  {/* Transaction / Reference Number */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Transaction / Reference No. <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0] font-mono text-[14px]">
                        #
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. UPI/NEFT/IMPS ID"
                        value={transactionRef}
                        onChange={(e) => {
                          setTransactionRef(e.target.value);
                          if (validationErrors.transactionRef) {
                            setValidationErrors((prev) => ({ ...prev, transactionRef: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-8 pr-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] ${
                          validationErrors.transactionRef ? 'border-red-400 bg-red-50/20' : 'border-[#D8D2F8]'
                        }`}
                      />
                    </div>
                    {validationErrors.transactionRef && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.transactionRef}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Upload Payment Proof & Payment Guidelines/Bank Details side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-3.5 pt-1">
                  {/* Left: Upload Payment Proof (Dashed violet border, Strict 1 MB limit) */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Upload Payment Proof <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <label
                        htmlFor="payment-proof-input"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        className={`w-full min-h-[130px] border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#FAF8FE] hover:bg-[#F3EFFE] ${
                          validationErrors.paymentProof || uploadError
                            ? 'border-red-400 bg-red-50/20'
                            : 'border-[#C5B9F7] hover:border-[#713CE0]'
                        }`}
                      >
                        {paymentProofName ? (
                          <div className="space-y-1.5 flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[13px] font-semibold text-[#101B4B] block truncate max-w-xs">
                                {paymentProofName}
                              </span>
                              {paymentProofSize && (
                                <span className="text-[11px] text-slate-500">
                                  {(paymentProofSize / 1024).toFixed(1)} KB · Ready for verification
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removePaymentProof();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Remove / Replace</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-[#EAE5FC] text-[#713CE0] flex items-center justify-center">
                              <Upload className="w-4 h-4" />
                            </div>
                            <span className="text-[13px] font-semibold text-[#101B4B]">
                              Drag and drop or click to upload
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              PDF / JPG / PNG (Max. 1 MB)
                            </span>
                          </div>
                        )}

                        <input
                          id="payment-proof-input"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/jpeg,image/png"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {(validationErrors.paymentProof || uploadError) && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.paymentProof || uploadError}
                      </span>
                    )}
                  </div>

                  {/* Right: Payment Note & Official Bank Details panel */}
                  <div>
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5 opacity-0 hidden lg:block">
                      Official Details
                    </label>
                    <div className="min-h-[130px] p-3.5 rounded-xl bg-[#FAF8FE] border border-[#E3DEF9] flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#713CE0]">
                          <Info className="w-3.5 h-3.5" />
                          <span>Note:</span>
                        </div>

                        <ul className="space-y-1 text-[12px] text-[#26345B] leading-tight">
                          <li className="flex items-start gap-1.5">
                            <span className="text-[#713CE0] font-bold">•</span>
                            <span>Ensure the payment is made to the official conference account.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-[#713CE0] font-bold">•</span>
                            <span>The payment proof should clearly show the transaction details.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-[#713CE0] font-bold">•</span>
                            <span>Your registration will be confirmed after payment verification.</span>
                          </li>
                        </ul>
                      </div>

                      {/* Official Bank Account Details Strip */}
                      <div className="pt-2 border-t border-[#E3DEF9] text-[11px] text-slate-600 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span><strong className="text-slate-800">A/C:</strong> 6529731428</span>
                          <span><strong className="text-slate-800">IFSC:</strong> IDIB000S181</span>
                        </div>
                        <div className="truncate">
                          <strong className="text-slate-800">Account Name:</strong> SRM College of Pharmacy · Indian Bank
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
                SECTION 5 – ADDITIONAL INFORMATION (Revised: Dietary Preference Only)
               ================================================================= */}
            <div className="bg-white/80 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden">
              {/* Pale Lavender Header Strip with Icon Badge */}
              <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Additional Information
                </h2>
              </div>

              {/* Form Content Area: Dietary Preference as a single full-width field */}
              <div className="p-4 sm:p-5 lg:p-6">
                <div>
                  <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                    Dietary Preference
                  </label>
                  <div className="relative">
                    <select
                      value={dietaryPreference}
                      onChange={(e) => setDietaryPreference(e.target.value)}
                      className="w-full h-[38px] sm:h-[40px] px-3.5 text-[14px] rounded-xl border border-[#D8D2F8] bg-white/95 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] cursor-pointer appearance-none"
                    >
                      <option value="">Select an option</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
                REGISTER NOW BUTTON (Mockup-identical prominent pill gradient CTA)
               ================================================================= */}
            <div className="flex flex-col items-center justify-center pt-2 pb-4 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto min-w-[260px] sm:min-w-[300px] h-[48px] px-8 rounded-full bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#12B8D6] hover:opacity-95 text-white font-bold text-[15px] sm:text-[16px] shadow-[0_8px_25px_rgba(109,60,226,0.3)] hover:shadow-[0_10px_28px_rgba(109,60,226,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Submission...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Register Now</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

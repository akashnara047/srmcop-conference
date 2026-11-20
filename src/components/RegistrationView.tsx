import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertTriangle,
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
  QrCode,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { triggerRegistrationReceivedEmail } from '../lib/emailService';
import {
  submitConferenceRegistration,
  resubmitRejectedRegistrationUtr,
  generateRegistrationSubmissionReceiptPDF,
  type RegistrationRecord,
} from '../lib/managementService';
import {
  UTR_AVAILABLE_MESSAGE,
  UTR_CHECKING_MESSAGE,
  UTR_DUPLICATE_MESSAGE,
  checkTransactionReferenceAvailability,
  isDuplicateTransactionReferenceError,
  normalizeTransactionReference,
  type UtrAvailabilityStatus,
} from '../lib/utrValidationService';
import {
  CHECKING_EMAIL_MESSAGE,
  CHECKING_MOBILE_MESSAGE,
  CHECKING_NAME_MESSAGE,
  DETAILS_VERIFIED_MESSAGE,
  DUPLICATE_EMAIL_MESSAGE,
  DUPLICATE_MOBILE_MESSAGE,
  DUPLICATE_UTR_MESSAGE,
  EMAIL_AVAILABLE_MESSAGE,
  MOBILE_AVAILABLE_MESSAGE,
  SAME_NAME_AND_INSTITUTION_WARNING_MESSAGE,
  SIMILAR_NAME_WARNING_MESSAGE,
  checkEmailAvailability,
  checkMobileAvailability,
  checkNameAdvisoryMatch,
  isDuplicateRecordError,
  normalizeEmail,
  normalizeMobileInternational,
  normalizePersonName,
  type FieldAvailabilityStatus,
  type NameAdvisoryStatus,
} from '../lib/duplicatePreventionService';
import {
  INTERNAL_INSTITUTION_NAME,
  type InstitutionCategoryValue,
} from '../lib/presentationDashboardStats';
import { IMAGES } from '../lib/images';
import {
  REGISTRATION_DEADLINE,
  REGISTRATION_FEE_SCHEDULE,
  getApplicableRegistrationFee,
} from '../data/conferenceData';
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
  const [institutionCategory, setInstitutionCategory] = useState<InstitutionCategoryValue | ''>('');
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
  const [copiedUpi, setCopiedUpi] = useState(false);

  // =========================================================================
  // REAL-TIME DUPLICATE VALIDATION STATES (EMAIL, MOBILE, NAME, UTR)
  // =========================================================================
  const [utrCheckStatus, setUtrCheckStatus] = useState<UtrAvailabilityStatus>('idle');
  const [utrCheckMessage, setUtrCheckMessage] = useState<string>('');
  const [lastCheckedNormalizedUtr, setLastCheckedNormalizedUtr] = useState<string>('');
  const utrCheckSeqRef = useRef(0);

  const [emailCheckStatus, setEmailCheckStatus] = useState<FieldAvailabilityStatus>('idle');
  const [emailCheckMessage, setEmailCheckMessage] = useState<string>('');
  const [lastCheckedNormalizedEmail, setLastCheckedNormalizedEmail] = useState<string>('');
  const emailCheckSeqRef = useRef(0);

  const [mobileCheckStatus, setMobileCheckStatus] = useState<FieldAvailabilityStatus>('idle');
  const [mobileCheckMessage, setMobileCheckMessage] = useState<string>('');
  const [lastCheckedNormalizedMobile, setLastCheckedNormalizedMobile] = useState<string>('');
  const mobileCheckSeqRef = useRef(0);

  const [nameAdvisoryStatus, setNameAdvisoryStatus] = useState<NameAdvisoryStatus>('idle');
  const [nameAdvisoryMessage, setNameAdvisoryMessage] = useState<string>('');
  const [lastCheckedNameSignature, setLastCheckedNameSignature] = useState<string>('');
  const nameCheckSeqRef = useRef(0);

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
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [resubmitUtrStatus, setResubmitUtrStatus] = useState<UtrAvailabilityStatus>('idle');
  const [resubmitUtrMessage, setResubmitUtrMessage] = useState<string>('');
  const [resubmitLastCheckedUtr, setResubmitLastCheckedUtr] = useState<string>('');
  const resubmitUtrSeqRef = useRef(0);

  const applicableFee = getApplicableRegistrationFee(category);

  // Real-time Firestore availability check for new registration UTR
  const runUtrAvailabilityCheck = useCallback(async (rawValue: string) => {
    const normalized = normalizeTransactionReference(rawValue);
    if (!normalized) {
      utrCheckSeqRef.current += 1;
      setUtrCheckStatus('idle');
      setUtrCheckMessage('');
      setLastCheckedNormalizedUtr('');
      return null;
    }

    const requestSeq = ++utrCheckSeqRef.current;
    setUtrCheckStatus('checking');
    setUtrCheckMessage(UTR_CHECKING_MESSAGE);

    const result = await checkTransactionReferenceAvailability(rawValue);
    if (requestSeq !== utrCheckSeqRef.current) {
      return null;
    }

    setUtrCheckStatus(result.status);
    setUtrCheckMessage(result.message);
    setLastCheckedNormalizedUtr(result.normalizedUtr);

    if (result.status === 'duplicate') {
      setValidationErrors((prev) => ({
        ...prev,
        transactionRef: UTR_DUPLICATE_MESSAGE,
      }));
    } else if (result.status === 'available') {
      setValidationErrors((prev) =>
        prev.transactionRef ? { ...prev, transactionRef: '' } : prev
      );
    }

    return result;
  }, []);

  // Debounced check after participant finishes typing UTR (min 3 chars while typing; blur checks any length)
  useEffect(() => {
    const trimmed = transactionRef.trim();
    if (!trimmed) {
      utrCheckSeqRef.current += 1;
      setUtrCheckStatus('idle');
      setUtrCheckMessage('');
      setLastCheckedNormalizedUtr('');
      return;
    }

    const normalized = normalizeTransactionReference(trimmed);
    if (
      normalized === lastCheckedNormalizedUtr &&
      (utrCheckStatus === 'available' || utrCheckStatus === 'duplicate')
    ) {
      return;
    }

    if (trimmed.length < 3) {
      setUtrCheckStatus('idle');
      setUtrCheckMessage('');
      return;
    }

    const timer = window.setTimeout(() => {
      void runUtrAvailabilityCheck(trimmed);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [transactionRef, lastCheckedNormalizedUtr, utrCheckStatus, runUtrAvailabilityCheck]);

  // Real-time Firestore availability check for Email Address
  const runEmailAvailabilityCheck = useCallback(async (rawValue: string) => {
    const normalized = normalizeEmail(rawValue);
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      emailCheckSeqRef.current += 1;
      setEmailCheckStatus('idle');
      setEmailCheckMessage('');
      setLastCheckedNormalizedEmail('');
      return null;
    }

    const requestSeq = ++emailCheckSeqRef.current;
    setEmailCheckStatus('checking');
    setEmailCheckMessage(CHECKING_EMAIL_MESSAGE);

    const result = await checkEmailAvailability(rawValue);
    if (requestSeq !== emailCheckSeqRef.current) {
      return null;
    }

    setEmailCheckStatus(result.status);
    setEmailCheckMessage(result.message);
    setLastCheckedNormalizedEmail(result.normalizedValue);

    if (result.status === 'duplicate') {
      setValidationErrors((prev) => ({
        ...prev,
        email: DUPLICATE_EMAIL_MESSAGE,
      }));
    } else if (result.status === 'available') {
      setValidationErrors((prev) => (prev.email ? { ...prev, email: '' } : prev));
    }

    return result;
  }, []);

  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      emailCheckSeqRef.current += 1;
      setEmailCheckStatus('idle');
      setEmailCheckMessage('');
      setLastCheckedNormalizedEmail('');
      return;
    }

    const normalized = normalizeEmail(trimmed);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailCheckStatus('idle');
      setEmailCheckMessage('');
      return;
    }

    if (
      normalized === lastCheckedNormalizedEmail &&
      (emailCheckStatus === 'available' || emailCheckStatus === 'duplicate')
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runEmailAvailabilityCheck(trimmed);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [email, lastCheckedNormalizedEmail, emailCheckStatus, runEmailAvailabilityCheck]);

  // Real-time Firestore availability check for Mobile Number (country-aware E.164 normalization)
  const runMobileAvailabilityCheck = useCallback(
    async (rawValue: string, targetCountry: string) => {
      const digitsOnly = rawValue.replace(/\D/g, '');
      const normalized = normalizeMobileInternational(rawValue, targetCountry);
      if (!normalized || digitsOnly.length < 8) {
        mobileCheckSeqRef.current += 1;
        setMobileCheckStatus('idle');
        setMobileCheckMessage('');
        setLastCheckedNormalizedMobile('');
        return null;
      }

      const requestSeq = ++mobileCheckSeqRef.current;
      setMobileCheckStatus('checking');
      setMobileCheckMessage(CHECKING_MOBILE_MESSAGE);

      const result = await checkMobileAvailability(rawValue, targetCountry);
      if (requestSeq !== mobileCheckSeqRef.current) {
        return null;
      }

      setMobileCheckStatus(result.status);
      setMobileCheckMessage(result.message);
      setLastCheckedNormalizedMobile(result.normalizedValue);

      if (result.status === 'duplicate') {
        setValidationErrors((prev) => ({
          ...prev,
          mobile: DUPLICATE_MOBILE_MESSAGE,
        }));
      } else if (result.status === 'available') {
        setValidationErrors((prev) => (prev.mobile ? { ...prev, mobile: '' } : prev));
      }

      return result;
    },
    []
  );

  useEffect(() => {
    const trimmed = mobile.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!trimmed || digitsOnly.length < 8) {
      mobileCheckSeqRef.current += 1;
      setMobileCheckStatus('idle');
      setMobileCheckMessage('');
      setLastCheckedNormalizedMobile('');
      return;
    }

    const normalized = normalizeMobileInternational(trimmed, country);
    if (
      normalized === lastCheckedNormalizedMobile &&
      (mobileCheckStatus === 'available' || mobileCheckStatus === 'duplicate')
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runMobileAvailabilityCheck(trimmed, country);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [mobile, country, lastCheckedNormalizedMobile, mobileCheckStatus, runMobileAvailabilityCheck]);

  // Real-time Non-Blocking Advisory Check for Full Name (+ Institution)
  const effectiveInstitution =
    institutionCategory === 'internal' ? INTERNAL_INSTITUTION_NAME : institution.trim();

  const runNameAdvisoryCheck = useCallback(
    async (rawName: string, rawInstitution: string) => {
      const normalizedName = normalizePersonName(rawName);
      if (!normalizedName || normalizedName.length < 3) {
        nameCheckSeqRef.current += 1;
        setNameAdvisoryStatus('idle');
        setNameAdvisoryMessage('');
        setLastCheckedNameSignature('');
        return null;
      }

      const sig = `${normalizedName}|${rawInstitution.trim().toLowerCase()}`;
      const requestSeq = ++nameCheckSeqRef.current;
      setNameAdvisoryStatus('checking');
      setNameAdvisoryMessage(CHECKING_NAME_MESSAGE);

      const result = await checkNameAdvisoryMatch(rawName, rawInstitution);
      if (requestSeq !== nameCheckSeqRef.current) {
        return null;
      }

      setNameAdvisoryStatus(result.status);
      setNameAdvisoryMessage(result.message);
      setLastCheckedNameSignature(sig);
      return result;
    },
    []
  );

  useEffect(() => {
    const normalizedName = normalizePersonName(fullName);
    if (!normalizedName || normalizedName.length < 3) {
      nameCheckSeqRef.current += 1;
      setNameAdvisoryStatus('idle');
      setNameAdvisoryMessage('');
      setLastCheckedNameSignature('');
      return;
    }

    const sig = `${normalizedName}|${effectiveInstitution.toLowerCase()}`;
    if (
      sig === lastCheckedNameSignature &&
      nameAdvisoryStatus !== 'idle' &&
      nameAdvisoryStatus !== 'error'
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runNameAdvisoryCheck(fullName, effectiveInstitution);
    }, 550);

    return () => window.clearTimeout(timer);
  }, [
    fullName,
    effectiveInstitution,
    lastCheckedNameSignature,
    nameAdvisoryStatus,
    runNameAdvisoryCheck,
  ]);

  const hasAnyStrictDuplicate =
    emailCheckStatus === 'duplicate' ||
    mobileCheckStatus === 'duplicate' ||
    utrCheckStatus === 'duplicate';

  const isCheckingAnyDuplicate =
    emailCheckStatus === 'checking' ||
    mobileCheckStatus === 'checking' ||
    utrCheckStatus === 'checking';

  const allStrictDetailsVerified =
    emailCheckStatus === 'available' &&
    mobileCheckStatus === 'available' &&
    utrCheckStatus === 'available' &&
    !hasAnyStrictDuplicate;

  // Real-time Firestore availability check for Rejected-payment UTR resubmission (excludes own registration record)
  const runResubmitUtrCheck = useCallback(
    async (rawValue: string, ownRegId?: string | null) => {
      const normalized = normalizeTransactionReference(rawValue);
      if (!normalized) {
        resubmitUtrSeqRef.current += 1;
        setResubmitUtrStatus('idle');
        setResubmitUtrMessage('');
        setResubmitLastCheckedUtr('');
        return null;
      }

      const requestSeq = ++resubmitUtrSeqRef.current;
      setResubmitUtrStatus('checking');
      setResubmitUtrMessage(UTR_CHECKING_MESSAGE);

      const result = await checkTransactionReferenceAvailability(rawValue, ownRegId);
      if (requestSeq !== resubmitUtrSeqRef.current) {
        return null;
      }

      setResubmitUtrStatus(result.status);
      setResubmitUtrMessage(result.message);
      setResubmitLastCheckedUtr(result.normalizedUtr);
      if (result.status === 'duplicate') {
        setResubmitError(UTR_DUPLICATE_MESSAGE);
      } else if (result.status === 'available') {
        setResubmitError(null);
      }
      return result;
    },
    []
  );

  useEffect(() => {
    if (!lookupRecord || lookupRecord.paymentStatus !== 'Rejected') return;
    const trimmed = newTransRef.trim();
    if (!trimmed) {
      resubmitUtrSeqRef.current += 1;
      setResubmitUtrStatus('idle');
      setResubmitUtrMessage('');
      setResubmitLastCheckedUtr('');
      setResubmitError(null);
      return;
    }

    const normalized = normalizeTransactionReference(trimmed);
    if (
      normalized === resubmitLastCheckedUtr &&
      (resubmitUtrStatus === 'available' || resubmitUtrStatus === 'duplicate')
    ) {
      return;
    }

    if (trimmed.length < 3) {
      setResubmitUtrStatus('idle');
      setResubmitUtrMessage('');
      return;
    }

    const timer = window.setTimeout(() => {
      void runResubmitUtrCheck(trimmed, lookupRecord.id);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [newTransRef, lookupRecord, resubmitLastCheckedUtr, resubmitUtrStatus, runResubmitUtrCheck]);

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

  // Institution Category handler: locks & auto-populates SRMIST for Internal, enables free-text for External
  const handleInstitutionCategorySelect = (selected: InstitutionCategoryValue) => {
    setInstitutionCategory(selected);
    if (selected === 'internal') {
      setInstitution(INTERNAL_INSTITUTION_NAME);
      setValidationErrors((prev) => ({
        ...prev,
        institutionCategory: '',
        institution: '',
      }));
    } else {
      if (institution.trim() === INTERNAL_INSTITUTION_NAME) {
        setInstitution('');
      }
      setValidationErrors((prev) => ({
        ...prev,
        institutionCategory: '',
      }));
    }
  };

  const isOfflineParticipation = participationMode === 'Offline (On-site at SRMIST)';

  // Participation mode handler: clear stale food preference when switching to Online
  const handleParticipationModeSelect = (
    selectedMode: 'Offline (On-site at SRMIST)' | 'Online (Virtual)'
  ) => {
    setParticipationMode(selectedMode);
    if (selectedMode === 'Online (Virtual)') {
      setDietaryPreference('');
      if (validationErrors.dietaryPreference) {
        setValidationErrors((prev) => ({ ...prev, dietaryPreference: '' }));
      }
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
    } else if (emailCheckStatus === 'duplicate') {
      errors.email = DUPLICATE_EMAIL_MESSAGE;
    }

    if (!mobile.trim()) {
      errors.mobile = 'Mobile Number is required';
    } else if (mobile.replace(/\D/g, '').length < 8) {
      errors.mobile = 'Please enter a valid mobile phone number';
    } else if (mobileCheckStatus === 'duplicate') {
      errors.mobile = DUPLICATE_MOBILE_MESSAGE;
    }

    if (!courseOrDesignation.trim()) errors.courseOrDesignation = 'Course / Designation is required';
    if (!institutionCategory) {
      errors.institutionCategory = 'Please select your Institution Category (Internal or External)';
    }
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
    } else if (utrCheckStatus === 'duplicate') {
      errors.transactionRef = DUPLICATE_UTR_MESSAGE;
    }

    if (!paymentProofName) {
      errors.paymentProof = 'Payment proof upload is required (PDF, JPG, PNG up to 1 MB)';
    } else if (paymentProofSize && paymentProofSize > MAX_FILE_SIZE_BYTES) {
      errors.paymentProof = 'Payment proof exceeds the maximum 1 MB limit';
    }

    // Conditional Food Preference validation: mandatory for Offline participants only
    if (
      isOfflineParticipation &&
      dietaryPreference !== 'Vegetarian' &&
      dietaryPreference !== 'Non-Vegetarian'
    ) {
      errors.dietaryPreference = 'Please select your Food Preference (Vegetarian or Non-Vegetarian)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Final Registration Submission Handler with Concurrency-Safe Automatic ID Allocation
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      if (emailCheckStatus === 'duplicate') {
        setFormError(DUPLICATE_EMAIL_MESSAGE);
      } else if (mobileCheckStatus === 'duplicate') {
        setFormError(DUPLICATE_MOBILE_MESSAGE);
      } else if (utrCheckStatus === 'duplicate') {
        setFormError(DUPLICATE_UTR_MESSAGE);
      } else {
        setFormError('Please complete all required fields indicated below before proceeding.');
      }
      window.scrollTo({ top: 260, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    const parsedAmount = parseFloat(paymentAmount.trim());

    try {
      // Mandatory live uniqueness checks right before submission (prevents bypass via refresh or rapid submit)
      const normalizedEmail = normalizeEmail(email);
      if (normalizedEmail !== lastCheckedNormalizedEmail || emailCheckStatus !== 'available') {
        const liveEmailCheck = await runEmailAvailabilityCheck(email);
        if (liveEmailCheck && liveEmailCheck.status === 'duplicate') {
          setValidationErrors((prev) => ({
            ...prev,
            email: DUPLICATE_EMAIL_MESSAGE,
          }));
          setFormError(DUPLICATE_EMAIL_MESSAGE);
          setSubmitting(false);
          window.scrollTo({ top: 260, behavior: 'smooth' });
          return;
        }
      }

      const normalizedMobile = normalizeMobileInternational(mobile, country);
      if (normalizedMobile !== lastCheckedNormalizedMobile || mobileCheckStatus !== 'available') {
        const liveMobileCheck = await runMobileAvailabilityCheck(mobile, country);
        if (liveMobileCheck && liveMobileCheck.status === 'duplicate') {
          setValidationErrors((prev) => ({
            ...prev,
            mobile: DUPLICATE_MOBILE_MESSAGE,
          }));
          setFormError(DUPLICATE_MOBILE_MESSAGE);
          setSubmitting(false);
          window.scrollTo({ top: 260, behavior: 'smooth' });
          return;
        }
      }

      const normalizedUtr = normalizeTransactionReference(transactionRef);
      if (normalizedUtr !== lastCheckedNormalizedUtr || utrCheckStatus !== 'available') {
        const liveCheck = await runUtrAvailabilityCheck(transactionRef);
        if (liveCheck && liveCheck.status === 'duplicate') {
          setValidationErrors((prev) => ({
            ...prev,
            transactionRef: DUPLICATE_UTR_MESSAGE,
          }));
          setFormError(DUPLICATE_UTR_MESSAGE);
          setSubmitting(false);
          return;
        }
      }

      const resolvedInstitution =
        institutionCategory === 'internal'
          ? INTERNAL_INSTITUTION_NAME
          : institution.trim();

      const regPayload: Omit<RegistrationRecord, 'id' | 'registrationId' | 'createdAt'> = {
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        courseOrDesignation: courseOrDesignation.trim(),
        institutionCategory: institutionCategory as InstitutionCategoryValue,
        institution: resolvedInstitution,
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
        ...(isOfflineParticipation ? { dietaryPreference: dietaryPreference.trim() } : {}),
        linkedAbstractId: null,
        abstractSubmitted: false,
        recordType: 'live',
        paymentStatus: 'Pending Verification',
        registrationStatus: 'Awaiting Approval',
        adminRemarks: '',
      };

      // 1. Concurrency-safe atomic transaction write to Firestore (validates unique email/mobile/UTR & allocates AICONDDxxx)
      const { regDoc, regId } = await submitConferenceRegistration(regPayload);

      // 2. Trigger Event 1 (Registration Received) email asynchronously without blocking UI
      triggerRegistrationReceivedEmail(regDoc).catch((emailErr) => {
        console.warn('Background registration received email note:', emailErr);
      });

      // 3. Update state to display confirmation dialog and downloadable receipt
      setSubmittedRecord(regDoc);
      setRegisteredId(regId);
      setShowConfirmationModal(true);
      confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } catch (err: any) {
      if (isDuplicateRecordError(err) || isDuplicateTransactionReferenceError(err)) {
        const code = (err as { code?: string }).code;
        if (code === 'DUPLICATE_EMAIL') {
          setEmailCheckStatus('duplicate');
          setEmailCheckMessage(DUPLICATE_EMAIL_MESSAGE);
          setLastCheckedNormalizedEmail(normalizeEmail(email));
          setValidationErrors((prev) => ({ ...prev, email: DUPLICATE_EMAIL_MESSAGE }));
          setFormError(DUPLICATE_EMAIL_MESSAGE);
          window.scrollTo({ top: 260, behavior: 'smooth' });
        } else if (code === 'DUPLICATE_MOBILE') {
          setMobileCheckStatus('duplicate');
          setMobileCheckMessage(DUPLICATE_MOBILE_MESSAGE);
          setLastCheckedNormalizedMobile(normalizeMobileInternational(mobile, country));
          setValidationErrors((prev) => ({ ...prev, mobile: DUPLICATE_MOBILE_MESSAGE }));
          setFormError(DUPLICATE_MOBILE_MESSAGE);
          window.scrollTo({ top: 260, behavior: 'smooth' });
        } else if (code === 'DUPLICATE_UTR' || isDuplicateTransactionReferenceError(err)) {
          setUtrCheckStatus('duplicate');
          setUtrCheckMessage(DUPLICATE_UTR_MESSAGE);
          setLastCheckedNormalizedUtr(normalizeTransactionReference(transactionRef));
          setValidationErrors((prev) => ({ ...prev, transactionRef: DUPLICATE_UTR_MESSAGE }));
          setFormError(DUPLICATE_UTR_MESSAGE);
        } else {
          setFormError(err.message || 'A duplicate registration record was detected.');
        }
      } else {
        console.error('Registration error:', err);
        let friendlyMessage =
          err?.message || 'Registration submission failed. Please check your network and try again.';
        if (typeof err?.message === 'string' && err.message.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(err.message);
            if (typeof parsed?.error === 'string') {
              friendlyMessage = parsed.error.toLowerCase().includes('permission')
                ? 'Registration could not be completed due to a database permission or validation check. Please refresh the page and try again, or contact org.secy.cp@srmist.edu.in if the issue persists.'
                : parsed.error;
            }
          } catch {
            // Fall back to default message
          }
        }
        setFormError(friendlyMessage);
      }
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

  // Resubmit correction handler if payment was rejected by admin (atomic duplicate-safe)
  const handleResubmitCorrection = async () => {
    if (!newTransRef.trim() || !lookupRecord) return;
    setResubmitError(null);
    setResubmitSuccess(false);

    if (resubmitUtrStatus === 'duplicate') {
      setResubmitError(UTR_DUPLICATE_MESSAGE);
      return;
    }

    setResubmitting(true);

    try {
      const normalized = normalizeTransactionReference(newTransRef);
      if (normalized !== resubmitLastCheckedUtr || resubmitUtrStatus !== 'available') {
        const liveCheck = await runResubmitUtrCheck(newTransRef, lookupRecord.id);
        if (liveCheck && liveCheck.status === 'duplicate') {
          setResubmitError(UTR_DUPLICATE_MESSAGE);
          setResubmitting(false);
          return;
        }
      }

      const updated = await resubmitRejectedRegistrationUtr({
        regDocId: lookupRecord.id,
        newTransactionReference: newTransRef.trim(),
      });

      setLookupRecord({
        ...lookupRecord,
        transactionReference: updated.transactionReference,
        normalizedTransactionReference: updated.normalizedTransactionReference,
        transactionReferenceKey: updated.transactionReferenceKey,
        paymentStatus: updated.paymentStatus,
        updatedAt: updated.updatedAt,
      });
      setResubmitSuccess(true);
      setNewTransRef('');
      setResubmitUtrStatus('idle');
      setResubmitUtrMessage('');
      setResubmitLastCheckedUtr('');
    } catch (err: any) {
      if (isDuplicateTransactionReferenceError(err)) {
        setResubmitUtrStatus('duplicate');
        setResubmitUtrMessage(UTR_DUPLICATE_MESSAGE);
        setResubmitLastCheckedUtr(err.normalizedUtr);
        setResubmitError(UTR_DUPLICATE_MESSAGE);
      } else {
        console.error('Resubmission error:', err);
        setResubmitError(err?.message || 'Failed to update transaction reference.');
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

  const copyUpiId = () => {
    navigator.clipboard.writeText('EZE0362244@CUB');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const isLookupConfirmationEligible =
    !!lookupRecord &&
    lookupRecord.paymentStatus === 'Verified' &&
    lookupRecord.registrationStatus === 'Approved';

  const handleDownloadSubmissionReceiptPDF = (record?: RegistrationRecord | null) => {
    const target = record || submittedRecord;
    if (!target) return;
    generateRegistrationSubmissionReceiptPDF(target);
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
    utrCheckSeqRef.current += 1;
    setUtrCheckStatus('idle');
    setUtrCheckMessage('');
    setLastCheckedNormalizedUtr('');
    emailCheckSeqRef.current += 1;
    setEmailCheckStatus('idle');
    setEmailCheckMessage('');
    setLastCheckedNormalizedEmail('');
    mobileCheckSeqRef.current += 1;
    setMobileCheckStatus('idle');
    setMobileCheckMessage('');
    setLastCheckedNormalizedMobile('');
    nameCheckSeqRef.current += 1;
    setNameAdvisoryStatus('idle');
    setNameAdvisoryMessage('');
    setLastCheckedNameSignature('');
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
              <p className="text-[11.5px] text-slate-600 leading-relaxed text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                Please retain your Registration ID (<code>{registeredId}</code>). You can use this ID immediately in the Abstract Submission Portal while your payment (currently <strong>Pending Verification</strong>) is reviewed by the Organising Secretary. Your official <strong>Registration Confirmation (PDF)</strong> will be sent to your registered email address once payment verification and approval are completed.
              </p>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {submittedRecord && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSubmissionReceiptPDF(submittedRecord)}
                    className="w-full h-[46px] px-5 bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#12B8D6] hover:opacity-95 text-white font-bold text-[14px] rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Registration Receipt</span>
                  </button>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmationModal(false);
                      setLookupRegId(registeredId);
                      setActiveTab('status');
                    }}
                    className="w-full sm:flex-1 h-[42px] px-5 bg-[#EDE9FD] hover:bg-[#E2DCFB] text-[#5B21B6] font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 border border-[#D8D2F8] transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Check Registration Status</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConfirmationModal(false)}
                    className="w-full sm:w-auto h-[42px] px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-[94%] sm:w-[95%] max-w-[1240px] mx-auto relative z-10 space-y-4 sm:space-y-5">
        {/* =====================================================================
            PAGE HEADER (Centered heading matching approved conference design)
           ===================================================================== */}
        <div className="space-y-4 pb-1">
          <div className="text-center space-y-2.5 max-w-3xl mx-auto">
            {/* Eyebrow Pill Badge */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="hidden sm:block w-12 md:w-20 h-[1.5px] bg-[#7554D9]/40" />
              <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9] text-white shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase">
                  DELEGATE REGISTRATION &amp; PAYMENT VERIFICATION
                </span>
              </div>
              <div className="hidden sm:block w-12 md:w-20 h-[1.5px] bg-[#22C5D9]/50" />
            </div>

            {/* Main Heading */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-black text-[#082746] font-heading tracking-tight leading-[1.18]">
              Registration Portal
            </h1>

            {/* Short Centered Purple-to-Cyan Gradient Underline */}
            <div
              aria-hidden="true"
              className="mx-auto w-24 sm:w-28 h-[3.5px] rounded-full bg-gradient-to-r from-[#7554D9] via-[#8B50E8] to-[#22C5D9]"
            />

            {/* Centered Compact Description */}
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl mx-auto pt-0.5">
              Register for the conference and complete your payment verification in a single, simple form.
            </p>
          </div>

          {/* Centered Switcher Controls (New Registration / Registration Status) */}
          <div className="flex justify-center pt-1">
            <div className="inline-flex p-1 bg-white/90 border border-[#D8D2F8] rounded-2xl shadow-xs backdrop-blur-sm shrink-0">
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
                        <div className="font-mono font-bold text-[20px] text-[#713CE0] flex flex-wrap items-center gap-2">
                          <span>{lookupRecord.registrationId}</span>
                          <span className="text-[11px] font-sans font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            Active · Eligible for Abstract Submission
                          </span>
                        </div>
                      ) : (
                        <div className="text-amber-800 text-[13px] font-medium pt-0.5">
                          Application Ref: {lookupRecord.id}
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

                  {/* Official Registration Confirmation PDF Delivery Status (Email Attachment Only) */}
                  {isLookupConfirmationEligible ? (
                    <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-[12.5px] text-emerald-900">
                        <strong className="block font-bold">Registration Verified &amp; Confirmed</strong>
                        <span>
                          Your official <strong>Registration Confirmation (PDF)</strong> is issued exclusively via email and has been sent to your registered email address (<strong>{lookupRecord.email}</strong>).
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-[12px] text-slate-600 flex items-start gap-2">
                        <Info className="w-4 h-4 text-[#713CE0] shrink-0 mt-0.5" />
                        <span>
                          Once your payment is verified and your registration is approved by the Organising Secretary, your official <strong>Registration Confirmation (PDF)</strong> will be sent to your registered email address. Meanwhile, you may download your initial Registration Receipt below.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadSubmissionReceiptPDF(lookupRecord)}
                        className="px-4 py-2 bg-[#EDE9FD] hover:bg-[#E2DCFB] text-[#5B21B6] border border-[#D8D2F8] font-bold text-[12px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Registration Receipt</span>
                      </button>
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
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Correct UTR / Transaction Reference"
                            value={newTransRef}
                            onChange={(e) => {
                              setNewTransRef(e.target.value);
                              setResubmitError(null);
                              setResubmitSuccess(false);
                            }}
                            onBlur={() => {
                              if (
                                newTransRef.trim() &&
                                (normalizeTransactionReference(newTransRef) !== resubmitLastCheckedUtr ||
                                  resubmitUtrStatus === 'idle' ||
                                  resubmitUtrStatus === 'error')
                              ) {
                                void runResubmitUtrCheck(newTransRef, lookupRecord.id);
                              }
                            }}
                            className={`w-full h-[38px] text-[13px] pl-3 pr-9 bg-white border rounded-lg outline-none font-mono ${
                              resubmitUtrStatus === 'duplicate' || resubmitError
                                ? 'border-red-400 bg-red-50/30'
                                : resubmitUtrStatus === 'available'
                                ? 'border-emerald-400'
                                : 'border-amber-300'
                            }`}
                          />
                          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                            {resubmitUtrStatus === 'checking' && (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                            )}
                            {resubmitUtrStatus === 'available' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            {resubmitUtrStatus === 'duplicate' && (
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleResubmitCorrection}
                          disabled={
                            resubmitting ||
                            !newTransRef.trim() ||
                            resubmitUtrStatus === 'checking' ||
                            resubmitUtrStatus === 'duplicate'
                          }
                          className="px-4 h-[38px] bg-amber-800 text-white text-[12px] font-bold rounded-lg hover:bg-amber-900 disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {resubmitting ? 'Updating...' : 'Resubmit Reference'}
                        </button>
                      </div>
                      <div aria-live="polite">
                        {resubmitUtrStatus === 'checking' && (
                          <div className="text-[11.5px] text-amber-800 font-medium flex items-center gap-1.5 pt-0.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                            <span>{UTR_CHECKING_MESSAGE}</span>
                          </div>
                        )}
                        {resubmitUtrStatus === 'available' && !resubmitError && (
                          <div className="text-[11.5px] text-emerald-700 font-semibold flex items-center gap-1.5 pt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{UTR_AVAILABLE_MESSAGE}</span>
                          </div>
                        )}
                        {(resubmitUtrStatus === 'duplicate' || resubmitError) && (
                          <div className="text-[11.5px] text-red-600 font-semibold flex items-start gap-1.5 pt-0.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                            <span>{resubmitError || UTR_DUPLICATE_MESSAGE}</span>
                          </div>
                        )}
                        {resubmitUtrStatus === 'error' && !resubmitError && (
                          <div className="text-[11.5px] text-amber-800 font-medium flex items-start gap-1.5 pt-0.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span>{resubmitUtrMessage}</span>
                          </div>
                        )}
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              {submittedRecord && (
                <button
                  type="button"
                  onClick={() => handleDownloadSubmissionReceiptPDF(submittedRecord)}
                  className="w-full sm:w-auto h-[44px] px-6 bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#12B8D6] hover:opacity-95 text-white font-bold text-[13.5px] rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Registration Receipt</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setLookupRegId(registeredId);
                  setActiveTab('status');
                }}
                className="w-full sm:w-auto h-[44px] px-5 bg-[#EDE9FD] hover:bg-[#E2DCFB] text-[#5B21B6] font-bold text-[13.5px] rounded-xl flex items-center justify-center gap-2 border border-[#D8D2F8] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Track Verification Status</span>
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
                REGISTRATION FEES & DEADLINE REFERENCE PANEL
               ================================================================= */}
            <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#E8F8FC] border-b border-[#E3DEF9] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#101B4B] font-heading">
                    Official Registration Fees &amp; Deadline
                  </h2>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/90 border border-[#C9BDF9] text-xs font-bold text-[#101B4B] shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-[#713CE0] shrink-0" />
                  <span>Last Date for Registration:</span>
                  <span className="text-[#713CE0] font-extrabold">{REGISTRATION_DEADLINE}</span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {REGISTRATION_FEE_SCHEDULE.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border px-3.5 py-2.5 flex flex-col justify-between ${
                        item.tier === 'premium'
                          ? 'bg-[#F2FBFC] border-[#B6EBF2]'
                          : 'bg-[#FAF8FE] border-[#DDD6FE]'
                      }`}
                    >
                      <span className="text-[12px] font-semibold text-[#26345B] leading-snug">
                        {item.category}
                      </span>
                      {item.secondaryFormattedFee ? (
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 leading-tight">
                          <span className="text-[15px] sm:text-base font-extrabold font-heading tabular-nums text-[#087E8B]">
                            {item.formattedFee}
                          </span>
                          <span className="text-xs font-bold text-[#64748B]">/</span>
                          <span className="text-[15px] sm:text-base font-extrabold font-heading tabular-nums text-[#087E8B]">
                            {item.secondaryFormattedFee}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`text-lg font-extrabold font-heading tabular-nums mt-1 ${
                            item.tier === 'premium' ? 'text-[#087E8B]' : 'text-[#713CE0]'
                          }`}
                        >
                          {item.formattedFee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
                  {/* Full Name (with Non-Blocking Similar Name Advisory Check) */}
                  <div>
                    <label
                      htmlFor="registration-fullname-input"
                      className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="registration-fullname-input"
                        type="text"
                        placeholder="Dr. / Prof. / Full Name"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (validationErrors.fullName) {
                            setValidationErrors((prev) => ({ ...prev, fullName: '' }));
                          }
                        }}
                        onBlur={() => {
                          if (normalizePersonName(fullName).length >= 3) {
                            void runNameAdvisoryCheck(fullName, effectiveInstitution);
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-3.5 pr-9 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                          validationErrors.fullName
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-500/20 focus:border-red-500'
                            : nameAdvisoryStatus === 'same_name_and_institution' ||
                              nameAdvisoryStatus === 'similar_name'
                            ? 'border-amber-400 bg-amber-50/20 focus:ring-amber-500/20 focus:border-amber-500'
                            : 'border-[#D8D2F8] focus:ring-[#713CE0]/20 focus:border-[#713CE0]'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {nameAdvisoryStatus === 'checking' && (
                          <RefreshCw className="w-4 h-4 text-[#713CE0] animate-spin" />
                        )}
                        {(nameAdvisoryStatus === 'similar_name' ||
                          nameAdvisoryStatus === 'same_name_and_institution') &&
                          !validationErrors.fullName && (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          )}
                      </div>
                    </div>
                    <div aria-live="polite" className="min-h-[16px] mt-1">
                      {validationErrors.fullName ? (
                        <span className="text-[11px] text-red-600 font-medium block">
                          {validationErrors.fullName}
                        </span>
                      ) : nameAdvisoryStatus === 'same_name_and_institution' ? (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 font-medium flex items-start gap-1.5 leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{nameAdvisoryMessage || SAME_NAME_AND_INSTITUTION_WARNING_MESSAGE}</span>
                        </div>
                      ) : nameAdvisoryStatus === 'similar_name' ? (
                        <div className="p-2 rounded-lg bg-amber-50/90 border border-amber-200 text-[11px] text-amber-800 font-medium flex items-start gap-1.5 leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{nameAdvisoryMessage || SIMILAR_NAME_WARNING_MESSAGE}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Email Address (with Real-Time Duplicate Check) */}
                  <div>
                    <label
                      htmlFor="registration-email-input"
                      className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5"
                    >
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="registration-email-input"
                        type="email"
                        placeholder="delegate@institution.edu"
                        value={email}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setEmail(nextVal);
                          if (validationErrors.email) {
                            setValidationErrors((prev) => ({ ...prev, email: '' }));
                          }
                          if (
                            normalizeEmail(nextVal) !== lastCheckedNormalizedEmail &&
                            emailCheckStatus !== 'idle'
                          ) {
                            setEmailCheckStatus('idle');
                            setEmailCheckMessage('');
                          }
                        }}
                        onBlur={() => {
                          const trimmed = email.trim();
                          if (
                            trimmed &&
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) &&
                            (normalizeEmail(trimmed) !== lastCheckedNormalizedEmail ||
                              emailCheckStatus === 'idle' ||
                              emailCheckStatus === 'error')
                          ) {
                            void runEmailAvailabilityCheck(trimmed);
                          }
                        }}
                        aria-invalid={emailCheckStatus === 'duplicate' || !!validationErrors.email}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-9 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                          emailCheckStatus === 'duplicate' || validationErrors.email
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-500/20 focus:border-red-500'
                            : emailCheckStatus === 'available'
                            ? 'border-emerald-400 bg-emerald-50/15 focus:ring-emerald-500/20 focus:border-emerald-500'
                            : 'border-[#D8D2F8] focus:ring-[#713CE0]/20 focus:border-[#713CE0]'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {emailCheckStatus === 'checking' && (
                          <RefreshCw
                            aria-label="Checking email address"
                            className="w-4 h-4 text-[#713CE0] animate-spin"
                          />
                        )}
                        {emailCheckStatus === 'available' && !validationErrors.email && (
                          <CheckCircle2
                            aria-label="Email address is available"
                            className="w-4 h-4 text-emerald-600"
                          />
                        )}
                        {(emailCheckStatus === 'duplicate' || validationErrors.email) && (
                          <AlertCircle
                            aria-label="Duplicate or invalid email address"
                            className="w-4 h-4 text-red-600"
                          />
                        )}
                      </div>
                    </div>
                    <div aria-live="polite" className="min-h-[16px] mt-1">
                      {emailCheckStatus === 'checking' ? (
                        <span className="text-[11px] text-[#713CE0] font-medium flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                          <span>{CHECKING_EMAIL_MESSAGE}</span>
                        </span>
                      ) : emailCheckStatus === 'duplicate' || validationErrors.email ? (
                        <span className="text-[11px] text-red-600 font-semibold flex items-start gap-1 leading-snug">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>{validationErrors.email || DUPLICATE_EMAIL_MESSAGE}</span>
                        </span>
                      ) : emailCheckStatus === 'available' ? (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{EMAIL_AVAILABLE_MESSAGE}</span>
                        </span>
                      ) : emailCheckStatus === 'error' && emailCheckMessage ? (
                        <span className="text-[11px] text-amber-700 font-medium flex items-start gap-1 leading-snug">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{emailCheckMessage}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Mobile Number (with Country-Aware International Normalization & Real-Time Duplicate Check) */}
                  <div>
                    <label
                      htmlFor="registration-mobile-input"
                      className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5"
                    >
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="registration-mobile-input"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={mobile}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setMobile(nextVal);
                          if (validationErrors.mobile) {
                            setValidationErrors((prev) => ({ ...prev, mobile: '' }));
                          }
                          if (
                            normalizeMobileInternational(nextVal, country) !==
                              lastCheckedNormalizedMobile &&
                            mobileCheckStatus !== 'idle'
                          ) {
                            setMobileCheckStatus('idle');
                            setMobileCheckMessage('');
                          }
                        }}
                        onBlur={() => {
                          const trimmed = mobile.trim();
                          if (
                            trimmed.replace(/\D/g, '').length >= 8 &&
                            (normalizeMobileInternational(trimmed, country) !==
                              lastCheckedNormalizedMobile ||
                              mobileCheckStatus === 'idle' ||
                              mobileCheckStatus === 'error')
                          ) {
                            void runMobileAvailabilityCheck(trimmed, country);
                          }
                        }}
                        aria-invalid={mobileCheckStatus === 'duplicate' || !!validationErrors.mobile}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-9 text-[14px] rounded-xl border bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                          mobileCheckStatus === 'duplicate' || validationErrors.mobile
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-500/20 focus:border-red-500'
                            : mobileCheckStatus === 'available'
                            ? 'border-emerald-400 bg-emerald-50/15 focus:ring-emerald-500/20 focus:border-emerald-500'
                            : 'border-[#D8D2F8] focus:ring-[#713CE0]/20 focus:border-[#713CE0]'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {mobileCheckStatus === 'checking' && (
                          <RefreshCw
                            aria-label="Checking mobile number"
                            className="w-4 h-4 text-[#713CE0] animate-spin"
                          />
                        )}
                        {mobileCheckStatus === 'available' && !validationErrors.mobile && (
                          <CheckCircle2
                            aria-label="Mobile number is available"
                            className="w-4 h-4 text-emerald-600"
                          />
                        )}
                        {(mobileCheckStatus === 'duplicate' || validationErrors.mobile) && (
                          <AlertCircle
                            aria-label="Duplicate or invalid mobile number"
                            className="w-4 h-4 text-red-600"
                          />
                        )}
                      </div>
                    </div>
                    <div aria-live="polite" className="min-h-[16px] mt-1">
                      {mobileCheckStatus === 'checking' ? (
                        <span className="text-[11px] text-[#713CE0] font-medium flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                          <span>{CHECKING_MOBILE_MESSAGE}</span>
                        </span>
                      ) : mobileCheckStatus === 'duplicate' || validationErrors.mobile ? (
                        <span className="text-[11px] text-red-600 font-semibold flex items-start gap-1 leading-snug">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>{validationErrors.mobile || DUPLICATE_MOBILE_MESSAGE}</span>
                        </span>
                      ) : mobileCheckStatus === 'available' ? (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{MOBILE_AVAILABLE_MESSAGE}</span>
                        </span>
                      ) : mobileCheckStatus === 'error' && mobileCheckMessage ? (
                        <span className="text-[11px] text-amber-700 font-medium flex items-start gap-1 leading-snug">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{mobileCheckMessage}</span>
                        </span>
                      ) : null}
                    </div>
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

                  {/* Institution Category (Mandatory: Internal vs External) */}
                  <div className="md:col-span-2">
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Institution Category <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          value: 'internal' as InstitutionCategoryValue,
                          label: 'Internal – SRM College of Pharmacy, SRMIST, Kattankulathur',
                        },
                        {
                          value: 'external' as InstitutionCategoryValue,
                          label: 'External – Other Institutions / Organizations',
                        },
                      ].map((opt) => {
                        const isSelected = institutionCategory === opt.value;
                        return (
                          <div
                            key={opt.value}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleInstitutionCategorySelect(opt.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleInstitutionCategorySelect(opt.value);
                              }
                            }}
                            className={`min-h-[42px] px-3.5 py-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-2 border-[#713CE0] bg-[#F1EDFD] text-[#101B4B] shadow-2xs'
                                : validationErrors.institutionCategory
                                ? 'border-red-400 bg-red-50/20 hover:border-red-500'
                                : 'border-[#D8D2F8] bg-white/80 hover:border-[#C5B9F7] hover:bg-white'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#713CE0]" />}
                            </div>
                            <span className="text-[13px] sm:text-[13.5px] font-medium text-[#101B4B] leading-snug">
                              {opt.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {validationErrors.institutionCategory && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.institutionCategory}
                      </span>
                    )}
                  </div>

                  {/* Institution / Organization (Full Width on desktop) */}
                  <div className="md:col-span-2">
                    <label className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5">
                      Institution / Organization <span className="text-red-500">*</span>
                      {institutionCategory === 'internal' && (
                        <span className="ml-2 text-[11px] font-normal text-[#713CE0]">
                          (Auto-populated &amp; locked for Internal participants)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0]">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        readOnly={institutionCategory === 'internal'}
                        placeholder={
                          institutionCategory === 'external'
                            ? 'Enter your college, university, hospital, company or organization name'
                            : 'Select Institution Category above (or enter your institution name)'
                        }
                        value={institution}
                        onChange={(e) => {
                          if (institutionCategory === 'internal') return;
                          setInstitution(e.target.value);
                          if (validationErrors.institution) {
                            setValidationErrors((prev) => ({ ...prev, institution: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] pl-9.5 pr-3.5 text-[14px] rounded-xl border transition-colors focus:outline-none ${
                          institutionCategory === 'internal'
                            ? 'bg-[#F5F2FF] border-[#C9BDF9] text-[#101B4B] font-medium cursor-not-allowed'
                            : validationErrors.institution
                            ? 'border-red-400 bg-red-50/20 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0]'
                            : 'border-[#D8D2F8] bg-white/95 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0]'
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
                      label: 'Student / Research Scholar',
                      feeLabel: '₹2,000',
                      icon: GraduationCap,
                    },
                    {
                      id: 'Faculty' as RegistrationCategory,
                      label: 'Faculty',
                      feeLabel: '₹2,000',
                      icon: User,
                    },
                    {
                      id: 'Industry Professional' as RegistrationCategory,
                      label: 'Industrial Participant',
                      feeLabel: '₹3,000',
                      icon: Briefcase,
                    },
                    {
                      id: 'Researcher' as RegistrationCategory,
                      label: 'Researcher',
                      feeLabel: '₹2,000',
                      icon: FlaskConical,
                    },
                    {
                      id: 'Others' as RegistrationCategory,
                      label: 'Others',
                      feeLabel: 'Applicable Fee',
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
                        className={`min-h-[106px] sm:min-h-[110px] rounded-xl px-2.5 py-2.5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-between gap-1 ${
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

                        {/* Category Label & Applicable Fee */}
                        <div className="space-y-0.5 max-w-full">
                          <span className="text-[12.5px] sm:text-[13px] font-semibold text-[#101B4B] leading-tight block">
                            {item.label}
                          </span>
                          <span className="text-[11px] font-bold text-[#713CE0] tabular-nums block">
                            {item.feeLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Applicable Registration Fee Readout for Selected Category */}
                <div className="p-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#F5F2FF] to-[#EEF8FC] border border-[#DDD6FE] flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <div className="flex items-center gap-2 text-[#101B4B]">
                    <Info className="w-4 h-4 text-[#713CE0] shrink-0" />
                    <span>
                      <strong>{applicableFee.label}:</strong>{' '}
                      <span className="text-[#45536B]">{applicableFee.note}</span>
                    </span>
                  </div>
                  <div className="font-mono font-extrabold text-[#713CE0] text-sm sm:text-base tabular-nums">
                    Applicable Fee: {applicableFee.formatted}
                  </div>
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
                            onClick={() => handleParticipationModeSelect(mode.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleParticipationModeSelect(mode.value);
                              }
                            }}
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
                SECTION 3.5 – REGISTRATION FEE PAYMENT (Official CUB QR Code)
               ================================================================= */}
            <div className="bg-white/85 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden">
              {/* Pale Lavender Header Strip with Icon Badge */}
              <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                  Registration Fee Payment
                </h2>
              </div>

              <div className="p-4 sm:p-5 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Authentic Official City Union Bank Payment QR Code */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="w-full max-w-[340px] bg-white rounded-2xl border border-[#DDD6FE] shadow-[0_6px_24px_rgba(16,27,75,0.08)] p-2.5 sm:p-3 flex flex-col items-center">
                      <img
                        src={IMAGES.paymentQrImage}
                        alt="SRM College of Pharmacy City Union Bank Official UPI Payment QR Code"
                        className="w-full h-auto max-h-[430px] object-contain rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Right: Payment Details, Copyable UPI ID & Clear Instructions */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Instruction Banner */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-[#F5F2FF] to-[#EEF8FC] border border-[#DDD6FE] flex items-start gap-3">
                      <Info className="w-5 h-5 text-[#713CE0] shrink-0 mt-0.5" />
                      <p className="text-[13px] sm:text-[14px] text-[#1E293B] leading-relaxed">
                        Scan the official City Union Bank QR code or pay using the UPI ID below. After completing payment, enter your Transaction / UTR Reference Number and upload your payment proof screenshot or PDF in the <strong className="text-[#101B4B]">Payment Details</strong> section below.
                      </p>
                    </div>

                    {/* Structured Merchant & Bank Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#FAF8FE] border border-[#E3DEF9]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">
                          Institution
                        </span>
                        <span className="text-[14px] font-bold text-[#101B4B] mt-0.5 block">
                          SRM College of Pharmacy
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF8FE] border border-[#E3DEF9]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">
                          Bank
                        </span>
                        <span className="text-[14px] font-bold text-[#101B4B] mt-0.5 flex items-center gap-1.5">
                          <Landmark className="w-4 h-4 text-[#713CE0] shrink-0" />
                          <span>City Union Bank (CUB)</span>
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF8FE] border border-[#E3DEF9]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">
                          Branch
                        </span>
                        <span className="text-[14px] font-bold text-[#101B4B] mt-0.5 block">
                          117 – Tambaram
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF8FE] border border-[#E3DEF9]">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">
                          Merchant ID (MID)
                        </span>
                        <span className="font-mono text-[14px] font-bold text-[#101B4B] mt-0.5 block select-all">
                          E01020101103980
                        </span>
                      </div>

                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#F1EDFD] border border-[#C5B9F7] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] uppercase font-bold tracking-wider text-[#713CE0] block">
                            UPI ID
                          </span>
                          <span className="font-mono text-[14px] font-extrabold text-[#101B4B] mt-0.5 block truncate select-all">
                            EZE0362244@CUB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={copyUpiId}
                          title="Copy UPI ID"
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-[#C5B9F7] text-[#713CE0] text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs transition-colors"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Supported Methods & Post-Registration Note */}
                    <div className="p-3.5 rounded-xl bg-white border border-[#E3DEF9] space-y-2 text-[12.5px] sm:text-[13px] text-[#26345B]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <strong className="text-[#101B4B]">Accepted Payment Methods:</strong>
                        <span>UPI, Google Pay, PhonePe and Paytm</span>
                      </div>
                      <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-[12px]">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Your Registration ID (e.g. <strong className="font-mono">AICONDD001</strong>) is generated immediately after submitting this form and can be used right away for Abstract Submission while payment verification proceeds independently.
                        </span>
                      </div>
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
                        placeholder={applicableFee.amount ? `e.g. ${applicableFee.amount}` : 'e.g. 2000 or 3000'}
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
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Selected category fee: <strong className="text-[#713CE0]">{applicableFee.formatted}</strong>
                    </span>
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

                  {/* Transaction / Reference Number (with Real-Time Duplicate UTR Validation) */}
                  <div>
                    <label
                      htmlFor="registration-utr-input"
                      className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5"
                    >
                      Transaction / Reference No. <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#713CE0] font-mono text-[14px]">
                        #
                      </div>
                      <input
                        id="registration-utr-input"
                        type="text"
                        placeholder="e.g. UPI/NEFT/IMPS ID"
                        value={transactionRef}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setTransactionRef(nextVal);
                          if (validationErrors.transactionRef) {
                            setValidationErrors((prev) => ({ ...prev, transactionRef: '' }));
                          }
                          if (
                            normalizeTransactionReference(nextVal) !== lastCheckedNormalizedUtr &&
                            utrCheckStatus !== 'idle'
                          ) {
                            setUtrCheckStatus('idle');
                            setUtrCheckMessage('');
                          }
                        }}
                        onBlur={() => {
                          const trimmed = transactionRef.trim();
                          if (
                            trimmed &&
                            (normalizeTransactionReference(trimmed) !== lastCheckedNormalizedUtr ||
                              utrCheckStatus === 'idle' ||
                              utrCheckStatus === 'error')
                          ) {
                            void runUtrAvailabilityCheck(trimmed);
                          }
                        }}
                        aria-invalid={
                          utrCheckStatus === 'duplicate' || !!validationErrors.transactionRef
                        }
                        className={`w-full h-[38px] sm:h-[40px] pl-8 pr-9 text-[14px] rounded-xl border bg-white/95 text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                          utrCheckStatus === 'duplicate' || validationErrors.transactionRef
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-500/20 focus:border-red-500'
                            : utrCheckStatus === 'available'
                            ? 'border-emerald-400 bg-emerald-50/15 focus:ring-emerald-500/20 focus:border-emerald-500'
                            : 'border-[#D8D2F8] focus:ring-[#713CE0]/20 focus:border-[#713CE0]'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {utrCheckStatus === 'checking' && (
                          <RefreshCw
                            aria-label="Checking payment transaction ID"
                            className="w-4 h-4 text-[#713CE0] animate-spin"
                          />
                        )}
                        {utrCheckStatus === 'available' && !validationErrors.transactionRef && (
                          <CheckCircle2
                            aria-label="Payment transaction ID is available"
                            className="w-4 h-4 text-emerald-600"
                          />
                        )}
                        {(utrCheckStatus === 'duplicate' || validationErrors.transactionRef) && (
                          <AlertCircle
                            aria-label="Duplicate or invalid payment transaction ID"
                            className="w-4 h-4 text-red-600"
                          />
                        )}
                      </div>
                    </div>

                    <div aria-live="polite" className="min-h-[18px] mt-1">
                      {utrCheckStatus === 'checking' ? (
                        <span className="text-[11px] text-[#713CE0] font-medium flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                          <span>{UTR_CHECKING_MESSAGE}</span>
                        </span>
                      ) : utrCheckStatus === 'duplicate' || validationErrors.transactionRef ? (
                        <span className="text-[11px] text-red-600 font-semibold flex items-start gap-1 leading-snug">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>{validationErrors.transactionRef || UTR_DUPLICATE_MESSAGE}</span>
                        </span>
                      ) : utrCheckStatus === 'available' ? (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{UTR_AVAILABLE_MESSAGE}</span>
                        </span>
                      ) : utrCheckStatus === 'error' && utrCheckMessage ? (
                        <span className="text-[11px] text-amber-700 font-medium flex items-start gap-1 leading-snug">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{utrCheckMessage}</span>
                        </span>
                      ) : null}
                    </div>
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
                            <span>Pay the applicable registration fee via the official CUB QR code (UPI ID: <strong className="font-mono">EZE0362244@CUB</strong>) or conference bank account.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-[#713CE0] font-bold">•</span>
                            <span>The uploaded payment proof should clearly display the UTR / transaction reference.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-[#713CE0] font-bold">•</span>
                            <span>Your Registration ID is generated immediately upon submission; payment verification proceeds independently.</span>
                          </li>
                        </ul>
                      </div>

                      {/* Official Merchant / Bank Account Details Strip */}
                      <div className="pt-2 border-t border-[#E3DEF9] text-[11px] text-slate-600 space-y-0.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span><strong className="text-slate-800">UPI:</strong> EZE0362244@CUB</span>
                          <span><strong className="text-slate-800">MID:</strong> E01020101103980</span>
                        </div>
                        <div className="truncate">
                          <strong className="text-slate-800">Bank:</strong> City Union Bank (CUB) · 117 – Tambaram · SRM College of Pharmacy
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
                SECTION 5 – ADDITIONAL INFORMATION (Conditional Food Preference for Offline Participants Only)
               ================================================================= */}
            {isOfflineParticipation && (
              <div className="bg-white/80 backdrop-blur-md border border-[#D9D3F9] rounded-2xl shadow-[0_4px_20px_rgba(113,60,224,0.06)] overflow-hidden animate-in fade-in duration-150">
                {/* Pale Lavender Header Strip with Icon Badge */}
                <div className="px-5 py-3 bg-gradient-to-r from-[#EDE9FD] to-[#F3EFFE] border-b border-[#E3DEF9] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#713CE0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#101B4B] font-heading">
                    Additional Information
                  </h2>
                </div>

                {/* Form Content Area: Mandatory Food Preference for Offline Participants */}
                <div className="p-4 sm:p-5 lg:p-6">
                  <div>
                    <label
                      htmlFor="food-preference-select"
                      className="text-[13px] sm:text-[14px] font-semibold text-[#1A1D4E] block mb-1.5"
                    >
                      Food Preference <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="food-preference-select"
                        required
                        value={dietaryPreference}
                        onChange={(e) => {
                          setDietaryPreference(e.target.value);
                          if (validationErrors.dietaryPreference) {
                            setValidationErrors((prev) => ({ ...prev, dietaryPreference: '' }));
                          }
                        }}
                        className={`w-full h-[38px] sm:h-[40px] px-3.5 text-[14px] rounded-xl border bg-white/95 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#713CE0]/20 focus:border-[#713CE0] cursor-pointer appearance-none ${
                          validationErrors.dietaryPreference
                            ? 'border-red-400 bg-red-50/20'
                            : 'border-[#D8D2F8]'
                        }`}
                      >
                        <option value="">Select Food Preference</option>
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                    {validationErrors.dietaryPreference && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {validationErrors.dietaryPreference}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                REGISTER NOW BUTTON & LIVE UNIQUENESS VERIFICATION SUMMARY
               ================================================================= */}
            <div className="flex flex-col items-center justify-center pt-2 pb-4 space-y-2.5">
              {allStrictDetailsVerified && (
                <div
                  role="status"
                  className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] font-semibold flex items-center gap-2 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{DETAILS_VERIFIED_MESSAGE}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isCheckingAnyDuplicate || hasAnyStrictDuplicate}
                className="w-full sm:w-auto min-w-[260px] sm:min-w-[300px] h-[48px] px-8 rounded-full bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#12B8D6] hover:opacity-95 text-white font-bold text-[15px] sm:text-[16px] shadow-[0_8px_25px_rgba(109,60,226,0.3)] hover:shadow-[0_10px_28px_rgba(109,60,226,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Submission...</span>
                  </>
                ) : isCheckingAnyDuplicate ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Participant Details...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Register Now</span>
                  </>
                )}
              </button>

              {hasAnyStrictDuplicate && (
                <p className="text-[12px] text-red-600 font-semibold text-center max-w-lg flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {emailCheckStatus === 'duplicate'
                      ? DUPLICATE_EMAIL_MESSAGE
                      : mobileCheckStatus === 'duplicate'
                      ? DUPLICATE_MOBILE_MESSAGE
                      : DUPLICATE_UTR_MESSAGE}
                  </span>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

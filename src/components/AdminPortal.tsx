import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updatePassword,
  User,
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  ArrowLeft,
  LogOut,
  X,
  AlertTriangle,
  Lock,
  LayoutDashboard,
  Users,
  FileText,
  FileCheck2,
  UserCheck,
  Settings,
  Trash2,
  FileSpreadsheet,
  Link as LinkIcon,
  Check,
  ExternalLink,
  RefreshCw,
  Mail,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
  Printer,
  Mic,
  Presentation,
  Monitor,
  RotateCcw,
  Building2,
  Database,
  Utensils,
} from 'lucide-react';
import { AdminHospitalityManager } from './AdminHospitalityManager';
import { AdminBackupManager } from './AdminBackupManager';
import {
  AUTHORIZED_ADMIN_EMAILS,
  isAuthorizedAdminUser,
} from '../lib/backupService';
import {
  RegistrationRecord,
  AbstractRecord,
  verifyPaymentAndAllocateRegId,
  deleteAbstractRecord,
  deleteRegistrationRecord,
  exportRegistrationsToExcel,
  exportAbstractsToExcel,
  exportMasterParticipantsToExcel,
  generateRegistrationSubmissionReceiptPDF,
  generateRegistrationReceiptPDF,
  generateSubmissionReceiptPDF,
  generateAcceptanceLetterPDF,
  createRegistrationSubmissionReceiptPreviewUrl,
  createRegistrationConfirmationPreviewUrl,
  createAbstractSubmissionAckPreviewUrl,
  createAbstractAcceptanceLetterPreviewUrl,
} from '../lib/managementService';
import {
  exportAllAbstractsToWord,
  ABSTRACT_WORD_FILENAME,
} from '../lib/abstractWordExport';
import {
  FoodPreferenceFilterValue,
  InstitutionCategoryValue,
  InstitutionFilterValue,
  ParticipationModeFilterValue,
  PresentationDashboardFilter,
  classifyParticipationMode,
  computeFoodPreferenceStats,
  computePresentationDashboardMetrics,
  computeRegistrationInstitutionStats,
  formatFoodPreferenceDisplay,
  formatInstitutionCategoryLabel,
  formatRegistrationPresentationPlan,
  getLinkedRegistrationForAbstractRecord,
  matchesFoodPreferenceFilter,
  normalizeInstitutionCategory,
  normalizeRegKey,
} from '../lib/presentationDashboardStats';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';
import {
  EMAIL_EVENT_LABELS,
  type EmailEventType,
  type EmailLogRecord,
  getAbstractAcceptedEventId,
  getAbstractSubmittedEventId,
  getRegistrationConfirmedEventId,
  getRegistrationReceivedEventId,
  retryEmailNotification,
  triggerAbstractAcceptedEmail,
  triggerRegistrationConfirmedEmail,
} from '../lib/emailService';

// Authorized administrator emails
const ADMIN_EMAILS = AUTHORIZED_ADMIN_EMAILS;

export const AdminPortal: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // Navigation tabs in Org. Secretary Dashboard
  type DashboardTab =
    | 'overview'
    | 'registrations'
    | 'abstracts'
    | 'search'
    | 'reports'
    | 'hospitality'
    | 'backup'
    | 'settings';

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form state
  const [usernameOrEmail, setUsernameOrEmail] = useState('org.secy.cp');
  const [password, setPassword] = useState('password123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Live collections from Firestore
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [abstracts, setAbstracts] = useState<AbstractRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogRecord[]>([]);
  const [retryingEmailEventId, setRetryingEmailEventId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Global Record Type Filter ('all' | 'live' | 'test')
  const [recordTypeFilter, setRecordTypeFilter] = useState<'all' | 'live' | 'test'>('all');

  // Registration Filter & Search states
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');
  const [regCategoryFilter, setRegCategoryFilter] = useState<string>('all');
  const [regInstitutionFilter, setRegInstitutionFilter] = useState<InstitutionFilterValue>('all');
  const [regParticipationModeFilter, setRegParticipationModeFilter] =
    useState<ParticipationModeFilterValue>('all');
  const [regFoodPreferenceFilter, setRegFoodPreferenceFilter] =
    useState<FoodPreferenceFilterValue>('all');
  const [updatingInstCatId, setUpdatingInstCatId] = useState<string | null>(null);

  // Abstract Filter & Search states
  const [absSearchQuery, setAbsSearchQuery] = useState('');
  const [absStatusFilter, setAbsStatusFilter] = useState<string>('all');
  const [absTrackFilter, setAbsTrackFilter] = useState<string>('all');
  const [absInstitutionFilter, setAbsInstitutionFilter] = useState<InstitutionFilterValue>('all');
  const [presentationDashboardFilter, setPresentationDashboardFilter] =
    useState<PresentationDashboardFilter>('all');
  const [showPendingBreakdown, setShowPendingBreakdown] = useState(false);

  // Unified Participant Search state
  const [unifiedSearchQuery, setUnifiedSearchQuery] = useState('');

  // Modals & Scrutiny
  const [selectedReg, setSelectedReg] = useState<RegistrationRecord | null>(null);
  const [selectedAbs, setSelectedAbs] = useState<AbstractRecord | null>(null);
  const [previewProofReg, setPreviewProofReg] = useState<RegistrationRecord | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [exportingWord, setExportingWord] = useState(false);
  const [wordExportFeedback, setWordExportFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    flaggedIds?: string[];
  } | null>(null);

  // Presentation Format Allocation state
  const [allottedFormatSelection, setAllottedFormatSelection] = useState<string>('');
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [allocationSavedSuccess, setAllocationSavedSuccess] = useState(false);

  // Delete Confirmation Modals
  const [regToDelete, setRegToDelete] = useState<RegistrationRecord | null>(null);
  const [absToDelete, setAbsToDelete] = useState<AbstractRecord | null>(null);
  const [deleteBothLinked, setDeleteBothLinked] = useState(true);

  // Settings / Password update
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // In-app PDF Document Preview modal state (with Blob URL cleanup)
  const [pdfPreview, setPdfPreview] = useState<{
    title: string;
    subtitle: string;
    filename: string;
    url: string;
    onDownload: () => void;
  } | null>(null);

  const openPdfPreview = (config: {
    title: string;
    subtitle: string;
    build: () => { url: string; filename: string };
    onDownload: () => void;
  }) => {
    try {
      const { url, filename } = config.build();
      setPdfPreview((prev) => {
        if (prev?.url) {
          URL.revokeObjectURL(prev.url);
        }
        return {
          title: config.title,
          subtitle: config.subtitle,
          filename,
          url,
          onDownload: config.onDownload,
        };
      });
    } catch (err: any) {
      alert(err?.message || 'Unable to generate PDF preview.');
    }
  };

  const closePdfPreview = () => {
    setPdfPreview((prev) => {
      if (prev?.url) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  };

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) {
        URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview?.url]);

  // Check auth state and verify admin authorization
  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;
      if (!currentUser) {
        setUser(null);
        setIsAdminAuth(false);
        setAuthLoading(false);
        return;
      }

      const authorized = await isAuthorizedAdminUser(currentUser);
      if (!active) return;

      if (authorized) {
        setUser(currentUser);
        setIsAdminAuth(true);
      } else {
        setUser(null);
        setIsAdminAuth(false);
        setLoginError(
          `Access denied for ${currentUser.email || 'this account'}. Only authorised Organising Secretary accounts can access this portal.`
        );
        try {
          await signOut(auth);
        } catch {
          // Ignore sign-out cleanup failure
        }
      }
      setAuthLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Real-time Firestore streaming when authenticated
  useEffect(() => {
    if (!isAdminAuth) return;

    setLoadingData(true);

    // 1. Stream Registrations
    const regUnsub = onSnapshot(
      collection(db, 'registrations'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as RegistrationRecord[];
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRegistrations(list);
        setLoadingData(false);
      },
      (error) => {
        console.error('Error streaming registrations:', error);
        handleFirestoreError(error, OperationType.GET, 'registrations');
        setLoadingData(false);
      }
    );

    // 2. Stream Abstracts
    const absUnsub = onSnapshot(
      collection(db, 'abstractSubmissions'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as AbstractRecord[];
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAbstracts(list);
      },
      (error) => {
        console.error('Error streaming abstracts:', error);
        handleFirestoreError(error, OperationType.GET, 'abstractSubmissions');
      }
    );

    // 3. Stream Automated Email Notification Logs
    const emailUnsub = onSnapshot(
      collection(db, 'emailLogs'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as EmailLogRecord[];
        list.sort(
          (a, b) =>
            new Date(b.lastAttemptedAt || b.createdAt || b.timestamp || 0).getTime() -
            new Date(a.lastAttemptedAt || a.createdAt || a.timestamp || 0).getTime()
        );
        setEmailLogs(list);
      },
      (error) => {
        console.error('Error streaming email logs:', error);
        handleFirestoreError(error, OperationType.GET, 'emailLogs');
      }
    );

    return () => {
      regUnsub();
      absUnsub();
      emailUnsub();
    };
  }, [isAdminAuth]);

  // Handle Org. Secretary Login
  const handleOrgSecretaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    let effectiveEmail = usernameOrEmail.trim();
    if (effectiveEmail.toLowerCase() === 'org.secy.cp') {
      effectiveEmail = 'org.secy.cp@srmist.edu.in';
    } else if (!effectiveEmail.includes('@')) {
      effectiveEmail = `${effectiveEmail}@srmist.edu.in`;
    }

    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, effectiveEmail, password);
      } catch (signInErr: any) {
        // If user not found and logging in as default org.secy.cp, bootstrap account
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential'
        ) {
          if (effectiveEmail === 'org.secy.cp@srmist.edu.in' && password === 'password123') {
            try {
              cred = await createUserWithEmailAndPassword(auth, effectiveEmail, password);
            } catch (createErr: any) {
              throw signInErr;
            }
          } else {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }
      const authorized = await isAuthorizedAdminUser(cred.user);
      if (!authorized) {
        await signOut(auth);
        setLoginError(
          `Access denied for ${cred.user.email || effectiveEmail}. Only authorised Organising Secretary accounts may sign in.`
        );
        return;
      }
      setIsAdminAuth(true);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setLoginError('Invalid password. Please check your credentials and try again.');
      } else if (err.code === 'auth/user-not-found') {
        setLoginError('Org. Secretary account not found. Please check username or email.');
      } else {
        setLoginError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Login alternative
  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const authorized = await isAuthorizedAdminUser(cred.user);
      if (!authorized) {
        await signOut(auth);
        setLoginError(
          `Access denied for ${cred.user.email || 'this Google account'}. Only authorised Organising Secretary accounts may sign in.`
        );
        return;
      }
      setIsAdminAuth(true);
    } catch (err: any) {
      console.error('Google login error:', err);
      setLoginError(err.message || 'Google authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    setIsAdminAuth(false);
  };

  // Payment Verification Handler: Generates AICONDDxxx atomically & dispatches Event 2 email
  const handleVerifyPayment = async (reg: RegistrationRecord) => {
    setProcessingAction(true);
    setActionSuccessMsg(null);
    try {
      const adminIdentity = user?.email || 'org.secy.cp@srmist.edu.in';
      const remarksText = actionRemarks.trim() || 'Payment verified by Org. Secretary.';
      const allocatedId = await verifyPaymentAndAllocateRegId(
        reg.id,
        adminIdentity,
        remarksText
      );

      const nowIso = new Date().toISOString();
      const verifiedRegSnapshot: RegistrationRecord = {
        ...reg,
        registrationId: allocatedId,
        paymentStatus: 'Verified',
        registrationStatus: 'Approved',
        adminRemarks: remarksText,
        verifiedBy: adminIdentity,
        verifiedAt: nowIso,
        updatedAt: nowIso,
      };

      // Non-blocking email dispatch: payment verification remains committed even if email fails
      let emailNote = '';
      try {
        const emailResult = await triggerRegistrationConfirmedEmail(verifiedRegSnapshot);
        if (emailResult.success) {
          emailNote = emailResult.duplicatePrevented
            ? ' Confirmation email already sent previously.'
            : ' Confirmation email with Receipt PDF sent.';
        } else {
          emailNote = ` Confirmation email failed (${emailResult.error || 'upstream error'}) — use Retry in dashboard.`;
        }
      } catch (emailErr: any) {
        console.warn('Non-fatal Event 2 email dispatch error:', emailErr);
        emailNote = ' Confirmation email could not be sent — use Retry in dashboard.';
      }

      setActionSuccessMsg(
        `Payment verified for ${reg.fullName} (Registration ID: ${allocatedId}).${emailNote}`
      );
      setSelectedReg(null);
      setActionRemarks('');
    } catch (err: any) {
      console.error('Failed to verify payment:', err);
      alert(`Payment verification failed: ${err.message || 'Firestore error'}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Payment Rejection Handler
  const handleRejectPayment = async (reg: RegistrationRecord) => {
    setProcessingAction(true);
    try {
      const adminIdentity = user?.email || 'org.secy.cp@srmist.edu.in';
      const timestamp = new Date().toISOString();
      await updateDoc(doc(db, 'registrations', reg.id), {
        paymentStatus: 'Rejected',
        registrationStatus: 'Rejected',
        adminRemarks: actionRemarks.trim() || 'Payment transaction reference unverified.',
        verifiedBy: adminIdentity,
        verifiedAt: timestamp,
        updatedAt: timestamp,
      });

      setSelectedReg(null);
      setActionRemarks('');
      setActionSuccessMsg(`Payment rejected for ${reg.fullName}. Marked as requiring correction.`);
    } catch (err: any) {
      console.error('Failed to reject payment:', err);
      alert('Error updating payment status in Firestore.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Payment Proof Helpers
  const isProofValid = (reg: RegistrationRecord | null): boolean => {
    if (!reg) return false;
    const data = reg.paymentProofData || reg.paymentProofUrl;
    if (!data || typeof data !== 'string') return false;
    if (data.includes('...[secured]')) return false;
    if (data.length < 200 && !data.startsWith('http')) return false;
    return true;
  };

  const handleDownloadProof = (reg: RegistrationRecord) => {
    const data = reg.paymentProofData || reg.paymentProofUrl;
    if (!data) return;
    const isPdf = data.startsWith('data:application/pdf') || (reg.paymentProofName && reg.paymentProofName.toLowerCase().endsWith('.pdf'));
    const ext = isPdf ? 'pdf' : 'png';
    const filename = reg.paymentProofName || `payment-proof-${reg.registrationId || reg.id}.${ext}`;
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenProofNewTab = (reg: RegistrationRecord) => {
    const data = reg.paymentProofData || reg.paymentProofUrl;
    if (!data) return;
    if (data.startsWith('data:')) {
      try {
        const parts = data.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch {
        window.open(data, '_blank');
      }
    } else {
      window.open(data, '_blank');
    }
  };

  // Abstract Presentation Format Allocation (persists without modifying author preference or overall status)
  const handleSavePresentationAllocation = async () => {
    if (!selectedAbs || !allottedFormatSelection) return;
    setSavingAllocation(true);
    try {
      const adminIdentity = user?.email || 'org.secy.cp@srmist.edu.in';
      const timestamp = new Date().toISOString();

      await updateDoc(doc(db, 'abstractSubmissions', selectedAbs.id), {
        allottedPresentationFormat: allottedFormatSelection,
        allottedBy: adminIdentity,
        allottedAt: timestamp,
        updatedAt: timestamp,
      });

      setSelectedAbs((prev) =>
        prev
          ? {
              ...prev,
              allottedPresentationFormat: allottedFormatSelection,
              allottedBy: adminIdentity,
              allottedAt: timestamp,
            }
          : null
      );

      setAllocationSavedSuccess(true);
      setActionSuccessMsg(`Abstract ${selectedAbs.id} presentation format successfully allocated to "${allottedFormatSelection}".`);
    } catch (err: any) {
      console.error('Error saving presentation allocation:', err);
      alert('Failed to save presentation format allocation in Firestore.');
    } finally {
      setSavingAllocation(false);
    }
  };

  // Abstract Review Status Update (triggers Event 4 ONLY when status === 'Accepted')
  const handleUpdateAbstractStatus = async (
    targetStatus: 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected'
  ) => {
    if (!selectedAbs) return;
    setProcessingAction(true);
    try {
      const adminIdentity = user?.email || 'org.secy.cp@srmist.edu.in';
      const timestamp = new Date().toISOString();
      const reviewNote = actionRemarks.trim() || `Status updated to ${targetStatus}`;

      await updateDoc(doc(db, 'abstractSubmissions', selectedAbs.id), {
        status: targetStatus,
        reviewNotes: reviewNote,
        reviewedBy: adminIdentity,
        reviewedAt: timestamp,
        updatedAt: timestamp,
      });

      let emailNote = '';
      if (targetStatus === 'Accepted') {
        const acceptedSnapshot: AbstractRecord = {
          ...selectedAbs,
          status: 'Accepted',
          reviewNotes: reviewNote,
          reviewedBy: adminIdentity,
          reviewedAt: timestamp,
          updatedAt: timestamp,
        };
        try {
          const linkedReg = getLinkedRegistrationForAbstractRecord(acceptedSnapshot, registrations);
          const emailResult = await triggerAbstractAcceptedEmail(acceptedSnapshot, linkedReg);
          if (emailResult.success) {
            emailNote = emailResult.duplicatePrevented
              ? ' Acceptance email already sent previously.'
              : ' Acceptance confirmation email sent.';
          } else {
            emailNote = ` Acceptance email failed (${emailResult.error || 'upstream error'}) — use Retry in dashboard.`;
          }
        } catch (emailErr: any) {
          console.warn('Non-fatal Event 4 email dispatch error:', emailErr);
          emailNote = ' Acceptance email could not be sent — use Retry in dashboard.';
        }
      }

      setActionSuccessMsg(`Abstract ${selectedAbs.id} status successfully updated to "${targetStatus}".${emailNote}`);
      setSelectedAbs(null);
      setActionRemarks('');
    } catch (err: any) {
      console.error('Failed to update abstract review status:', err);
      alert('Error updating abstract review status in Firestore.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Individual Registration Deletion
  const confirmDeleteRegistration = async () => {
    if (!regToDelete) return;
    setProcessingAction(true);
    try {
      await deleteRegistrationRecord(
        regToDelete.id,
        regToDelete.linkedAbstractId,
        deleteBothLinked
      );
      setRegToDelete(null);
      setActionSuccessMsg('Registration record successfully deleted.');
    } catch (err: any) {
      console.error('Error deleting registration:', err);
      alert('Error deleting registration from Firestore.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Individual Abstract Deletion (Unlinks Registration)
  const confirmDeleteAbstract = async () => {
    if (!absToDelete) return;
    setProcessingAction(true);
    try {
      await deleteAbstractRecord(
        absToDelete.id,
        absToDelete.registrationDocId,
        absToDelete.registrationId
      );
      setAbsToDelete(null);
      setActionSuccessMsg(
        `Abstract ${absToDelete.id} successfully deleted. Registration ${absToDelete.registrationId} has been unlinked and is eligible for abstract resubmission.`
      );
    } catch (err: any) {
      console.error('Error deleting abstract:', err);
      alert('Error deleting abstract from Firestore.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Toggle Test / Live Record Flag
  const toggleRecordType = async (collectionName: 'registrations' | 'abstractSubmissions', docId: string, currentType?: string) => {
    const newType = currentType === 'test' ? 'live' : 'test';
    try {
      await updateDoc(doc(db, collectionName, docId), {
        recordType: newType,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating record type:', err);
    }
  };

  // Password Update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg(null);
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordChangeMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (!auth.currentUser) {
      setPasswordChangeMsg({ type: 'error', text: 'No authenticated session found.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await updatePassword(auth.currentUser, newPasswordInput);
      setPasswordChangeMsg({ type: 'success', text: 'Password successfully updated!' });
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordChangeMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Safely classify or update a registration's Institution Category (without altering other fields)
  const handleUpdateRegistrationInstitutionCategory = async (
    reg: RegistrationRecord,
    category: InstitutionCategoryValue
  ) => {
    if (updatingInstCatId) return;
    setUpdatingInstCatId(reg.id);
    setActionSuccessMsg(null);
    try {
      const adminIdentity = user?.email || 'org.secy.cp@srmist.edu.in';
      const timestamp = new Date().toISOString();

      await updateDoc(doc(db, 'registrations', reg.id), {
        institutionCategory: category,
        updatedBy: adminIdentity,
        updatedAt: timestamp,
      });

      setSelectedReg((prev) =>
        prev && prev.id === reg.id
          ? { ...prev, institutionCategory: category, updatedAt: timestamp }
          : prev
      );

      setActionSuccessMsg(
        `Institution category for ${reg.fullName} (${reg.registrationId || reg.id}) set to ${
          category === 'internal' ? 'Internal' : 'External'
        }.`
      );
    } catch (err: any) {
      console.error('Failed to update institution category:', err);
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${reg.id}`);
    } finally {
      setUpdatingInstCatId(null);
    }
  };

  // Download submitted abstracts compiled into a single Word (.docx) document
  const handleDownloadAllAbstractsWord = async (forceAll = false) => {
    if (exportingWord) return;
    setExportingWord(true);
    setWordExportFeedback(null);

    const effectiveFilter: InstitutionFilterValue = forceAll ? 'all' : absInstitutionFilter;
    const targetFilename =
      effectiveFilter === 'internal'
        ? 'SRM_Conference_2027_Internal_Abstracts.docx'
        : effectiveFilter === 'external'
        ? 'SRM_Conference_2027_External_Abstracts.docx'
        : ABSTRACT_WORD_FILENAME;

    try {
      const result = await exportAllAbstractsToWord(visibleAbstracts, targetFilename, {
        registrations,
        institutionFilter: effectiveFilter,
      });

      if (result.empty) {
        setWordExportFeedback({
          type: 'warning',
          title: 'No Matching Abstracts Available',
          message:
            effectiveFilter === 'all'
              ? 'There are currently no submitted abstract records available in Abstract Management to compile into a Word document.'
              : `No submitted abstracts currently match the ${
                  effectiveFilter === 'internal' ? 'Internal Participants' : 'External Participants'
                } institution filter.`,
        });
        return;
      }

      if (result.flaggedOverflowIds.length > 0) {
        setWordExportFeedback({
          type: 'warning',
          title: 'Word Document Downloaded (Long Abstract Notice)',
          message: `Compiled ${result.totalAbstracts} abstracts across ${result.totalPages} pages into ${result.filename}. However, ${result.flaggedOverflowIds.length} abstract(s) contain unusually long text that may exceed one A4 page in Word.`,
          flaggedIds: result.flaggedOverflowIds,
        });
      } else {
        setWordExportFeedback({
          type: 'success',
          title: 'Word Compilation Complete',
          message: `Successfully compiled ${result.totalAbstracts} submitted abstract(s) (${result.totalPages} pages, 1 abstract per A4 page) and downloaded ${result.filename}.`,
        });
      }
    } catch (err: any) {
      console.error('Error compiling abstracts to Word:', err);
      setWordExportFeedback({
        type: 'error',
        title: 'Word Compilation Failed',
        message:
          err?.message ||
          'Unable to compile abstracts into a Word document at this moment. No database records were altered.',
      });
    } finally {
      setExportingWord(false);
    }
  };

  // Filtered Datasets based on record type
  const filterByRecordType = <T extends { recordType?: string }>(items: T[]) => {
    if (recordTypeFilter === 'all') return items;
    return items.filter((item) => (item.recordType || 'live') === recordTypeFilter);
  };

  const visibleRegistrations = filterByRecordType(registrations);
  const visibleAbstracts = filterByRecordType(abstracts);
  const visibleEmailLogs = filterByRecordType(emailLogs);

  const emailLogMap = useMemo(() => {
    const map = new Map<string, EmailLogRecord>();
    for (const log of emailLogs) {
      map.set(log.eventId || log.id, log);
    }
    return map;
  }, [emailLogs]);

  const normalizeLogStatus = (log?: EmailLogRecord): 'Sent' | 'Pending' | 'Failed' | 'Not Sent' => {
    if (!log) return 'Not Sent';
    if (log.status === 'Sent' || (log.status as string) === 'Delivered') return 'Sent';
    if (log.status === 'Pending') return 'Pending';
    if (log.status === 'Failed') return 'Failed';
    return 'Not Sent';
  };

  const emailDeliverySummary = useMemo(() => {
    const types: EmailEventType[] = [
      'registration_received',
      'registration_confirmation',
      'abstract_confirmation',
      'abstract_acceptance',
    ];
    const counts: Record<EmailEventType, { sent: number; failed: number; pending: number }> = {
      registration_received: { sent: 0, failed: 0, pending: 0 },
      registration_confirmation: { sent: 0, failed: 0, pending: 0 },
      abstract_confirmation: { sent: 0, failed: 0, pending: 0 },
      abstract_acceptance: { sent: 0, failed: 0, pending: 0 },
    };

    for (const log of visibleEmailLogs) {
      if (!types.includes(log.type)) continue;
      const st = normalizeLogStatus(log);
      if (st === 'Sent') counts[log.type].sent += 1;
      else if (st === 'Failed') counts[log.type].failed += 1;
      else if (st === 'Pending') counts[log.type].pending += 1;
    }

    const failedLogs = visibleEmailLogs.filter(
      (log) => types.includes(log.type) && normalizeLogStatus(log) === 'Failed'
    );

    return { counts, failedLogs };
  }, [visibleEmailLogs]);

  const handleRetryOrSendEmail = async (params: {
    eventId: string;
    eventType: EmailEventType;
    registration?: RegistrationRecord;
    abstract?: AbstractRecord;
  }) => {
    if (retryingEmailEventId) return;
    setRetryingEmailEventId(params.eventId);
    setActionSuccessMsg(null);

    try {
      let resolvedReg = params.registration;
      let resolvedAbs = params.abstract;

      if (!resolvedAbs && (params.eventType === 'abstract_confirmation' || params.eventType === 'abstract_acceptance')) {
        const log = emailLogMap.get(params.eventId);
        const absId = log?.abstractId || log?.referenceId;
        if (absId) {
          resolvedAbs = abstracts.find((a) => a.id.toUpperCase() === absId.toUpperCase());
        }
      }

      if (!resolvedReg) {
        if (resolvedAbs) {
          resolvedReg = getLinkedRegistrationForAbstractRecord(resolvedAbs, registrations);
        } else {
          const log = emailLogMap.get(params.eventId);
          const regKey = (log?.registrationId || log?.referenceId || '').toUpperCase();
          const regDocKey = log?.regDocId;
          resolvedReg = registrations.find(
            (r) =>
              (regDocKey && r.id === regDocKey) ||
              (r.registrationId && r.registrationId.toUpperCase() === regKey) ||
              r.id.toUpperCase() === regKey
          );
        }
      }

      const result = await retryEmailNotification({
        eventId: params.eventId,
        eventType: params.eventType,
        registration: resolvedReg,
        abstract: resolvedAbs,
      });

      const label = EMAIL_EVENT_LABELS[params.eventType] || params.eventType;
      if (result.success) {
        setActionSuccessMsg(
          result.duplicatePrevented
            ? `${label} email (${params.eventId}) was already delivered previously; duplicate blocked.`
            : `${label} email (${params.eventId}) sent successfully.`
        );
      } else {
        setActionSuccessMsg(
          `${label} email (${params.eventId}) retry failed: ${result.error || 'Email service unavailable.'}`
        );
      }
    } finally {
      setRetryingEmailEventId(null);
    }
  };

  // Real-time Registration Institution Breakdown (across ALL registrants including non-presenting delegates)
  const regInstitutionStats = useMemo(
    () => computeRegistrationInstitutionStats(visibleRegistrations),
    [visibleRegistrations]
  );

  // Real-time Food Preference Summary (strictly Offline registrations only; Online excluded)
  const foodPreferenceStats = useMemo(
    () => computeFoodPreferenceStats(visibleRegistrations),
    [visibleRegistrations]
  );

  // Filtered Registrations Table
  const filteredRegistrations = visibleRegistrations.filter((r) => {
    const q = regSearchQuery.toLowerCase();
    const matchesSearch =
      (r.registrationId && r.registrationId.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.institution.toLowerCase().includes(q) ||
      r.transactionReference.toLowerCase().includes(q);

    const matchesStatus =
      regStatusFilter === 'all' ||
      r.paymentStatus === regStatusFilter ||
      r.registrationStatus === regStatusFilter;

    const matchesCategory =
      regCategoryFilter === 'all' || r.category === regCategoryFilter;

    const matchesInstitution =
      regInstitutionFilter === 'all' ||
      normalizeInstitutionCategory(r.institutionCategory) === regInstitutionFilter;

    const matchesParticipationMode =
      regParticipationModeFilter === 'all' ||
      classifyParticipationMode(r) === regParticipationModeFilter;

    const matchesFoodPreference = matchesFoodPreferenceFilter(
      r,
      regFoodPreferenceFilter
    );

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCategory &&
      matchesInstitution &&
      matchesParticipationMode &&
      matchesFoodPreference
    );
  });

  // Real-time Scientific Presentation Dashboard metrics (recalculates on any Firestore snapshot change or institution filter change)
  const presentationMetrics = useMemo(
    () => computePresentationDashboardMetrics(visibleRegistrations, visibleAbstracts, absInstitutionFilter),
    [visibleRegistrations, visibleAbstracts, absInstitutionFilter]
  );

  // Dashboard card click handlers
  const handleSelectPresentationCardFilter = (
    target: Exclude<PresentationDashboardFilter, 'all' | 'pending_all' | 'not_submitted' | 'awaiting_decision'>
  ) => {
    if (presentationDashboardFilter === target) {
      setPresentationDashboardFilter('all');
    } else {
      setPresentationDashboardFilter(target);
      setAbsStatusFilter('all');
    }
    setShowPendingBreakdown(false);
  };

  const handleTogglePendingCard = () => {
    const isPendingFilterActive =
      presentationDashboardFilter === 'pending_all' ||
      presentationDashboardFilter === 'not_submitted' ||
      presentationDashboardFilter === 'awaiting_decision';

    if (!showPendingBreakdown) {
      setShowPendingBreakdown(true);
      setPresentationDashboardFilter('pending_all');
      setAbsStatusFilter('all');
    } else if (
      presentationDashboardFilter === 'not_submitted' ||
      presentationDashboardFilter === 'awaiting_decision'
    ) {
      setPresentationDashboardFilter('pending_all');
    } else if (isPendingFilterActive) {
      setShowPendingBreakdown(false);
      setPresentationDashboardFilter('all');
    } else {
      setShowPendingBreakdown(false);
    }
  };

  const handleSelectPendingSubFilter = (
    subFilter: 'not_submitted' | 'awaiting_decision' | 'pending_all'
  ) => {
    setShowPendingBreakdown(true);
    setAbsStatusFilter('all');
    if (presentationDashboardFilter === subFilter && subFilter !== 'pending_all') {
      setPresentationDashboardFilter('pending_all');
    } else {
      setPresentationDashboardFilter(subFilter);
    }
  };

  const handleClearPresentationFilter = () => {
    setPresentationDashboardFilter('all');
    setShowPendingBreakdown(false);
    setAbsStatusFilter('all');
  };

  // Filtered Abstracts Table (supports both normal table & dashboard abstract-scoped filters)
  const filteredAbstracts = visibleAbstracts.filter((a) => {
    const q = absSearchQuery.toLowerCase();
    const author = a.presentingAuthor || {};
    const matchesSearch =
      a.id.toLowerCase().includes(q) ||
      (a.registrationId && a.registrationId.toLowerCase().includes(q)) ||
      a.title.toLowerCase().includes(q) ||
      (author.fullName && author.fullName.toLowerCase().includes(q)) ||
      (author.name && author.name.toLowerCase().includes(q)) ||
      (author.email && author.email.toLowerCase().includes(q));

    const matchesStatus = absStatusFilter === 'all' || a.status === absStatusFilter;
    const matchesTrack = absTrackFilter === 'all' || a.trackId === absTrackFilter;

    // Resolve institution classification strictly via linked Registration ID (never author affiliation)
    const linkedReg = getLinkedRegistrationForAbstractRecord(a, registrations);
    const linkedInstitutionCat = normalizeInstitutionCategory(linkedReg?.institutionCategory);
    const matchesInstitution =
      absInstitutionFilter === 'all' || linkedInstitutionCat === absInstitutionFilter;

    let matchesDashboardCard = true;
    if (presentationDashboardFilter === 'submitted') {
      matchesDashboardCard = presentationMetrics.submittedAbstractIdSet.has(a.id);
    } else if (presentationDashboardFilter === 'awaiting_decision') {
      matchesDashboardCard = presentationMetrics.awaitingDecisionAbstractIdSet.has(a.id);
    } else if (presentationDashboardFilter === 'accepted') {
      matchesDashboardCard = presentationMetrics.acceptedAbstractIdSet.has(a.id);
    } else if (presentationDashboardFilter === 'rejected') {
      matchesDashboardCard = presentationMetrics.rejectedAbstractIdSet.has(a.id);
    } else if (presentationDashboardFilter === 'oral_allotted') {
      matchesDashboardCard = presentationMetrics.oralAllottedAbstractIdSet.has(a.id);
    } else if (presentationDashboardFilter === 'poster_allotted') {
      matchesDashboardCard = presentationMetrics.posterAllottedAbstractIdSet.has(a.id);
    } else if (presentationDashboardFilter === 'eposter_allotted') {
      matchesDashboardCard = presentationMetrics.eposterAllottedAbstractIdSet.has(a.id);
    }

    return matchesSearch && matchesStatus && matchesTrack && matchesInstitution && matchesDashboardCard;
  });

  // Roster rows used when a registration-inclusive presentation filter is active
  // ('registered', 'not_submitted', or 'pending_all')
  const isRegistrationRosterFilterActive =
    presentationDashboardFilter === 'registered' ||
    presentationDashboardFilter === 'not_submitted' ||
    presentationDashboardFilter === 'pending_all';

  const filteredPresentationRosterRows = useMemo(() => {
    if (!isRegistrationRosterFilterActive) return [];

    let sourceRegs: RegistrationRecord[] = [];
    if (presentationDashboardFilter === 'registered') {
      sourceRegs = presentationMetrics.eligibleRegistrations;
    } else if (presentationDashboardFilter === 'not_submitted') {
      sourceRegs = presentationMetrics.notSubmittedRegistrations;
    } else if (presentationDashboardFilter === 'pending_all') {
      const pendingRegMap = new Map<string, RegistrationRecord>();
      for (const reg of presentationMetrics.notSubmittedRegistrations) {
        const key = normalizeRegKey(reg.registrationId) || normalizeRegKey(reg.id);
        if (key) pendingRegMap.set(key, reg);
      }
      for (const abs of presentationMetrics.awaitingDecisionAbstracts) {
        const linkedReg = presentationMetrics.registrationByAbstractId.get(abs.id);
        if (linkedReg) {
          const key = normalizeRegKey(linkedReg.registrationId) || normalizeRegKey(linkedReg.id);
          if (key) pendingRegMap.set(key, linkedReg);
        }
      }
      sourceRegs = Array.from(pendingRegMap.values());
    }

    const q = absSearchQuery.trim().toLowerCase();

    return sourceRegs
      .map((reg) => {
        const canonicalKey = normalizeRegKey(reg.registrationId) || normalizeRegKey(reg.id);
        const linkedAbs = presentationMetrics.abstractByCanonicalRegKey.get(canonicalKey);
        return { reg, linkedAbs };
      })
      .filter(({ reg, linkedAbs }) => {
        if (absTrackFilter !== 'all') {
          if (!linkedAbs || linkedAbs.trackId !== absTrackFilter) return false;
        }
        if (absStatusFilter !== 'all') {
          if (!linkedAbs || linkedAbs.status !== absStatusFilter) return false;
        }
        if (!q) return true;

        const regIdMatch = (reg.registrationId || reg.id || '').toLowerCase().includes(q);
        const nameMatch = (reg.fullName || '').toLowerCase().includes(q);
        const emailMatch = (reg.email || '').toLowerCase().includes(q);
        const instMatch = (reg.institution || '').toLowerCase().includes(q);
        const absIdMatch = linkedAbs ? linkedAbs.id.toLowerCase().includes(q) : false;
        const absTitleMatch = linkedAbs ? (linkedAbs.title || '').toLowerCase().includes(q) : false;
        return regIdMatch || nameMatch || emailMatch || instMatch || absIdMatch || absTitleMatch;
      });
  }, [
    isRegistrationRosterFilterActive,
    presentationDashboardFilter,
    presentationMetrics,
    absSearchQuery,
    absTrackFilter,
    absStatusFilter,
  ]);

  const activeDashboardFilterLabel: Record<PresentationDashboardFilter, string> = {
    all: 'All Abstracts',
    registered: 'Registered for Presentation',
    submitted: 'Abstracts Submitted',
    pending_all: 'Abstracts Pending (All)',
    not_submitted: 'Pending · Not Submitted',
    awaiting_decision: 'Pending · Awaiting Acceptance Decision',
    accepted: 'Accepted Abstracts',
    rejected: 'Rejected Abstracts',
    oral_allotted: 'Oral Allotted',
    poster_allotted: 'Poster Allotted',
    eposter_allotted: 'E-Poster Allotted',
  };

  // Unified Participant Search Matching
  const unifiedSearchResults = registrations.filter((r) => {
    if (!unifiedSearchQuery.trim()) return false;
    const q = unifiedSearchQuery.toLowerCase();
    const matchesReg =
      (r.registrationId && r.registrationId.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.linkedAbstractId && r.linkedAbstractId.toLowerCase().includes(q));

    return matchesReg;
  });

  // Metrics computation
  const totalRegs = visibleRegistrations.length;
  const verifiedRegs = visibleRegistrations.filter((r) => r.paymentStatus === 'Verified').length;
  const pendingRegs = visibleRegistrations.filter((r) => r.paymentStatus === 'Pending Verification').length;
  const underVerifRegs = visibleRegistrations.filter((r) => r.paymentStatus === 'Under Verification').length;
  const rejectedRegs = visibleRegistrations.filter((r) => r.paymentStatus === 'Rejected').length;

  const totalAbs = visibleAbstracts.length;
  const acceptedAbs = visibleAbstracts.filter((a) => a.status === 'Accepted').length;
  const underReviewAbs = visibleAbstracts.filter((a) => a.status === 'Under Review' || a.status === 'Submitted').length;
  const rejectedAbs = visibleAbstracts.filter((a) => a.status === 'Rejected').length;

  const testCount = registrations.filter((r) => r.recordType === 'test').length +
    abstracts.filter((a) => a.recordType === 'test').length;

  // Lookup linked registration for an abstract strictly via Registration ID
  const getLinkedRegistrationForAbstract = (abs: AbstractRecord): RegistrationRecord | undefined => {
    return getLinkedRegistrationForAbstractRecord(abs, registrations);
  };

  // -------------------------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------------------------
  if (!isAdminAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0F33] via-[#090D2A] to-[#06081E] text-slate-100 flex items-center justify-center p-4 font-['Inter',sans-serif]">
        <div className="max-w-md w-full bg-[#12183F]/90 backdrop-blur-xl rounded-2xl border border-purple-500/20 shadow-2xl p-8 space-y-6 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top navigation */}
          <div className="flex items-center justify-between border-b border-purple-500/10 pb-4">
            <button
              onClick={onExit}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Conference Portal</span>
            </button>
            <span className="text-[10px] font-mono uppercase tracking-wider bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
              Admin Gateway
            </span>
          </div>

          {/* Brand header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6D3CE2] via-[#8545EB] to-[#9333EA] p-0.5 mx-auto shadow-lg shadow-purple-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-[#0F1438] rounded-2xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-purple-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight font-heading">
              Org. Secretary Login
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Registration, Payment Verification & Abstract Management System
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 text-xs text-red-300 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleOrgSecretaryLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[12px] font-semibold text-slate-300">
                Username / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="org.secy.cp"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/70 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Default: <span className="font-mono text-cyan-300">org.secy.cp</span> (Dr. N. Damodharan)
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[12px] font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/70 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Default: <span className="font-mono text-cyan-300">password123</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-gradient-to-r from-[#6D3CE2] via-[#8545EB] to-[#9333EA] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md shadow-purple-500/20 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In to Org. Secretary Dashboard'}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-700/60 w-full" />
            <span className="bg-[#12183F] px-2 text-[10px] text-slate-500 uppercase tracking-widest absolute">
              OR
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Sign in with Google Account</span>
          </button>

          <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-800">
            SRM College of Pharmacy, SRMIST · Conference 2027
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // DASHBOARD MAIN VIEW
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-['Inter',sans-serif] flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-[#0B112C] text-white border-b border-[#1E2954] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Return to Public Site"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-slate-700/60" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6D3CE2] to-[#9333EA] flex items-center justify-center text-white shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-none">
                  Org. Secretary Dashboard
                </h1>
                <span className="text-[10px] text-cyan-300 tracking-wide font-mono">
                  SRM College of Pharmacy · AICONDD 2027
                </span>
              </div>
            </div>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Record Type Toggle Indicator */}
            <div className="hidden md:flex items-center bg-[#151D42] rounded-full p-0.5 border border-purple-500/30 text-[11px]">
              <button
                onClick={() => setRecordTypeFilter('all')}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  recordTypeFilter === 'all'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setRecordTypeFilter('live')}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  recordTypeFilter === 'live'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Records
              </button>
              <button
                onClick={() => setRecordTypeFilter('test')}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  recordTypeFilter === 'test'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Test Records ({testCount})
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-[12px] font-bold text-white leading-tight">
                Dr. N. Damodharan
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {user?.email || 'org.secy.cp@srmist.edu.in'}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Success Notification Strip */}
      {actionSuccessMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{actionSuccessMsg}</span>
            <button
              onClick={() => setActionSuccessMsg(null)}
              className="ml-auto text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout: Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Navigation (7 Modules) */}
        <aside className="w-full md:w-64 shrink-0 space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-2xs space-y-1">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'registrations', label: 'Registration Management', icon: Users, badge: pendingRegs > 0 ? `${pendingRegs} pending` : null },
              { id: 'abstracts', label: 'Abstract Management', icon: FileText, badge: underReviewAbs > 0 ? `${underReviewAbs}` : null },
              { id: 'search', label: 'Participant Search', icon: Search },
              { id: 'reports', label: 'Reports & Excel Export', icon: FileSpreadsheet },
              { id: 'hospitality', label: 'Accommodation & Places', icon: Building2 },
              { id: 'backup', label: 'Database Backup & Recovery', icon: Database },
              { id: 'settings', label: 'Account Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {/* ================================================================= */}
          {/* MODULE 1: DASHBOARD OVERVIEW */}
          {/* ================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-heading">
                    Executive Dashboard Overview
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live registration, verification, and abstract submission tracking.
                  </p>
                </div>

                <button
                  onClick={() => exportMasterParticipantsToExcel(registrations, abstracts)}
                  className="px-3 py-1.5 rounded-lg bg-[#0B112C] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Download Master Excel</span>
                </button>
              </div>

              {/* Registration Stats Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Registration & Payment Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500">Total Delegates</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1">{totalRegs}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Submitted registrations</div>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-emerald-800">Payment Verified</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-900 mt-1">{verifiedRegs}</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">Approved & UTR confirmed</div>
                  </div>

                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-amber-800">Pending Verification</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-amber-900 mt-1">{pendingRegs}</div>
                    <div className="text-[10px] text-amber-700 mt-0.5">Awaiting fee approval</div>
                  </div>

                  <div className="bg-red-50/60 p-4 rounded-xl border border-red-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-red-800">Rejected Payments</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-red-900 mt-1">{rejectedRegs}</div>
                    <div className="text-[10px] text-red-700 mt-0.5">Requires UTR correction</div>
                  </div>
                </div>
              </div>

              {/* Abstract Stats Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Scientific Abstract Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500">Total Abstracts</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-purple-900 mt-1">{totalAbs}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">AICONDD-ABS-xxx</div>
                  </div>

                  <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-purple-800">Accepted Papers</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-purple-900 mt-1">{acceptedAbs}</div>
                    <div className="text-[10px] text-purple-700 mt-0.5">Letters downloadable</div>
                  </div>

                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-blue-800">Under Review</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-blue-900 mt-1">{underReviewAbs}</div>
                    <div className="text-[10px] text-blue-700 mt-0.5">Assigned to track chairs</div>
                  </div>

                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-700">Test Records</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-800 mt-1">{testCount}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Flagged for clean removal</div>
                  </div>
                </div>
              </div>

              {/* Automated Email Delivery Status */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>Automated Email Delivery Status</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      'registration_received',
                      'registration_confirmation',
                      'abstract_confirmation',
                      'abstract_acceptance',
                    ] as EmailEventType[]
                  ).map((evType) => {
                    const stat = emailDeliverySummary.counts[evType];
                    return (
                      <div key={evType} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-600">
                          {EMAIL_EVENT_LABELS[evType]}
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                            {stat.sent}
                          </span>
                          <span className="text-[10px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Sent
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] pt-0.5">
                          <span className={stat.failed > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}>
                            Failed: {stat.failed}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className={stat.pending > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                            Pending: {stat.pending}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {emailDeliverySummary.failedLogs.length > 0 && (
                  <div className="mt-3 bg-red-50/70 border border-red-200 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          {emailDeliverySummary.failedLogs.length} Failed Email Notification
                          {emailDeliverySummary.failedLogs.length === 1 ? '' : 's'} Requiring Retry
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {emailDeliverySummary.failedLogs.map((log) => (
                        <div
                          key={log.eventId || log.id}
                          className="bg-white rounded-lg border border-red-200/80 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900">
                                {EMAIL_EVENT_LABELS[log.type] || log.type}
                              </span>
                              <span className="font-mono text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                                {log.referenceId}
                              </span>
                              <span className="text-slate-500 text-[11px] truncate">{log.recipient}</span>
                            </div>
                            <div className="text-[11px] text-red-700 truncate" title={log.error || ''}>
                              {log.error || 'Delivery error'} (Attempts: {log.attemptCount || 1})
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={retryingEmailEventId === (log.eventId || log.id)}
                            onClick={() =>
                              handleRetryOrSendEmail({
                                eventId: log.eventId || log.id,
                                eventType: log.type,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${
                                retryingEmailEventId === (log.eventId || log.id) ? 'animate-spin' : ''
                              }`}
                            />
                            <span>
                              {retryingEmailEventId === (log.eventId || log.id) ? 'Retrying...' : 'Retry Email'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action shortcut banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Pending Action: {pendingRegs} Registrations awaiting payment verification
                  </h4>
                  <p className="text-xs text-slate-500">
                    Review participant UTR references and payment proofs to verify payments and approve registrations. Participants receive their Registration ID immediately upon registration and may submit abstracts independently.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRegStatusFilter('Pending Verification');
                    setActiveTab('registrations');
                  }}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shrink-0 shadow-xs"
                >
                  Process Verifications
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODULE 2: REGISTRATION MANAGEMENT */}
          {/* ================================================================= */}
          {activeTab === 'registrations' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-heading">
                    Registration Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verify participant UTR payments, inspect payment proofs, or manage registration records.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      exportRegistrationsToExcel(
                        filteredRegistrations,
                        regInstitutionFilter === 'internal'
                          ? 'AICONDD_Internal_Registrations_2027.xlsx'
                          : regInstitutionFilter === 'external'
                          ? 'AICONDD_External_Registrations_2027.xlsx'
                          : 'AICONDD_Registrations_2027.xlsx'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {regInstitutionFilter === 'all'
                        ? 'Export Registrations (.xlsx)'
                        : `Export ${regInstitutionFilter === 'internal' ? 'Internal' : 'External'} (.xlsx)`}
                    </span>
                  </button>
                  {regInstitutionFilter !== 'all' && (
                    <button
                      onClick={() =>
                        exportRegistrationsToExcel(
                          visibleRegistrations,
                          'AICONDD_All_Registrations_2027.xlsx'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>All (.xlsx)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Institution Classification Summary Cards & Segmented Filter */}
              <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Institution Classification Overview
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Counts include all registered delegates and presenters.
                      {regInstitutionStats.unclassifiedRegistrations > 0 && (
                        <span className="ml-1.5 text-amber-700 font-semibold">
                          · {regInstitutionStats.unclassifiedRegistrations} legacy record(s) unclassified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Segmented Institution Filter */}
                  <div
                    role="group"
                    aria-label="Filter registrations by institution category"
                    className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 text-[11px] font-semibold self-start sm:self-auto"
                  >
                    {(
                      [
                        { id: 'all', label: 'All Registrations' },
                        { id: 'internal', label: 'Internal' },
                        { id: 'external', label: 'External' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={regInstitutionFilter === opt.id}
                        onClick={() => setRegInstitutionFilter(opt.id)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          regInstitutionFilter === opt.id
                            ? 'bg-white text-purple-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRegInstitutionFilter('all')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between bg-gradient-to-br from-slate-50/90 via-white/90 to-indigo-50/70 ${
                      regInstitutionFilter === 'all'
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200/90 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Total Registrations
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 font-heading tabular-nums mt-0.5">
                        {regInstitutionStats.totalRegistrations}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRegInstitutionFilter((prev) => (prev === 'internal' ? 'all' : 'internal'))
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between bg-gradient-to-br from-purple-50/90 via-white/90 to-violet-50/70 ${
                      regInstitutionFilter === 'internal'
                        ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-purple-200/80 hover:border-purple-300'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Internal Registrations
                      </div>
                      <div className="text-2xl font-extrabold text-purple-950 font-heading tabular-nums mt-0.5">
                        {regInstitutionStats.internalRegistrations}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                      SRMIST
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRegInstitutionFilter((prev) => (prev === 'external' ? 'all' : 'external'))
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between bg-gradient-to-br from-cyan-50/90 via-white/90 to-sky-50/70 ${
                      regInstitutionFilter === 'external'
                        ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'border-cyan-200/80 hover:border-cyan-300'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        External Registrations
                      </div>
                      <div className="text-2xl font-extrabold text-cyan-950 font-heading tabular-nums mt-0.5">
                        {regInstitutionStats.externalRegistrations}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-100/80 px-2 py-0.5 rounded-md">
                      Other Inst.
                    </span>
                  </button>
                </div>
              </div>

              {/* Food Preference Summary (Offline Catering Headcounts Only) */}
              <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Food Preference Summary
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Offline registrations only ({foodPreferenceStats.totalOffline} Offline total; Online excluded)
                      </div>
                    </div>
                  </div>

                  {regFoodPreferenceFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setRegFoodPreferenceFilter('all')}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg cursor-pointer self-start sm:self-auto"
                    >
                      Show All ({visibleRegistrations.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setRegFoodPreferenceFilter((prev) =>
                        prev === 'vegetarian' ? 'all' : 'vegetarian'
                      )
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between bg-gradient-to-br from-emerald-50/90 via-white/90 to-green-50/70 ${
                      regFoodPreferenceFilter === 'vegetarian'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-emerald-200/80 hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-900">
                        Vegetarian
                      </div>
                      <div className="text-2xl font-extrabold text-emerald-950 font-heading tabular-nums mt-0.5">
                        {foodPreferenceStats.vegetarian}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                      Veg · Offline
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRegFoodPreferenceFilter((prev) =>
                        prev === 'non-vegetarian' ? 'all' : 'non-vegetarian'
                      )
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between bg-gradient-to-br from-rose-50/90 via-white/90 to-orange-50/60 ${
                      regFoodPreferenceFilter === 'non-vegetarian'
                        ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                        : 'border-rose-200/80 hover:border-rose-300'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-rose-900">
                        Non-Vegetarian
                      </div>
                      <div className="text-2xl font-extrabold text-rose-950 font-heading tabular-nums mt-0.5">
                        {foodPreferenceStats.nonVegetarian}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-md">
                      Non-Veg · Offline
                    </span>
                  </button>

                  <div className="p-3 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white/90 to-amber-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        Not Specified
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 font-heading tabular-nums mt-0.5">
                        {foodPreferenceStats.notSpecified}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      Missing · Offline
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row flex-wrap gap-2.5">
                <div className="relative flex-1 min-w-[210px]">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={regSearchQuery}
                    onChange={(e) => setRegSearchQuery(e.target.value)}
                    placeholder="Search by Registration ID, Name, Email, UTR, or College..."
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <select
                  aria-label="Filter by Payment Status"
                  value={regStatusFilter}
                  onChange={(e) => setRegStatusFilter(e.target.value)}
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Under Verification">Under Verification</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  aria-label="Filter by Participant Category"
                  value={regCategoryFilter}
                  onChange={(e) => setRegCategoryFilter(e.target.value)}
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Student / Scholar">Student / Scholar</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Industry Professional">Industry Professional</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Others">Others</option>
                </select>

                <select
                  aria-label="Filter by Participation Mode"
                  value={regParticipationModeFilter}
                  onChange={(e) =>
                    setRegParticipationModeFilter(e.target.value as ParticipationModeFilterValue)
                  }
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="all">All Modes</option>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>

                <select
                  aria-label="Filter by Food Preference"
                  value={regFoodPreferenceFilter}
                  onChange={(e) =>
                    setRegFoodPreferenceFilter(e.target.value as FoodPreferenceFilterValue)
                  }
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700"
                >
                  <option value="all">Food Preference: All</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non-vegetarian">Non-Vegetarian</option>
                </select>

                {(regSearchQuery ||
                  regStatusFilter !== 'all' ||
                  regCategoryFilter !== 'all' ||
                  regInstitutionFilter !== 'all' ||
                  regParticipationModeFilter !== 'all' ||
                  regFoodPreferenceFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegSearchQuery('');
                      setRegStatusFilter('all');
                      setRegCategoryFilter('all');
                      setRegInstitutionFilter('all');
                      setRegParticipationModeFilter('all');
                      setRegFoodPreferenceFilter('all');
                    }}
                    className="px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Registrations Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Registration ID</th>
                        <th className="p-3.5">Participant</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Food Preference</th>
                        <th className="p-3.5">UTR / Fee</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Abstract</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingData ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            Loading registrations...
                          </td>
                        </tr>
                      ) : filteredRegistrations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            No matching registrations found.
                          </td>
                        </tr>
                      ) : (
                        filteredRegistrations.map((reg) => {
                          const foodPrefLabel = formatFoodPreferenceDisplay(reg);
                          return (
                          <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Registration ID */}
                            <td className="p-3.5 whitespace-nowrap">
                              {reg.registrationId ? (
                                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                  {reg.registrationId}
                                </span>
                              ) : (
                                <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[11px] border border-amber-200">
                                  Pending ID
                                </span>
                              )}
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ref: {reg.id}
                              </div>
                            </td>

                            {/* Participant */}
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{reg.fullName}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                {reg.email} · {reg.institution}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                {normalizeInstitutionCategory(reg.institutionCategory) ? (
                                  <span
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                      normalizeInstitutionCategory(reg.institutionCategory) === 'internal'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                    }`}
                                  >
                                    {formatInstitutionCategoryLabel(reg.institutionCategory)}
                                  </span>
                                ) : (
                                  <select
                                    aria-label={`Classify institution for ${reg.fullName}`}
                                    value=""
                                    disabled={updatingInstCatId === reg.id}
                                    onChange={(e) => {
                                      const val = e.target.value as InstitutionCategoryValue | '';
                                      if (val === 'internal' || val === 'external') {
                                        handleUpdateRegistrationInstitutionCategory(reg, val);
                                      }
                                    }}
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 outline-none cursor-pointer"
                                  >
                                    <option value="">Unclassified · Assign...</option>
                                    <option value="internal">Internal (SRM)</option>
                                    <option value="external">External</option>
                                  </select>
                                )}
                              </div>
                            </td>

                            {/* Category */}
                            <td className="p-3.5 whitespace-nowrap text-slate-600">
                              <div>{reg.category}</div>
                              <div className="text-[10px] text-slate-400">{reg.participationMode}</div>
                            </td>

                            {/* Food Preference */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${
                                  foodPrefLabel === 'Vegetarian'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : foodPrefLabel === 'Non-Vegetarian'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : foodPrefLabel === 'Not Applicable'
                                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {foodPrefLabel}
                              </span>
                            </td>

                            {/* UTR / Fee */}
                            <td className="p-3.5 whitespace-nowrap font-mono">
                              <div className="font-semibold text-slate-800">
                                ₹{reg.paymentAmount || reg.amount || 2000}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                                {reg.transactionReference}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  reg.paymentStatus === 'Verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : reg.paymentStatus === 'Rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {reg.paymentStatus}
                              </span>
                              {(() => {
                                const regKey = (reg.registrationId || reg.id || '').trim().toUpperCase();
                                const doneId = getRegistrationReceivedEventId(regKey);
                                const confId = getRegistrationConfirmedEventId(regKey);
                                const doneLog = emailLogMap.get(doneId);
                                const confLog = emailLogMap.get(confId);
                                const doneStatus = normalizeLogStatus(doneLog);
                                const confStatus = normalizeLogStatus(confLog);
                                const isVerified =
                                  reg.paymentStatus === 'Verified' && reg.registrationStatus === 'Approved';

                                return (
                                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[9.5px]">
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-semibold ${
                                        doneStatus === 'Sent'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : doneStatus === 'Failed'
                                          ? 'bg-red-50 text-red-700 border border-red-200'
                                          : doneStatus === 'Pending'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-slate-50 text-slate-400 border border-slate-200'
                                      }`}
                                      title={doneLog?.error || `Registration Done Email: ${doneStatus}`}
                                    >
                                      Done: {doneStatus}
                                    </span>
                                    {doneStatus === 'Failed' && (
                                      <button
                                        type="button"
                                        disabled={retryingEmailEventId === doneId}
                                        onClick={() =>
                                          handleRetryOrSendEmail({
                                            eventId: doneId,
                                            eventType: 'registration_received',
                                            registration: reg,
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-50"
                                      >
                                        {retryingEmailEventId === doneId ? '...' : 'Retry'}
                                      </button>
                                    )}
                                    {(isVerified || confLog) && (
                                      <>
                                        <span
                                          className={`px-1.5 py-0.5 rounded font-semibold ${
                                            confStatus === 'Sent'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : confStatus === 'Failed'
                                              ? 'bg-red-50 text-red-700 border border-red-200'
                                              : confStatus === 'Pending'
                                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                              : 'bg-slate-50 text-slate-400 border border-slate-200'
                                          }`}
                                          title={confLog?.error || `Registration Confirmation Email: ${confStatus}`}
                                        >
                                          Conf: {confStatus}
                                        </span>
                                        {(confStatus === 'Failed' || (isVerified && confStatus === 'Not Sent')) && (
                                          <button
                                            type="button"
                                            disabled={retryingEmailEventId === confId}
                                            onClick={() =>
                                              handleRetryOrSendEmail({
                                                eventId: confId,
                                                eventType: 'registration_confirmation',
                                                registration: reg,
                                              })
                                            }
                                            className="px-1.5 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer disabled:opacity-50"
                                          >
                                            {retryingEmailEventId === confId
                                              ? '...'
                                              : confStatus === 'Failed'
                                              ? 'Retry'
                                              : 'Send'}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Abstract Link */}
                            <td className="p-3.5 whitespace-nowrap">
                              {reg.linkedAbstractId ? (
                                <span className="font-mono text-[11px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
                                  {reg.linkedAbstractId}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">None</span>
                              )}
                            </td>

                            {/* Record Type Badge */}
                            <td className="p-3.5 whitespace-nowrap">
                              <button
                                onClick={() => toggleRecordType('registrations', reg.id, reg.recordType)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                  reg.recordType === 'test'
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Click to toggle Test/Live tag"
                              >
                                {(reg.recordType || 'live').toUpperCase()}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                              <button
                                onClick={() => setPreviewProofReg(reg)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                title="View Payment Proof Attachment"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Proof</span>
                              </button>

                              {reg.paymentStatus !== 'Verified' && (
                                <button
                                  onClick={() => handleVerifyPayment(reg)}
                                  disabled={processingAction}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-[11px] cursor-pointer shadow-2xs"
                                  title="Verify payment and approve registration"
                                >
                                  Verify
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  openPdfPreview({
                                    title: 'Registration Receipt PDF',
                                    subtitle: `${reg.registrationId || reg.id} · ${reg.fullName}`,
                                    build: () => createRegistrationSubmissionReceiptPreviewUrl(reg),
                                    onDownload: () => generateRegistrationSubmissionReceiptPDF(reg),
                                  })
                                }
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                title="Preview Registration Receipt PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>

                              {reg.paymentStatus === 'Verified' && reg.registrationStatus === 'Approved' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openPdfPreview({
                                        title: 'Registration Confirmation PDF',
                                        subtitle: `${reg.registrationId || reg.id} · ${reg.fullName}`,
                                        build: () => createRegistrationConfirmationPreviewUrl(reg),
                                        onDownload: () => generateRegistrationReceiptPDF(reg),
                                      })
                                    }
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                    title="Preview Official Registration Confirmation PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => generateRegistrationReceiptPDF(reg)}
                                    className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center"
                                    title="Download Official Registration Confirmation PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedReg(reg);
                                  setActionRemarks(reg.adminRemarks || '');
                                }}
                                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px] cursor-pointer"
                              >
                                Scrutinize
                              </button>

                              <button
                                onClick={() => setRegToDelete(reg)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer inline-flex items-center"
                                title="Delete Registration"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODULE 3: ABSTRACT MANAGEMENT */}
          {/* ================================================================= */}
          {activeTab === 'abstracts' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-heading">
                    Abstract Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Review scientific abstracts, update evaluation statuses, and download official acceptance letters.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadAllAbstractsWord(false)}
                    disabled={exportingWord}
                    className="px-3 py-1.5 rounded-lg bg-[#0F1B4B] hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    title="Compile matching abstracts into one formatted A4 Word document (.docx)"
                  >
                    {exportingWord ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Compiling Word...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-cyan-300" />
                        <span>
                          {absInstitutionFilter === 'all'
                            ? 'Download All Abstracts (Word)'
                            : `Download ${
                                absInstitutionFilter === 'internal' ? 'Internal' : 'External'
                              } Abstracts (Word)`}
                        </span>
                      </>
                    )}
                  </button>

                  {absInstitutionFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadAllAbstractsWord(true)}
                      disabled={exportingWord}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Download all abstracts regardless of institution filter"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#0F1B4B]" />
                      <span>All (Word)</span>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      exportAbstractsToExcel(
                        filteredAbstracts,
                        absInstitutionFilter === 'internal'
                          ? 'AICONDD_Internal_Abstract_Submissions_2027.xlsx'
                          : absInstitutionFilter === 'external'
                          ? 'AICONDD_External_Abstract_Submissions_2027.xlsx'
                          : 'AICONDD_Abstract_Submissions_2027.xlsx',
                        registrations
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {absInstitutionFilter === 'all'
                        ? 'Export Abstracts (.xlsx)'
                        : `Export ${absInstitutionFilter === 'internal' ? 'Internal' : 'External'} (.xlsx)`}
                    </span>
                  </button>

                  {absInstitutionFilter !== 'all' && (
                    <button
                      onClick={() =>
                        exportAbstractsToExcel(
                          visibleAbstracts,
                          'AICONDD_All_Abstract_Submissions_2027.xlsx',
                          registrations
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Export all abstracts regardless of institution filter"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-600" />
                      <span>All (.xlsx)</span>
                    </button>
                  )}
                </div>
              </div>

              {wordExportFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    wordExportFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : wordExportFeedback.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {wordExportFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          wordExportFeedback.type === 'warning'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold">{wordExportFeedback.title}</div>
                      <div>{wordExportFeedback.message}</div>
                      {wordExportFeedback.flaggedIds &&
                        wordExportFeedback.flaggedIds.length > 0 && (
                          <div className="font-mono text-[11px] pt-0.5">
                            Flagged Abstract ID(s):{' '}
                            {wordExportFeedback.flaggedIds.join(', ')}
                          </div>
                        )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWordExportFeedback(null)}
                    className="p-0.5 rounded hover:bg-black/5 cursor-pointer shrink-0"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ================================================================= */}
              {/* SCIENTIFIC PRESENTATION DASHBOARD */}
              {/* ================================================================= */}
              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading tracking-tight">
                      Scientific Presentation Dashboard
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Real-time presentation opt-in &amp; abstract metrics
                      {absInstitutionFilter === 'internal'
                        ? ' · Internal Participants (SRMIST)'
                        : absInstitutionFilter === 'external'
                        ? ' · External Participants'
                        : ' · All Institutions'}{' '}
                      (click any metric to filter).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Segmented Institution Filter for Abstract Management */}
                    <div
                      role="group"
                      aria-label="Filter abstracts and dashboard by institution category"
                      className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 text-[11px] font-semibold"
                    >
                      {(
                        [
                          { id: 'all', label: 'All Abstracts' },
                          { id: 'internal', label: 'Internal Participants' },
                          { id: 'external', label: 'External Participants' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={absInstitutionFilter === opt.id}
                          onClick={() => setAbsInstitutionFilter(opt.id)}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            absInstitutionFilter === opt.id
                              ? 'bg-white text-purple-900 shadow-xs border border-slate-200/80'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {presentationDashboardFilter !== 'all' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                          Filter: {activeDashboardFilterLabel[presentationDashboardFilter]}
                        </span>
                        <button
                          type="button"
                          onClick={handleClearPresentationFilter}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear Filter / Show All</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Six Compact Glassmorphic Statistic Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                  {/* Card 1: Registered for Presentation */}
                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'registered'}
                    onClick={() => handleSelectPresentationCardFilter('registered')}
                    className={`p-3 rounded-xl border backdrop-blur-sm text-left transition-all cursor-pointer flex flex-col justify-between min-h-[94px] bg-gradient-to-br from-indigo-50/90 via-white/80 to-blue-50/80 ${
                      presentationDashboardFilter === 'registered'
                        ? 'border-indigo-500 ring-2 ring-indigo-500/25 shadow-sm'
                        : 'border-indigo-200/80 hover:border-indigo-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                        Registered for Presentation
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-100/90 text-indigo-700 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="pt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-indigo-950 font-heading tabular-nums">
                        {presentationMetrics.counts.registeredForPresentation}
                      </span>
                      <span className="text-[10px] font-medium text-indigo-600">
                        Opted-in
                      </span>
                    </div>
                  </button>

                  {/* Card 2: Abstracts Submitted */}
                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'submitted'}
                    onClick={() => handleSelectPresentationCardFilter('submitted')}
                    className={`p-3 rounded-xl border backdrop-blur-sm text-left transition-all cursor-pointer flex flex-col justify-between min-h-[94px] bg-gradient-to-br from-purple-50/90 via-white/80 to-violet-50/80 ${
                      presentationDashboardFilter === 'submitted'
                        ? 'border-purple-500 ring-2 ring-purple-500/25 shadow-sm'
                        : 'border-purple-200/80 hover:border-purple-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                        Abstracts Submitted
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-purple-100/90 text-purple-700 flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="pt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-purple-950 font-heading tabular-nums">
                        {presentationMetrics.counts.abstractsSubmitted}
                      </span>
                      <span className="text-[10px] font-medium text-purple-600">
                        Received
                      </span>
                    </div>
                  </button>

                  {/* Card 3: Abstracts Pending */}
                  <button
                    type="button"
                    aria-expanded={showPendingBreakdown}
                    aria-pressed={
                      presentationDashboardFilter === 'pending_all' ||
                      presentationDashboardFilter === 'not_submitted' ||
                      presentationDashboardFilter === 'awaiting_decision'
                    }
                    onClick={handleTogglePendingCard}
                    className={`p-3 rounded-xl border backdrop-blur-sm text-left transition-all cursor-pointer flex flex-col justify-between min-h-[94px] bg-gradient-to-br from-amber-50/90 via-white/80 to-orange-50/80 ${
                      presentationDashboardFilter === 'pending_all' ||
                      presentationDashboardFilter === 'not_submitted' ||
                      presentationDashboardFilter === 'awaiting_decision'
                        ? 'border-amber-500 ring-2 ring-amber-500/25 shadow-sm'
                        : 'border-amber-200/80 hover:border-amber-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                        Abstracts Pending
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="pt-2 flex items-baseline justify-between gap-1">
                      <span className="text-2xl font-extrabold text-amber-950 font-heading tabular-nums">
                        {presentationMetrics.counts.abstractsPendingTotal}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 inline-flex items-center gap-0.5">
                        <span>Breakdown</span>
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${
                            showPendingBreakdown ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </div>
                  </button>

                  {/* Card 4: Oral Allotted */}
                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'oral_allotted'}
                    onClick={() => handleSelectPresentationCardFilter('oral_allotted')}
                    className={`p-3 rounded-xl border backdrop-blur-sm text-left transition-all cursor-pointer flex flex-col justify-between min-h-[94px] bg-gradient-to-br from-emerald-50/90 via-white/80 to-teal-50/80 ${
                      presentationDashboardFilter === 'oral_allotted'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/25 shadow-sm'
                        : 'border-emerald-200/80 hover:border-emerald-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                        Oral Allotted
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0">
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="pt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-emerald-950 font-heading tabular-nums">
                        {presentationMetrics.counts.oralAllotted}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700">
                        Allocated
                      </span>
                    </div>
                  </button>

                  {/* Card 5: Poster Allotted */}
                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'poster_allotted'}
                    onClick={() => handleSelectPresentationCardFilter('poster_allotted')}
                    className={`p-3 rounded-xl border backdrop-blur-sm text-left transition-all cursor-pointer flex flex-col justify-between min-h-[94px] bg-gradient-to-br from-cyan-50/90 via-white/80 to-sky-50/80 ${
                      presentationDashboardFilter === 'poster_allotted'
                        ? 'border-cyan-500 ring-2 ring-cyan-500/25 shadow-sm'
                        : 'border-cyan-200/80 hover:border-cyan-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                        Poster Allotted
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-cyan-100/90 text-cyan-700 flex items-center justify-center shrink-0">
                        <Presentation className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="pt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-cyan-950 font-heading tabular-nums">
                        {presentationMetrics.counts.posterAllotted}
                      </span>
                      <span className="text-[10px] font-medium text-cyan-700">
                        Allocated
                      </span>
                    </div>
                  </button>

                  {/* Card 6: E-Poster Allotted */}
                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'eposter_allotted'}
                    onClick={() => handleSelectPresentationCardFilter('eposter_allotted')}
                    className={`p-3 rounded-xl border backdrop-blur-sm text-left transition-all cursor-pointer flex flex-col justify-between min-h-[94px] bg-gradient-to-br from-fuchsia-50/90 via-white/80 to-pink-50/80 ${
                      presentationDashboardFilter === 'eposter_allotted'
                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/25 shadow-sm'
                        : 'border-fuchsia-200/80 hover:border-fuchsia-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                        E-Poster Allotted
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-fuchsia-100/90 text-fuchsia-700 flex items-center justify-center shrink-0">
                        <Monitor className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="pt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-fuchsia-950 font-heading tabular-nums">
                        {presentationMetrics.counts.eposterAllotted}
                      </span>
                      <span className="text-[10px] font-medium text-fuchsia-700">
                        Allocated
                      </span>
                    </div>
                  </button>
                </div>

                {/* Compact Abstract Pipeline & Review Outcome Strip (completes all 8 segregated metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'not_submitted'}
                    onClick={() => handleSelectPendingSubFilter('not_submitted')}
                    className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      presentationDashboardFilter === 'not_submitted'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-slate-50/90 hover:bg-amber-50/70 text-slate-800 border-slate-200/90'
                    }`}
                  >
                    <span className="text-[11px] font-semibold">Abstracts Not Submitted</span>
                    <span className="text-sm font-extrabold font-heading tabular-nums">
                      {presentationMetrics.counts.notSubmitted}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'awaiting_decision'}
                    onClick={() => handleSelectPendingSubFilter('awaiting_decision')}
                    className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      presentationDashboardFilter === 'awaiting_decision'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-slate-50/90 hover:bg-amber-50/70 text-slate-800 border-slate-200/90'
                    }`}
                  >
                    <span className="text-[11px] font-semibold">Awaiting Acceptance</span>
                    <span className="text-sm font-extrabold font-heading tabular-nums">
                      {presentationMetrics.counts.awaitingAcceptanceDecision}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'accepted'}
                    onClick={() => handleSelectPresentationCardFilter('accepted')}
                    className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      presentationDashboardFilter === 'accepted'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-950 border-emerald-200/80'
                    }`}
                  >
                    <span className="text-[11px] font-semibold">Accepted Abstracts</span>
                    <span className="text-sm font-extrabold font-heading tabular-nums">
                      {presentationMetrics.counts.acceptedAbstracts}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={presentationDashboardFilter === 'rejected'}
                    onClick={() => handleSelectPresentationCardFilter('rejected')}
                    className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      presentationDashboardFilter === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-rose-50/60 hover:bg-rose-100/70 text-rose-950 border-rose-200/80'
                    }`}
                  >
                    <span className="text-[11px] font-semibold">Rejected Abstracts</span>
                    <span className="text-sm font-extrabold font-heading tabular-nums">
                      {presentationMetrics.counts.rejectedAbstracts}
                    </span>
                  </button>
                </div>

                {/* Expandable Pending Breakdown Strip */}
                {showPendingBreakdown && (
                  <div className="pt-1 animate-in fade-in duration-150">
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-amber-950">
                          Abstracts Pending Breakdown
                        </div>
                        <p className="text-[11px] text-amber-800/90">
                          Click a sub-category below to filter either unsubmitted presentation registrants or submitted abstracts awaiting review decision.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
                        <button
                          type="button"
                          aria-pressed={presentationDashboardFilter === 'not_submitted'}
                          onClick={() => handleSelectPendingSubFilter('not_submitted')}
                          className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            presentationDashboardFilter === 'not_submitted'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                              : 'bg-white hover:bg-amber-100/60 text-slate-800 border-amber-200'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-85">
                              Not Submitted
                            </div>
                            <div className="text-base font-extrabold tabular-nums">
                              {presentationMetrics.counts.notSubmitted}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        </button>

                        <button
                          type="button"
                          aria-pressed={presentationDashboardFilter === 'awaiting_decision'}
                          onClick={() => handleSelectPendingSubFilter('awaiting_decision')}
                          className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            presentationDashboardFilter === 'awaiting_decision'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                              : 'bg-white hover:bg-amber-100/60 text-slate-800 border-amber-200'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-85">
                              Awaiting Acceptance Decision
                            </div>
                            <div className="text-base font-extrabold tabular-nums">
                              {presentationMetrics.counts.awaitingAcceptanceDecision}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        </button>

                        <button
                          type="button"
                          aria-pressed={presentationDashboardFilter === 'pending_all'}
                          onClick={() => handleSelectPendingSubFilter('pending_all')}
                          className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            presentationDashboardFilter === 'pending_all'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white/90 hover:bg-slate-100 text-slate-900 border-amber-200'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-85">
                              Total Pending
                            </div>
                            <div className="text-base font-extrabold tabular-nums">
                              {presentationMetrics.counts.abstractsPendingTotal}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={absSearchQuery}
                    onChange={(e) => setAbsSearchQuery(e.target.value)}
                    placeholder="Search by Abstract ID, Reg ID, Title, or Author Name..."
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <select
                  value={absStatusFilter}
                  onChange={(e) => setAbsStatusFilter(e.target.value)}
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="all">All Review Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  value={absTrackFilter}
                  onChange={(e) => setAbsTrackFilter(e.target.value)}
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="all">All Tracks</option>
                  {SCIENTIFIC_TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional View: Registration-Inclusive Roster (for Registered / Not Submitted / Pending All) OR Standard Abstracts Table */}
              {isRegistrationRosterFilterActive ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">
                      Showing {filteredPresentationRosterRows.length} matching presentation{' '}
                      {filteredPresentationRosterRows.length === 1 ? 'participant' : 'participants'} ({activeDashboardFilterLabel[presentationDashboardFilter]})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearPresentationFilter}
                      className="text-purple-700 hover:text-purple-900 font-semibold hover:underline cursor-pointer"
                    >
                      Show All Abstracts Table
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Registration ID</th>
                          <th className="p-3.5">Participant</th>
                          <th className="p-3.5">Registration Opt-In</th>
                          <th className="p-3.5">Payment Status</th>
                          <th className="p-3.5">Abstract Status</th>
                          <th className="p-3.5">Allotted Format</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingData ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              Loading presentation participants...
                            </td>
                          </tr>
                        ) : filteredPresentationRosterRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No participants match the selected presentation filter.
                            </td>
                          </tr>
                        ) : (
                          filteredPresentationRosterRows.map(({ reg, linkedAbs }) => (
                            <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 whitespace-nowrap font-mono font-bold text-purple-700">
                                {reg.registrationId || reg.id}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{reg.fullName}</div>
                                <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                  {reg.email} · {reg.institution}
                                </div>
                                <div className="mt-0.5 text-[10px] font-semibold text-slate-600">
                                  {formatInstitutionCategoryLabel(reg.institutionCategory)}
                                </div>
                              </td>
                              <td className="p-3.5 whitespace-nowrap text-slate-700">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                  {formatRegistrationPresentationPlan(reg)}
                                </span>
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    reg.paymentStatus === 'Verified'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : reg.paymentStatus === 'Rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {reg.paymentStatus}
                                </span>
                              </td>
                              <td className="p-3.5 max-w-xs">
                                {linkedAbs ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-purple-700 text-[11px]">
                                        {linkedAbs.id}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          linkedAbs.status === 'Accepted'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : linkedAbs.status === 'Rejected'
                                            ? 'bg-red-100 text-red-800'
                                            : linkedAbs.status === 'Under Review'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {linkedAbs.status}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 line-clamp-1">
                                      {linkedAbs.title}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                                    Not Submitted
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                {linkedAbs ? (
                                  linkedAbs.allottedPresentationFormat ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                      {linkedAbs.allottedPresentationFormat}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      Pending Allocation
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                                {linkedAbs ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAbs(linkedAbs);
                                      setActionRemarks(linkedAbs.reviewNotes || '');
                                      setAllottedFormatSelection(
                                        linkedAbs.allottedPresentationFormat ||
                                          linkedAbs.finalPresentationFormat ||
                                          ''
                                      );
                                      setAllocationSavedSuccess(false);
                                    }}
                                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px] cursor-pointer"
                                  >
                                    Review Abstract
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReg(reg);
                                      setActionRemarks(reg.adminRemarks || '');
                                    }}
                                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px] cursor-pointer"
                                  >
                                    View Reg
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
              /* Abstracts Table */
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Abstract ID</th>
                        <th className="p-3.5">Linked Reg ID</th>
                        <th className="p-3.5">Payment Status</th>
                        <th className="p-3.5">Title of Abstract</th>
                        <th className="p-3.5">Scientific Track</th>
                        <th className="p-3.5">Preferred Format</th>
                        <th className="p-3.5">Allotted Format</th>
                        <th className="p-3.5">Presenting Author</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingData ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-slate-400">
                            Loading abstracts...
                          </td>
                        </tr>
                      ) : filteredAbstracts.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-slate-400">
                            No matching abstracts found.
                          </td>
                        </tr>
                      ) : (
                        filteredAbstracts.map((abs) => {
                          const author = abs.presentingAuthor || {};
                          const linkedReg = getLinkedRegistrationForAbstract(abs);
                          const paymentStatus = linkedReg?.paymentStatus;
                          return (
                            <tr key={abs.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Abstract ID */}
                              <td className="p-3.5 whitespace-nowrap font-mono font-bold text-purple-700">
                                {abs.id}
                              </td>

                              {/* Registration ID & Linked Institution Classification */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="font-mono font-semibold text-slate-800">
                                  {abs.registrationId}
                                </div>
                                <div
                                  className={`text-[10px] font-semibold mt-0.5 ${
                                    normalizeInstitutionCategory(linkedReg?.institutionCategory) === 'internal'
                                      ? 'text-purple-700'
                                      : normalizeInstitutionCategory(linkedReg?.institutionCategory) === 'external'
                                      ? 'text-cyan-700'
                                      : 'text-amber-700'
                                  }`}
                                  title="Institution category sourced strictly from linked registration"
                                >
                                  {formatInstitutionCategoryLabel(linkedReg?.institutionCategory)}
                                </div>
                              </td>

                              {/* Associated Payment Status (Informational Reference Only) */}
                              <td className="p-3.5 whitespace-nowrap">
                                {paymentStatus ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      paymentStatus === 'Verified'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : paymentStatus === 'Rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                    title="Associated registration payment status (informational)"
                                  >
                                    {paymentStatus}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                    Unknown
                                  </span>
                                )}
                              </td>

                              {/* Title */}
                              <td className="p-3.5 max-w-xs">
                                <div className="font-semibold text-slate-900 line-clamp-2">
                                  {abs.title}
                                </div>
                              </td>

                              {/* Track */}
                              <td className="p-3.5 whitespace-nowrap text-slate-800 font-medium text-xs max-w-[140px] truncate" title={abs.trackId}>
                                {abs.trackId}
                              </td>

                              {/* Preferred Format (Author Selection) */}
                              <td className="p-3.5 whitespace-nowrap text-slate-700 text-xs">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                  {abs.presentationPreference || abs.presentationType || 'None'}
                                </span>
                              </td>

                              {/* Allotted Format (Admin Allocation) */}
                              <td className="p-3.5 whitespace-nowrap">
                                {abs.allottedPresentationFormat ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                    {abs.allottedPresentationFormat}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending Allocation
                                  </span>
                                )}
                              </td>

                              {/* Author */}
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{author.fullName || author.name}</div>
                                <div className="text-[11px] text-slate-400 truncate max-w-xs">{author.email}</div>
                              </td>

                              {/* Status */}
                              <td className="p-3.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    abs.status === 'Accepted'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : abs.status === 'Rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : abs.status === 'Under Review'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {abs.status}
                                </span>
                                {(() => {
                                  const subId = getAbstractSubmittedEventId(abs.id);
                                  const accId = getAbstractAcceptedEventId(abs.id);
                                  const subLog = emailLogMap.get(subId);
                                  const accLog = emailLogMap.get(accId);
                                  const subStatus = normalizeLogStatus(subLog);
                                  const accStatus = normalizeLogStatus(accLog);

                                  return (
                                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[9.5px]">
                                      <span
                                        className={`px-1.5 py-0.5 rounded font-semibold ${
                                          subStatus === 'Sent'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : subStatus === 'Failed'
                                            ? 'bg-red-50 text-red-700 border border-red-200'
                                            : subStatus === 'Pending'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-slate-50 text-slate-400 border border-slate-200'
                                        }`}
                                        title={subLog?.error || `Abstract Submission Email: ${subStatus}`}
                                      >
                                        Sub: {subStatus}
                                      </span>
                                      {subStatus === 'Failed' && (
                                        <button
                                          type="button"
                                          disabled={retryingEmailEventId === subId}
                                          onClick={() =>
                                            handleRetryOrSendEmail({
                                              eventId: subId,
                                              eventType: 'abstract_confirmation',
                                              registration: linkedReg,
                                              abstract: abs,
                                            })
                                          }
                                          className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-50"
                                        >
                                          {retryingEmailEventId === subId ? '...' : 'Retry'}
                                        </button>
                                      )}
                                      {(abs.status === 'Accepted' || accLog) && (
                                        <>
                                          <span
                                            className={`px-1.5 py-0.5 rounded font-semibold ${
                                              accStatus === 'Sent'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : accStatus === 'Failed'
                                                ? 'bg-red-50 text-red-700 border border-red-200'
                                                : accStatus === 'Pending'
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : 'bg-slate-50 text-slate-400 border border-slate-200'
                                            }`}
                                            title={accLog?.error || `Abstract Acceptance Email: ${accStatus}`}
                                          >
                                            Acc: {accStatus}
                                          </span>
                                          {(accStatus === 'Failed' || (abs.status === 'Accepted' && accStatus === 'Not Sent')) && (
                                            <button
                                              type="button"
                                              disabled={retryingEmailEventId === accId}
                                              onClick={() =>
                                                handleRetryOrSendEmail({
                                                  eventId: accId,
                                                  eventType: 'abstract_acceptance',
                                                  registration: linkedReg,
                                                  abstract: abs,
                                                })
                                              }
                                              className="px-1.5 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer disabled:opacity-50"
                                            >
                                              {retryingEmailEventId === accId
                                                ? '...'
                                                : accStatus === 'Failed'
                                                ? 'Retry'
                                                : 'Send'}
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* Type */}
                              <td className="p-3.5 whitespace-nowrap">
                                <button
                                  onClick={() => toggleRecordType('abstractSubmissions', abs.id, abs.recordType)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                    abs.recordType === 'test'
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                  title="Click to toggle Test/Live tag"
                                >
                                  {(abs.recordType || 'live').toUpperCase()}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openPdfPreview({
                                      title: 'Abstract Submission Acknowledgement PDF',
                                      subtitle: `${abs.id} · ${abs.presentingAuthor?.fullName || abs.presentingAuthor?.name || ''}`,
                                      build: () => createAbstractSubmissionAckPreviewUrl(abs, linkedReg),
                                      onDownload: () => generateSubmissionReceiptPDF(abs, linkedReg),
                                    })
                                  }
                                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  title="Preview Abstract Submission Acknowledgement PDF"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Ack</span>
                                </button>

                                {abs.status === 'Accepted' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openPdfPreview({
                                          title: 'Abstract Acceptance Letter PDF',
                                          subtitle: `${abs.id} · ${abs.presentingAuthor?.fullName || abs.presentingAuthor?.name || ''}`,
                                          build: () => createAbstractAcceptanceLetterPreviewUrl(abs, linkedReg),
                                          onDownload: () => generateAcceptanceLetterPDF(abs, linkedReg),
                                        })
                                      }
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                      title="Preview Acceptance Letter (PDF)"
                                    >
                                      <Award className="w-3 h-3" />
                                      <span>Letter</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => generateAcceptanceLetterPDF(abs, linkedReg)}
                                      className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center"
                                      title="Download Acceptance Letter (PDF)"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedAbs(abs);
                                    setActionRemarks(abs.reviewNotes || '');
                                    setAllottedFormatSelection(abs.allottedPresentationFormat || abs.finalPresentationFormat || '');
                                    setAllocationSavedSuccess(false);
                                  }}
                                  className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px] cursor-pointer"
                                >
                                  Review
                                </button>

                                <button
                                  onClick={() => setAbsToDelete(abs)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer inline-flex items-center"
                                  title="Delete Abstract (Unlinks Registration)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* MODULE 4: PARTICIPANT SEARCH (UNIFIED LOOKUP) */}
          {/* ================================================================= */}
          {activeTab === 'search' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Unified Participant Search
                </h2>
                <p className="text-xs text-slate-500">
                  Search across Registration and Abstract records simultaneously to inspect linked delegate dossiers.
                </p>
              </div>

              {/* Search Input Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3.5 top-3 text-purple-600" />
                  <input
                    type="text"
                    value={unifiedSearchQuery}
                    onChange={(e) => setUnifiedSearchQuery(e.target.value)}
                    placeholder="Enter Delegate Name, Email, Registration ID (e.g. AICONDD001) or Abstract ID..."
                    className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-400"
                  />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Try searching:</span>
                  <button
                    onClick={() => setUnifiedSearchQuery('AICONDD')}
                    className="text-purple-600 hover:underline cursor-pointer"
                  >
                    AICONDD
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setUnifiedSearchQuery('srmist.edu.in')}
                    className="text-purple-600 hover:underline cursor-pointer"
                  >
                    @srmist.edu.in
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {unifiedSearchQuery && unifiedSearchResults.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No participants found matching "{unifiedSearchQuery}".
                  </div>
                ) : (
                  unifiedSearchResults.map((reg) => {
                    const linkedAbs = abstracts.find(
                      (a) => a.registrationId === reg.registrationId || a.id === reg.linkedAbstractId
                    );

                    return (
                      <div
                        key={reg.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-5 space-y-4"
                      >
                        {/* Top bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                              {reg.registrationId || reg.id}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Doc Ref: {reg.id}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase self-start sm:self-auto ${
                              reg.paymentStatus === 'Verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : reg.paymentStatus === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Payment: {reg.paymentStatus}
                          </span>
                        </div>

                        {/* Two Columns: Registration & Abstract */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left: Registration Details */}
                          <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100 text-xs">
                            <div className="font-bold text-slate-900 text-sm">{reg.fullName}</div>
                            <div className="text-slate-600">{reg.email} · {reg.mobile}</div>
                            <div className="text-slate-600">{reg.institution}</div>
                            <div className="text-slate-500 pt-1">
                              <strong>Category:</strong> {reg.category} | <strong>Mode:</strong> {reg.participationMode}
                            </div>
                            <div className="text-slate-500 flex flex-wrap items-center justify-between gap-1">
                              <div>
                                <strong>Fee:</strong> ₹{reg.paymentAmount || reg.amount || 2000} | <strong>UTR:</strong> {reg.transactionReference}
                              </div>
                              <button
                                type="button"
                                onClick={() => setPreviewProofReg(reg)}
                                className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Proof</span>
                              </button>
                            </div>
                            <div className="text-slate-500">
                              <strong>Food Preference:</strong> {formatFoodPreferenceDisplay(reg)}
                            </div>
                            <div className="pt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openPdfPreview({
                                    title: 'Registration Receipt PDF',
                                    subtitle: `${reg.registrationId || reg.id} · ${reg.fullName}`,
                                    build: () => createRegistrationSubmissionReceiptPreviewUrl(reg),
                                    onDownload: () => generateRegistrationSubmissionReceiptPDF(reg),
                                  })
                                }
                                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview Receipt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => generateRegistrationSubmissionReceiptPDF(reg)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Receipt PDF</span>
                              </button>

                              {reg.paymentStatus === 'Verified' && reg.registrationStatus === 'Approved' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openPdfPreview({
                                        title: 'Registration Confirmation PDF',
                                        subtitle: `${reg.registrationId || reg.id} · ${reg.fullName}`,
                                        build: () => createRegistrationConfirmationPreviewUrl(reg),
                                        onDownload: () => generateRegistrationReceiptPDF(reg),
                                      })
                                    }
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Preview Confirmation PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => generateRegistrationReceiptPDF(reg)}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download PDF</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: Linked Abstract */}
                          <div className="space-y-2 bg-purple-50/40 p-3.5 rounded-lg border border-purple-100 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">
                                Linked Scientific Abstract
                              </span>
                              {linkedAbs && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    linkedAbs.status === 'Accepted'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {linkedAbs.status}
                                </span>
                              )}
                            </div>

                            {linkedAbs ? (
                              <div className="space-y-1.5">
                                <div className="font-mono font-bold text-purple-700">
                                  {linkedAbs.id}
                                </div>
                                <div className="font-semibold text-slate-900 line-clamp-2">
                                  {linkedAbs.title}
                                </div>
                                <div className="text-slate-600">
                                  <strong>Track:</strong> {linkedAbs.trackId}
                                </div>
                                <div className="text-slate-600 flex items-center gap-2">
                                  <span><strong>Preferred:</strong> {linkedAbs.presentationPreference || 'None'}</span>
                                  <span>·</span>
                                  <span>
                                    <strong>Allotted:</strong>{' '}
                                    <span className={linkedAbs.allottedPresentationFormat ? 'text-purple-700 font-bold' : 'text-amber-700'}>
                                      {linkedAbs.allottedPresentationFormat || 'Pending Allocation'}
                                    </span>
                                  </span>
                                </div>
                                <div className="pt-2 flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openPdfPreview({
                                        title: 'Abstract Submission Acknowledgement PDF',
                                        subtitle: `${linkedAbs.id} · ${reg.fullName}`,
                                        build: () => createAbstractSubmissionAckPreviewUrl(linkedAbs, reg),
                                        onDownload: () => generateSubmissionReceiptPDF(linkedAbs, reg),
                                      })
                                    }
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Preview Ack PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => generateSubmissionReceiptPDF(linkedAbs, reg)}
                                    className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Ack PDF</span>
                                  </button>
                                  {linkedAbs.status === 'Accepted' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openPdfPreview({
                                            title: 'Abstract Acceptance Letter PDF',
                                            subtitle: `${linkedAbs.id} · ${reg.fullName}`,
                                            build: () => createAbstractAcceptanceLetterPreviewUrl(linkedAbs, reg),
                                            onDownload: () => generateAcceptanceLetterPDF(linkedAbs, reg),
                                          })
                                        }
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Award className="w-3 h-3" />
                                        <span>Preview Letter</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => generateAcceptanceLetterPDF(linkedAbs, reg)}
                                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Letter PDF</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 py-3 text-center">
                                No abstract submitted yet for this Registration ID.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODULE 5: REPORTS & EXCEL EXPORT */}
          {/* ================================================================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Reports & Excel Export
                </h2>
                <p className="text-xs text-slate-500">
                  Export conference dossiers directly into formatted Excel (.xlsx) workbooks for scientific and administrative review.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Export 1: All Registrations */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Registration Dossier (.xlsx)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Complete participant directory including Registration IDs, categories, phone, email, fee, UTR codes, dietary preferences, and verification status.
                    </p>
                  </div>
                  <button
                    onClick={() => exportRegistrationsToExcel(visibleRegistrations)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Registrations ({visibleRegistrations.length})</span>
                  </button>
                </div>

                {/* Export 2: All Abstracts */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Abstract Submissions (.xlsx)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      All scientific papers with AICONDD-ABS-xxx IDs, linked Registration IDs, titles, author metadata, co-authors, keywords, tracks, and review evaluations.
                    </p>
                  </div>
                  <button
                    onClick={() => exportAbstractsToExcel(visibleAbstracts, 'AICONDD_Abstract_Submissions_2027.xlsx', registrations)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Abstracts ({visibleAbstracts.length})</span>
                  </button>
                </div>

                {/* Export 3: Master Linked Participant Report */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Master Participant List (.xlsx)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Unified workbook mapping each Registration ID to its payment verification status, corresponding Abstract ID, and review outcome.
                    </p>
                  </div>
                  <button
                    onClick={() => exportMasterParticipantsToExcel(visibleRegistrations, visibleAbstracts)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Master Workbook</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODULE 6: ACCOMMODATION & PLACES TO VISIT MANAGEMENT */}
          {/* ================================================================= */}
          {activeTab === 'hospitality' && (
            <AdminHospitalityManager
              adminEmail={user?.email || 'org.secy.cp@srmist.edu.in'}
              onStatusMessage={(msg) => setActionSuccessMsg(msg)}
            />
          )}

          {/* ================================================================= */}
          {/* MODULE 7: DATABASE BACKUP & RECOVERY */}
          {/* ================================================================= */}
          {activeTab === 'backup' && (
            <AdminBackupManager
              user={user}
              onStatusMessage={(msg) => setActionSuccessMsg(msg)}
            />
          )}

          {/* ================================================================= */}
          {/* MODULE 8: ACCOUNT SETTINGS */}
          {/* ================================================================= */}
          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Account Settings & Security
                </h2>
                <p className="text-xs text-slate-500">
                  Organising Secretary credentials, password updates, and system environment info.
                </p>
              </div>

              {/* Profile Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
                <div className="font-bold text-slate-900 text-sm">Organising Secretary Profile</div>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Name</span>
                    <strong className="text-slate-800">Dr. N. Damodharan</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Designation</span>
                    <strong className="text-slate-800">Organising Secretary · Vice Principal</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Institution</span>
                    <strong className="text-slate-800">SRM College of Pharmacy, SRMIST</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Username / Email</span>
                    <strong className="text-slate-800 font-mono">org.secy.cp@srmist.edu.in</strong>
                  </div>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Change Org. Secretary Password
                </h3>

                {passwordChangeMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      passwordChangeMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {passwordChangeMsg.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{passwordChangeMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: REGISTRATION SCRUTINY & VERIFICATION */}
      {/* ===================================================================== */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-[#0B112C] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-300 font-mono tracking-wider">
                  Registration Scrutiny
                </span>
                <h3 className="text-base font-bold font-heading">
                  {selectedReg.fullName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* ID Status Banner */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-purple-700 font-bold block">
                    Official Registration ID
                  </span>
                  <span className="font-mono font-bold text-sm text-purple-900">
                    {selectedReg.registrationId || 'Pending ID (Legacy record)'}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  Ref: {selectedReg.id}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Email</span>
                  <strong className="text-slate-800">{selectedReg.email}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Mobile</span>
                  <strong className="text-slate-800">{selectedReg.mobile}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Institution</span>
                  <strong className="text-slate-800">{selectedReg.institution}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                    Institution Category
                  </span>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <strong className="text-slate-800">
                      {formatInstitutionCategoryLabel(selectedReg.institutionCategory)}
                    </strong>
                    <select
                      aria-label="Update institution category"
                      value={normalizeInstitutionCategory(selectedReg.institutionCategory) || ''}
                      disabled={updatingInstCatId === selectedReg.id}
                      onChange={(e) => {
                        const val = e.target.value as InstitutionCategoryValue | '';
                        if (val === 'internal' || val === 'external') {
                          handleUpdateRegistrationInstitutionCategory(selectedReg, val);
                        }
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-700 font-semibold outline-none cursor-pointer"
                    >
                      {!normalizeInstitutionCategory(selectedReg.institutionCategory) && (
                        <option value="">Assign...</option>
                      )}
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Category</span>
                  <strong className="text-slate-800">{selectedReg.category}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Designation</span>
                  <strong className="text-slate-800">{selectedReg.courseOrDesignation || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Food Preference</span>
                  <strong className="text-slate-800">{formatFoodPreferenceDisplay(selectedReg)}</strong>
                </div>
              </div>

              {/* Payment Section */}
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-900 block">
                  Payment Transaction Data
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Fee Amount</span>
                    <strong className="font-mono text-sm text-slate-900">₹{selectedReg.paymentAmount || selectedReg.amount || 2000}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Transaction Reference (UTR)</span>
                    <strong className="font-mono text-sm text-purple-900">{selectedReg.transactionReference}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Proof Receipt</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="truncate block font-mono text-slate-700 text-xs max-w-[120px]">
                        {selectedReg.paymentProofName || 'Attached receipt'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewProofReg(selectedReg)}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Proof</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Notification Status Panel */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>Email Notification Status</span>
                </div>
                {(() => {
                  const regKey = (selectedReg.registrationId || selectedReg.id || '').trim().toUpperCase();
                  const doneId = getRegistrationReceivedEventId(regKey);
                  const confId = getRegistrationConfirmedEventId(regKey);
                  const doneLog = emailLogMap.get(doneId);
                  const confLog = emailLogMap.get(confId);
                  const doneStatus = normalizeLogStatus(doneLog);
                  const confStatus = normalizeLogStatus(confLog);
                  const isVerified =
                    selectedReg.paymentStatus === 'Verified' && selectedReg.registrationStatus === 'Approved';

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800">Registration Done Email</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              doneStatus === 'Sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : doneStatus === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : doneStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {doneStatus}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {doneLog?.sentAt
                            ? `Sent: ${new Date(doneLog.sentAt).toLocaleString('en-IN')}`
                            : doneLog?.error
                            ? `Error: ${doneLog.error}`
                            : 'Queued automatically upon submission'}
                        </div>
                        {doneStatus !== 'Sent' && (
                          <button
                            type="button"
                            disabled={retryingEmailEventId === doneId}
                            onClick={() =>
                              handleRetryOrSendEmail({
                                eventId: doneId,
                                eventType: 'registration_received',
                                registration: selectedReg,
                              })
                            }
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingEmailEventId === doneId ? 'animate-spin' : ''}`} />
                            <span>{doneStatus === 'Failed' ? 'Retry Email' : 'Send Email'}</span>
                          </button>
                        )}
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800">Registration Confirmation (+ PDF)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              confStatus === 'Sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : confStatus === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : confStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {confStatus}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {confLog?.sentAt
                            ? `Sent: ${new Date(confLog.sentAt).toLocaleString('en-IN')}`
                            : confLog?.error
                            ? `Error: ${confLog.error}`
                            : isVerified
                            ? 'Eligible for confirmation dispatch'
                            : 'Sent automatically after payment verification'}
                        </div>
                        {isVerified && confStatus !== 'Sent' && (
                          <button
                            type="button"
                            disabled={retryingEmailEventId === confId}
                            onClick={() =>
                              handleRetryOrSendEmail({
                                eventId: confId,
                                eventType: 'registration_confirmation',
                                registration: selectedReg,
                              })
                            }
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingEmailEventId === confId ? 'animate-spin' : ''}`} />
                            <span>{confStatus === 'Failed' ? 'Retry Email' : 'Send Confirmation Email'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Remarks textarea */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px] uppercase">
                  Org. Secretary Audit Remarks
                </label>
                <textarea
                  rows={2}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Enter remarks (e.g. UTR verified against bank portal)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500"
                />
              </div>

              {/* Official Institutional Document Actions */}
              <div className="space-y-2.5">
                {/* 1. Initial Registration Receipt PDF (Always available for admin record-keeping) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 block">
                      Registration Receipt PDF (Initial Submission)
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Available immediately for record-keeping while payment verification is pending or completed.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openPdfPreview({
                          title: 'Registration Receipt PDF',
                          subtitle: `${selectedReg.registrationId || selectedReg.id} · ${selectedReg.fullName}`,
                          build: () => createRegistrationSubmissionReceiptPreviewUrl(selectedReg),
                          onDownload: () => generateRegistrationSubmissionReceiptPDF(selectedReg),
                        })
                      }
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => generateRegistrationSubmissionReceiptPDF(selectedReg)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Receipt</span>
                    </button>
                  </div>
                </div>

                {/* 2. Official Registration Confirmation PDF (Verified & Approved Only) */}
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 block">
                      Official Registration Confirmation PDF
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {selectedReg.paymentStatus === 'Verified' && selectedReg.registrationStatus === 'Approved'
                        ? 'Registration is verified and approved. Preview or download the confirmation document.'
                        : 'Locked until payment is Verified and registration status is Approved.'}
                    </span>
                  </div>
                  {selectedReg.paymentStatus === 'Verified' && selectedReg.registrationStatus === 'Approved' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openPdfPreview({
                            title: 'Registration Confirmation PDF',
                            subtitle: `${selectedReg.registrationId || selectedReg.id} · ${selectedReg.fullName}`,
                            build: () => createRegistrationConfirmationPreviewUrl(selectedReg),
                            onDownload: () => generateRegistrationReceiptPDF(selectedReg),
                          })
                        }
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => generateRegistrationReceiptPDF(selectedReg)}
                        className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                      Verification Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    disabled={processingAction}
                    onClick={() => handleVerifyPayment(selectedReg)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{selectedReg.registrationId?.startsWith('AICONDD') ? 'Verify Payment' : 'Verify & Allocate AICONDD ID'}</span>
                  </button>

                  <button
                    disabled={processingAction}
                    onClick={() => handleRejectPayment(selectedReg)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedReg(null)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: ABSTRACT SCRUTINY & STATUS UPDATE */}
      {/* ===================================================================== */}
      {selectedAbs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-[#0B112C] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-300 font-mono tracking-wider">
                  Abstract Evaluation · {selectedAbs.id}
                </span>
                <h3 className="text-base font-bold font-heading line-clamp-1">
                  {selectedAbs.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAbs(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Registration ID</span>
                  <strong className="text-purple-700 font-mono font-bold">{selectedAbs.registrationId}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Track</span>
                  <strong className="text-slate-800">{selectedAbs.trackId}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Mode</span>
                  <strong className="text-slate-800">{selectedAbs.presentationPreference}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Presenting Author</span>
                  <strong className="text-slate-800">{selectedAbs.presentingAuthor?.fullName || selectedAbs.presentingAuthor?.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Email</span>
                  <strong className="text-slate-800">{selectedAbs.presentingAuthor?.email}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Current Status</span>
                  <span className="font-bold text-purple-700">{selectedAbs.status}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                    Institution Category (via Reg ID)
                  </span>
                  {(() => {
                    const linkedReg = getLinkedRegistrationForAbstract(selectedAbs);
                    const instCat = normalizeInstitutionCategory(linkedReg?.institutionCategory);
                    return (
                      <strong
                        className={
                          instCat === 'internal'
                            ? 'text-purple-700'
                            : instCat === 'external'
                            ? 'text-cyan-700'
                            : 'text-amber-700'
                        }
                      >
                        {formatInstitutionCategoryLabel(linkedReg?.institutionCategory)}
                      </strong>
                    );
                  })()}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Associated Payment Status</span>
                  {(() => {
                    const linkedReg = getLinkedRegistrationForAbstract(selectedAbs);
                    const pStatus = linkedReg?.paymentStatus;
                    if (!pStatus) {
                      return <span className="text-slate-500 font-semibold">Unknown</span>;
                    }
                    return (
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          pStatus === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pStatus === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {pStatus}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Abstract Body */}
              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[11px] uppercase block">
                  Abstract Text
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {typeof selectedAbs.abstractContent === 'string'
                    ? selectedAbs.abstractContent
                    : selectedAbs.abstractContent?.text || 'No text content available'}
                </div>
              </div>

              {/* Presentation Format Allocation Section */}
              <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                      Presentation Format Allocation
                    </span>
                  </div>
                  {selectedAbs.allottedPresentationFormat ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                      Allotted: {selectedAbs.allottedPresentationFormat}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      Pending Allocation
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Field A: Participant's Preferred Presentation Format (Read-only) */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                      A. Author's Preferred Format (Read-Only)
                    </span>
                    <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span>{selectedAbs.presentationPreference || selectedAbs.presentationType || 'Not Specified'}</span>
                    </div>
                  </div>

                  {/* Field B: Final Allotted Presentation Format (Dropdown) */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <label className="text-[10px] uppercase text-purple-700 font-bold block mb-1">
                      B. Final Allotted Presentation Format
                    </label>
                    <select
                      value={allottedFormatSelection}
                      onChange={(e) => {
                        setAllottedFormatSelection(e.target.value);
                        setAllocationSavedSuccess(false);
                      }}
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-600"
                    >
                      <option value="">-- Select Final Allotted Format --</option>
                      <option value="Oral Presentation">Oral Presentation</option>
                      <option value="Poster Presentation">Poster Presentation</option>
                      <option value="E-Poster Presentation">E-Poster Presentation</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[11px]">
                    {allocationSavedSuccess && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Allotted format saved successfully!
                      </span>
                    )}
                    {selectedAbs.allottedAt && !allocationSavedSuccess && (
                      <span className="text-slate-500 text-[10px]">
                        Last allocated: {new Date(selectedAbs.allottedAt).toLocaleDateString('en-GB')} by {selectedAbs.allottedBy || 'Org. Secretary'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={savingAllocation || !allottedFormatSelection}
                    onClick={handleSavePresentationAllocation}
                    className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {savingAllocation ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Allocation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Email Notification Status Panel */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>Abstract Email Notification Status</span>
                </div>
                {(() => {
                  const subId = getAbstractSubmittedEventId(selectedAbs.id);
                  const accId = getAbstractAcceptedEventId(selectedAbs.id);
                  const subLog = emailLogMap.get(subId);
                  const accLog = emailLogMap.get(accId);
                  const subStatus = normalizeLogStatus(subLog);
                  const accStatus = normalizeLogStatus(accLog);
                  const linkedReg = getLinkedRegistrationForAbstract(selectedAbs);
                  const isAccepted = selectedAbs.status === 'Accepted';

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800">Submission Ack (+ PDF)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              subStatus === 'Sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : subStatus === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : subStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {subStatus}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {subLog?.sentAt
                            ? `Sent: ${new Date(subLog.sentAt).toLocaleString('en-IN')}`
                            : subLog?.error
                            ? `Error: ${subLog.error}`
                            : 'Sent automatically upon abstract submission'}
                        </div>
                        {subStatus !== 'Sent' && (
                          <button
                            type="button"
                            disabled={retryingEmailEventId === subId}
                            onClick={() =>
                              handleRetryOrSendEmail({
                                eventId: subId,
                                eventType: 'abstract_confirmation',
                                registration: linkedReg,
                                abstract: selectedAbs,
                              })
                            }
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingEmailEventId === subId ? 'animate-spin' : ''}`} />
                            <span>{subStatus === 'Failed' ? 'Retry Email' : 'Send Email'}</span>
                          </button>
                        )}
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800">Abstract Acceptance Email</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              accStatus === 'Sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : accStatus === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : accStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {accStatus}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {accLog?.sentAt
                            ? `Sent: ${new Date(accLog.sentAt).toLocaleString('en-IN')}`
                            : accLog?.error
                            ? `Error: ${accLog.error}`
                            : isAccepted
                            ? 'Eligible for acceptance notification'
                            : 'Sent only when abstract status is Accepted'}
                        </div>
                        {isAccepted && accStatus !== 'Sent' && (
                          <button
                            type="button"
                            disabled={retryingEmailEventId === accId}
                            onClick={() =>
                              handleRetryOrSendEmail({
                                eventId: accId,
                                eventType: 'abstract_acceptance',
                                registration: linkedReg,
                                abstract: selectedAbs,
                              })
                            }
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingEmailEventId === accId ? 'animate-spin' : ''}`} />
                            <span>{accStatus === 'Failed' ? 'Retry Email' : 'Send Acceptance Email'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Review notes input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px] uppercase">
                  Reviewer Notes / Feedback
                </label>
                <textarea
                  rows={2}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Enter evaluation remarks for acceptance letter or feedback..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500"
                />
              </div>

              {/* Status Update Buttons */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={processingAction}
                    onClick={() => handleUpdateAbstractStatus('Accepted')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>

                  <button
                    disabled={processingAction}
                    onClick={() => handleUpdateAbstractStatus('Under Review')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark Under Review</span>
                  </button>

                  <button
                    disabled={processingAction}
                    onClick={() => handleUpdateAbstractStatus('Rejected')}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const linkedReg = getLinkedRegistrationForAbstract(selectedAbs);
                      openPdfPreview({
                        title: 'Abstract Submission Acknowledgement PDF',
                        subtitle: `${selectedAbs.id} · ${selectedAbs.presentingAuthor?.fullName || selectedAbs.presentingAuthor?.name || ''}`,
                        build: () => createAbstractSubmissionAckPreviewUrl(selectedAbs, linkedReg),
                        onDownload: () => generateSubmissionReceiptPDF(selectedAbs, linkedReg),
                      });
                    }}
                    className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Ack</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const linkedReg = getLinkedRegistrationForAbstract(selectedAbs);
                      generateSubmissionReceiptPDF(selectedAbs, linkedReg);
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ack PDF</span>
                  </button>

                  {selectedAbs.status === 'Accepted' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const linkedReg = getLinkedRegistrationForAbstract(selectedAbs);
                          openPdfPreview({
                            title: 'Abstract Acceptance Letter PDF',
                            subtitle: `${selectedAbs.id} · ${selectedAbs.presentingAuthor?.fullName || selectedAbs.presentingAuthor?.name || ''}`,
                            build: () => createAbstractAcceptanceLetterPreviewUrl(selectedAbs, linkedReg),
                            onDownload: () => generateAcceptanceLetterPDF(selectedAbs, linkedReg),
                          });
                        }}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Preview Letter</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const linkedReg = getLinkedRegistrationForAbstract(selectedAbs);
                          generateAcceptanceLetterPDF(selectedAbs, linkedReg);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Letter PDF</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PAYMENT PROOF ATTACHMENT VIEWER */}
      {/* ===================================================================== */}
      {previewProofReg && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-[#0B112C] text-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-cyan-300 font-mono tracking-wider">
                    Payment Proof Verification
                  </span>
                  <span className="font-mono text-[11px] font-bold text-purple-200 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/40">
                    {previewProofReg.registrationId || previewProofReg.id}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold font-heading line-clamp-1">
                  {previewProofReg.fullName} · {previewProofReg.institution}
                </h3>
              </div>
              <button
                onClick={() => setPreviewProofReg(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subheader Metadata Strip */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Transaction Ref (UTR)</span>
                <strong className="font-mono text-purple-900 text-xs break-all">{previewProofReg.transactionReference}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Registration Fee</span>
                <strong className="font-mono text-slate-900 text-xs">₹{previewProofReg.paymentAmount || previewProofReg.amount || 2000}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Attachment Name</span>
                <span className="truncate block font-mono text-slate-700 text-[11px]" title={previewProofReg.paymentProofName || 'Receipt file'}>
                  {previewProofReg.paymentProofName || 'Receipt file'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Payment Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    previewProofReg.paymentStatus === 'Verified'
                      ? 'bg-emerald-100 text-emerald-800'
                      : previewProofReg.paymentStatus === 'Rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {previewProofReg.paymentStatus}
                </span>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-center">
              {(() => {
                const proofData = previewProofReg.paymentProofData || previewProofReg.paymentProofUrl;
                const hasValid = isProofValid(previewProofReg) && !!proofData;

                if (!hasValid || !proofData) {
                  return (
                    <div className="p-6 bg-amber-50/80 rounded-xl border border-amber-200 text-center space-y-3 max-w-lg mx-auto my-auto">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-amber-900">
                          Payment Proof Attachment Unavailable
                        </h4>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {!proofData
                            ? 'No payment proof file was attached to this registration record.'
                            : proofData.includes('...[secured]')
                            ? 'This registration was submitted in an earlier test session where proof data was saved in a truncated placeholder format.'
                            : 'Payment proof not uploaded or storage reference unavailable.'}
                        </p>
                      </div>
                      <div className="p-3 bg-white/90 rounded-lg border border-amber-200/70 text-left text-xs space-y-1 text-slate-600">
                        <div><strong>Participant:</strong> {previewProofReg.fullName} ({previewProofReg.email})</div>
                        <div><strong>Transaction UTR:</strong> <span className="font-mono text-purple-900 font-bold">{previewProofReg.transactionReference}</span></div>
                        <div><strong>Fee Amount:</strong> ₹{previewProofReg.paymentAmount || previewProofReg.amount || 2000}</div>
                        <div><strong>File Reference:</strong> {previewProofReg.paymentProofName || 'None recorded'}</div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        Tip: You may audit the transaction in your bank portal using the UTR reference above or contact the participant directly.
                      </p>
                    </div>
                  );
                }

                const isPdf =
                  proofData.startsWith('data:application/pdf') ||
                  (previewProofReg.paymentProofName &&
                    previewProofReg.paymentProofName.toLowerCase().endsWith('.pdf'));

                if (isPdf) {
                  return (
                    <div className="w-full h-[55vh] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <iframe
                        src={proofData}
                        title={`Payment Proof PDF - ${previewProofReg.transactionReference}`}
                        className="w-full h-full border-0"
                      />
                    </div>
                  );
                }

                return (
                  <div className="flex items-center justify-center p-3 bg-slate-100/80 rounded-xl border border-slate-200 overflow-auto max-h-[60vh]">
                    <img
                      src={proofData}
                      alt={`Payment Proof Receipt - ${previewProofReg.transactionReference}`}
                      className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-sm"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {isProofValid(previewProofReg) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadProof(previewProofReg)}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenProofNewTab(previewProofReg)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in New Tab</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {previewProofReg.paymentStatus !== 'Verified' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewProofReg;
                      setPreviewProofReg(null);
                      handleVerifyPayment(target);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Payment</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewProofReg(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: DELETE REGISTRATION CONFIRMATION */}
      {/* ===================================================================== */}
      {regToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Delete Registration Record?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete the registration for <strong>{regToDelete.fullName}</strong> ({regToDelete.registrationId || regToDelete.id})?
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
              <p>
                <strong>Notice:</strong> The sequential sequence counter will <strong>never</strong> be decremented or reused.
              </p>
              {regToDelete.linkedAbstractId && (
                <div className="pt-2 text-amber-800">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={deleteBothLinked}
                      onChange={(e) => setDeleteBothLinked(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Also delete linked Abstract ({regToDelete.linkedAbstractId})</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRegToDelete(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={processingAction}
                onClick={confirmDeleteRegistration}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: DELETE ABSTRACT CONFIRMATION */}
      {/* ===================================================================== */}
      {absToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Delete Abstract Submission?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Delete abstract <strong>{absToDelete.id}</strong> ("{absToDelete.title}")?
              </p>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 leading-relaxed">
              <strong>Automatic Unlinking:</strong> The linked registration ({absToDelete.registrationId}) will be unlinked and reset to allow the delegate to submit a fresh replacement abstract.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAbsToDelete(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={processingAction}
                onClick={confirmDeleteAbstract}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================================== */}
      {/* MODAL 5: OFFICIAL PDF DOCUMENT PREVIEWER */}
      {/* ===================================================================== */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col h-[90vh]">
            <div className="p-4 sm:p-5 bg-[#0B112C] text-white flex items-center justify-between shrink-0 gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-cyan-300 font-mono tracking-wider block">
                  Institutional PDF Preview
                </span>
                <h3 className="text-sm sm:text-base font-bold font-heading truncate">
                  {pdfPreview.title}
                </h3>
                <p className="text-xs text-slate-300 truncate">{pdfPreview.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={pdfPreview.onDownload}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={closePdfPreview}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-3 sm:p-4 overflow-hidden">
              <iframe
                src={pdfPreview.url}
                title={pdfPreview.title}
                className="w-full h-full rounded-xl border border-slate-300 bg-white shadow-inner"
              />
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-mono truncate">{pdfPreview.filename}</span>
              <button
                type="button"
                onClick={closePdfPreview}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
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
  Printer,
} from 'lucide-react';
import {
  RegistrationRecord,
  AbstractRecord,
  verifyPaymentAndAllocateRegId,
  deleteAbstractRecord,
  deleteRegistrationRecord,
  exportRegistrationsToExcel,
  exportAbstractsToExcel,
  exportMasterParticipantsToExcel,
  generateAcceptanceLetterPDF,
} from '../lib/managementService';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';

// Authorized administrator emails
const ADMIN_EMAILS = [
  'org.secy.cp@srmist.edu.in',
  'dean.pharmacy.ktr@srmist.edu.in',
  'akashnara047@gmail.com',
  'narayanj@srmist.edu.in',
];

export const AdminPortal: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // Navigation tabs in Org. Secretary Dashboard
  type DashboardTab =
    | 'overview'
    | 'registrations'
    | 'abstracts'
    | 'search'
    | 'reports'
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
  const [loadingData, setLoadingData] = useState(true);

  // Global Record Type Filter ('all' | 'live' | 'test')
  const [recordTypeFilter, setRecordTypeFilter] = useState<'all' | 'live' | 'test'>('all');

  // Registration Filter & Search states
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');
  const [regCategoryFilter, setRegCategoryFilter] = useState<string>('all');

  // Abstract Filter & Search states
  const [absSearchQuery, setAbsSearchQuery] = useState('');
  const [absStatusFilter, setAbsStatusFilter] = useState<string>('all');
  const [absTrackFilter, setAbsTrackFilter] = useState<string>('all');

  // Unified Participant Search state
  const [unifiedSearchQuery, setUnifiedSearchQuery] = useState('');

  // Modals & Scrutiny
  const [selectedReg, setSelectedReg] = useState<RegistrationRecord | null>(null);
  const [selectedAbs, setSelectedAbs] = useState<AbstractRecord | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Delete Confirmation Modals
  const [regToDelete, setRegToDelete] = useState<RegistrationRecord | null>(null);
  const [absToDelete, setAbsToDelete] = useState<AbstractRecord | null>(null);
  const [deleteBothLinked, setDeleteBothLinked] = useState(true);

  // Settings / Password update
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdminAuth(true);
      } else {
        setIsAdminAuth(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
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

    return () => {
      regUnsub();
      absUnsub();
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
      try {
        await signInWithEmailAndPassword(auth, effectiveEmail, password);
      } catch (signInErr: any) {
        // If user not found and logging in as default org.secy.cp, bootstrap account
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential'
        ) {
          if (effectiveEmail === 'org.secy.cp@srmist.edu.in' && password === 'password123') {
            try {
              await createUserWithEmailAndPassword(auth, effectiveEmail, password);
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
      await signInWithPopup(auth, provider);
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

  // Payment Verification Handler: Generates AICONDDxxx atomically
  const handleVerifyPayment = async (reg: RegistrationRecord) => {
    setProcessingAction(true);
    setActionSuccessMsg(null);
    try {
      const adminIdentity = user?.email || 'org.secy.cp@srmist.edu.in';
      const allocatedId = await verifyPaymentAndAllocateRegId(
        reg.id,
        adminIdentity,
        actionRemarks.trim() || 'Payment verified by Org. Secretary.'
      );

      setActionSuccessMsg(
        `Successfully verified payment for ${reg.fullName}! Allocated Registration ID: ${allocatedId}`
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

  // Abstract Review Status Update
  const handleUpdateAbstractStatus = async (
    targetStatus: 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected'
  ) => {
    if (!selectedAbs) return;
    setProcessingAction(true);
    try {
      const adminIdentity = user?.email || 'org.secy.cp@srmist.edu.in';
      const timestamp = new Date().toISOString();

      await updateDoc(doc(db, 'abstractSubmissions', selectedAbs.id), {
        status: targetStatus,
        reviewNotes: actionRemarks.trim() || `Status updated to ${targetStatus}`,
        reviewedBy: adminIdentity,
        reviewedAt: timestamp,
        updatedAt: timestamp,
      });

      setActionSuccessMsg(`Abstract ${selectedAbs.id} status successfully updated to "${targetStatus}".`);
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

  // Filtered Datasets based on record type
  const filterByRecordType = <T extends { recordType?: string }>(items: T[]) => {
    if (recordTypeFilter === 'all') return items;
    return items.filter((item) => (item.recordType || 'live') === recordTypeFilter);
  };

  const visibleRegistrations = filterByRecordType(registrations);
  const visibleAbstracts = filterByRecordType(abstracts);

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

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Filtered Abstracts Table
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

    return matchesSearch && matchesStatus && matchesTrack;
  });

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

          {/* Quick Info Box */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50/60 rounded-xl p-4 border border-purple-200/60 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-purple-900 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Free Plan Safeguards</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              All sequence allocation, Excel spreadsheets and Acceptance Letters are processed 100% in-browser on the Firebase Spark tier.
            </p>
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
                    <div className="text-[11px] font-semibold text-emerald-800">Verified & Allocated</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-900 mt-1">{verifiedRegs}</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">Official AICONDD IDs</div>
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

              {/* Action shortcut banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Pending Action: {pendingRegs} Registrations awaiting payment verification
                  </h4>
                  <p className="text-xs text-slate-500">
                    Verifying a registration atomically assigns the official sequential Registration ID (e.g., AICONDD001) required for abstract submission.
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
                    Verify participant UTR payments, assign official AICONDD IDs, or manage records.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportRegistrationsToExcel(filteredRegistrations)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Registrations (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
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
                  value={regStatusFilter}
                  onChange={(e) => setRegStatusFilter(e.target.value)}
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Under Verification">Under Verification</option>
                  <option value="Verified">Verified (AICONDD Allocated)</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
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
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            Loading registrations...
                          </td>
                        </tr>
                      ) : filteredRegistrations.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No matching registrations found.
                          </td>
                        </tr>
                      ) : (
                        filteredRegistrations.map((reg) => (
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
                            </td>

                            {/* Category */}
                            <td className="p-3.5 whitespace-nowrap text-slate-600">
                              <div>{reg.category}</div>
                              <div className="text-[10px] text-slate-400">{reg.participationMode}</div>
                            </td>

                            {/* UTR / Fee */}
                            <td className="p-3.5 whitespace-nowrap font-mono">
                              <div className="font-semibold text-slate-800">
                                ₹{reg.paymentAmount || reg.amount || 2500}
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
                              {reg.paymentStatus !== 'Verified' && (
                                <button
                                  onClick={() => handleVerifyPayment(reg)}
                                  disabled={processingAction}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-[11px] cursor-pointer shadow-2xs"
                                  title="Verify payment and allocate official AICONDD ID"
                                >
                                  Verify
                                </button>
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
                        ))
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportAbstractsToExcel(filteredAbstracts)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Abstracts (.xlsx)</span>
                  </button>
                </div>
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

              {/* Abstracts Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Abstract ID</th>
                        <th className="p-3.5">Linked Reg ID</th>
                        <th className="p-3.5">Title of Abstract</th>
                        <th className="p-3.5">Track / Mode</th>
                        <th className="p-3.5">Presenting Author</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingData ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            Loading abstracts...
                          </td>
                        </tr>
                      ) : filteredAbstracts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No matching abstracts found.
                          </td>
                        </tr>
                      ) : (
                        filteredAbstracts.map((abs) => {
                          const author = abs.presentingAuthor || {};
                          return (
                            <tr key={abs.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Abstract ID */}
                              <td className="p-3.5 whitespace-nowrap font-mono font-bold text-purple-700">
                                {abs.id}
                              </td>

                              {/* Registration ID */}
                              <td className="p-3.5 whitespace-nowrap font-mono font-semibold text-slate-800">
                                {abs.registrationId}
                              </td>

                              {/* Title */}
                              <td className="p-3.5 max-w-xs">
                                <div className="font-semibold text-slate-900 line-clamp-2">
                                  {abs.title}
                                </div>
                              </td>

                              {/* Track & Mode */}
                              <td className="p-3.5 whitespace-nowrap text-slate-600">
                                <div className="font-medium text-slate-800">{abs.trackId}</div>
                                <div className="text-[10px] text-slate-400">
                                  {abs.presentationPreference || abs.presentationType}
                                </div>
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
                                {abs.status === 'Accepted' && (
                                  <button
                                    onClick={() => generateAcceptanceLetterPDF(abs)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                    title="Download Acceptance Letter (PDF)"
                                  >
                                    <Award className="w-3 h-3" />
                                    <span>Letter</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedAbs(abs);
                                    setActionRemarks(abs.reviewNotes || '');
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
                              {reg.registrationId || 'Pending Verification'}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Doc Ref: {reg.id}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase self-start sm:self-auto ${
                              reg.paymentStatus === 'Verified'
                                ? 'bg-emerald-100 text-emerald-800'
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
                            <div className="text-slate-500">
                              <strong>Fee:</strong> ₹{reg.paymentAmount || reg.amount || 2500} | <strong>UTR:</strong> {reg.transactionReference}
                            </div>
                            <div className="text-slate-500">
                              <strong>Dietary:</strong> {reg.dietaryPreference || 'Not Specified'}
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
                                  <strong>Track:</strong> {linkedAbs.trackId} | <strong>Mode:</strong> {linkedAbs.presentationPreference}
                                </div>
                                {linkedAbs.status === 'Accepted' && (
                                  <button
                                    onClick={() => generateAcceptanceLetterPDF(linkedAbs, reg)}
                                    className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-[11px] cursor-pointer inline-flex items-center gap-1.5"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Download Acceptance Letter (PDF)</span>
                                  </button>
                                )}
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
                    onClick={() => exportAbstractsToExcel(visibleAbstracts)}
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
                      Unified workbook mapping each verified Registration ID to its corresponding Abstract ID and review outcome.
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
          {/* MODULE 6: ACCOUNT SETTINGS */}
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
                    {selectedReg.registrationId || 'Will be allocated upon payment verification (AICONDDxxx)'}
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
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Category</span>
                  <strong className="text-slate-800">{selectedReg.category}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Designation</span>
                  <strong className="text-slate-800">{selectedReg.courseOrDesignation || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Dietary Preference</span>
                  <strong className="text-slate-800">{selectedReg.dietaryPreference || 'Not Specified'}</strong>
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
                    <strong className="font-mono text-sm text-slate-900">₹{selectedReg.paymentAmount || selectedReg.amount || 2500}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Transaction Reference (UTR)</span>
                    <strong className="font-mono text-sm text-purple-900">{selectedReg.transactionReference}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Proof Receipt</span>
                    <span className="truncate block font-mono text-slate-700">{selectedReg.paymentProofName || 'Attached receipt'}</span>
                  </div>
                </div>
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

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    disabled={processingAction}
                    onClick={() => handleVerifyPayment(selectedReg)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Allocate AICONDD ID</span>
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

                {selectedAbs.status === 'Accepted' && (
                  <button
                    onClick={() => generateAcceptanceLetterPDF(selectedAbs)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>PDF Letter</span>
                  </button>
                )}
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
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Clock,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  FolderOpen,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  BACKUP_PROGRESS_STAGES,
  BackupExecutionResult,
  BackupProgressUpdate,
  DatabaseBackupLogRecord,
  executeFullDatabaseBackup,
  fetchBackupOverviewStats,
  formatBytes,
  triggerBlobDownload,
} from '../lib/backupService';

interface AdminBackupManagerProps {
  user: User | null;
  onStatusMessage?: (msg: string) => void;
}

export const AdminBackupManager: React.FC<AdminBackupManagerProps> = ({
  user,
  onStatusMessage,
}) => {
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [registrationsCount, setRegistrationsCount] = useState(0);
  const [abstractsCount, setAbstractsCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);
  const [history, setHistory] = useState<DatabaseBackupLogRecord[]>([]);

  // Modal & Execution state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [progress, setProgress] = useState<BackupProgressUpdate | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Strictly kept in browser memory for current session only
  const [sessionBackup, setSessionBackup] = useState<BackupExecutionResult | null>(null);

  const loadOverview = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const overview = await fetchBackupOverviewStats();
      setRegistrationsCount(overview.registrationsCount);
      setAbstractsCount(overview.abstractsCount);
      setPaymentsCount(overview.paymentsCount);
      setUploadedFilesCount(overview.uploadedFilesCount);
      setHistory(overview.history);
    } catch (err: any) {
      setStatsError(err?.message || 'Unable to load backup overview metrics.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const latestBackup = history[0] || null;

  const formatDisplayDate = (isoString?: string | null) => {
    if (!isoString) return 'No database backup has been created yet.';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleConfirmAndStartBackup = async () => {
    if (isRunningBackup) return;
    setShowConfirmModal(false);
    setIsRunningBackup(true);
    setFatalError(null);
    setSessionBackup(null);
    setProgress({
      stageIndex: 0,
      stageLabel: BACKUP_PROGRESS_STAGES[0],
      percent: 5,
      detail: 'Preparing full database backup...',
    });

    try {
      const result = await executeFullDatabaseBackup((update) => {
        setProgress(update);
      });
      setSessionBackup(result);

      if (result.manifest.status === 'complete') {
        onStatusMessage?.(`Full database backup created successfully (${result.filename}).`);
      } else {
        onStatusMessage?.(
          `Backup completed with ${result.manifest.errors.length} missing/failed item(s). Review warnings before archiving.`
        );
      }

      // Refresh live overview and history table
      await loadOverview();
    } catch (err: any) {
      setFatalError(
        err?.message || 'Database backup failed unexpectedly. Please check your connection and try again.'
      );
      setProgress(null);
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!sessionBackup) return;
    triggerBlobDownload(sessionBackup.blob, sessionBackup.filename);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Database Backup &amp; Recovery
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold uppercase tracking-wide">
              Manual Archive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create a complete, portable ZIP backup of conference Firestore collections and uploaded participant documents for offline or manual Google Drive archival.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadOverview}
            disabled={loadingStats || isRunningBackup}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            <span>Refresh Counts</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isRunningBackup}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6D3CE2] to-[#7554D9] hover:from-[#5D2ED1] hover:to-[#6645C9] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRunningBackup ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Backup in Progress...</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span>Create Full Database Backup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Authorized Session Info */}
      {statsError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{statsError}</span>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Last Backup Timestamp
            </span>
            {latestBackup ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  latestBackup.status === 'complete'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {latestBackup.status === 'complete' ? 'Complete' : 'Incomplete'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                No Backup
              </span>
            )}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">
            {loadingStats
              ? 'Loading backup history...'
              : latestBackup
              ? formatDisplayDate(latestBackup.createdAt)
              : 'No database backup has been created yet.'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate font-mono">
            {latestBackup
              ? latestBackup.filename
              : `Authorised Operator: ${user?.email || 'org.secy.cp@srmist.edu.in'}`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Registrations</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {loadingStats ? '—' : registrationsCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Participant records</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Abstracts</span>
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {loadingStats ? '—' : abstractsCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Scientific submissions</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Payment Records</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {loadingStats ? '—' : paymentsCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fee &amp; verification logs</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Uploaded Files</span>
              <HardDrive className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {loadingStats ? '—' : uploadedFilesCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Proofs &amp; supporting docs</div>
          </div>
        </div>
      </div>

      {/* Live Progress Panel (shown while running or immediately after completion before dismissal) */}
      {(isRunningBackup || progress) && (
        <div className="bg-white rounded-xl border border-purple-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {isRunningBackup ? (
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
              ) : sessionBackup?.manifest.status === 'complete' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {progress?.stageLabel || 'Processing Backup'}
                </div>
                <div className="text-xs text-slate-500">{progress?.detail}</div>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 self-start sm:self-auto">
              {progress?.percent ?? 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                sessionBackup?.manifest.status === 'incomplete'
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-[#6D3CE2] to-[#06B6D4]'
              }`}
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>

          {/* 8 Stages Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {BACKUP_PROGRESS_STAGES.map((label, idx) => {
              const currentIdx = progress?.stageIndex ?? 0;
              const isDone =
                (!isRunningBackup && (progress?.percent ?? 0) === 100) || idx < currentIdx;
              const isCurrent = isRunningBackup && idx === currentIdx;

              return (
                <div
                  key={label}
                  className={`px-2.5 py-2 rounded-lg border text-[11px] flex items-center gap-2 ${
                    isDone
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-medium'
                      : isCurrent
                      ? 'bg-purple-50 border-purple-300 text-purple-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 text-[9px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                  )}
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fatal Backup Failure Alert */}
      {fatalError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-red-900">
                Database Backup Failed
              </h3>
              <p className="text-xs text-red-800">{fatalError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Full Backup</span>
            </button>
          </div>
        </div>
      )}

      {/* Completion or Incomplete Warning Summary Card */}
      {sessionBackup && (
        <div
          className={`rounded-xl border p-5 shadow-2xs space-y-4 ${
            sessionBackup.manifest.status === 'complete'
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/80 border-amber-300'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              {sessionBackup.manifest.status === 'complete' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h3
                  className={`text-sm font-bold ${
                    sessionBackup.manifest.status === 'complete'
                      ? 'text-emerald-950'
                      : 'text-amber-950'
                  }`}
                >
                  {sessionBackup.manifest.status === 'complete'
                    ? 'Full database backup created successfully.'
                    : `Backup completed with ${sessionBackup.manifest.errors.length} error(s) — Marked INCOMPLETE`}
                </h3>
                <p className="text-xs text-slate-700 mt-0.5">
                  {sessionBackup.manifest.status === 'complete'
                    ? 'All accessible conference collections and uploaded documents were packaged and downloaded.'
                    : 'One or more collections or uploaded documents could not be retrieved. Do not rely on this archive as a complete backup.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {sessionBackup.manifest.status === 'incomplete' && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isRunningBackup}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Backup</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadAgain}
                className="px-3.5 py-2 rounded-lg bg-[#0B112C] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-cyan-300" />
                <span>
                  {sessionBackup.manifest.status === 'complete'
                    ? 'Download Backup Again'
                    : 'Download Partial ZIP'}
                </span>
              </button>
            </div>
          </div>

          {/* Summary Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="bg-white/90 rounded-lg border border-slate-200/80 p-2.5 col-span-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Generated Archive Filename
              </span>
              <span className="font-mono font-bold text-slate-800 break-all">
                {sessionBackup.filename}
              </span>
            </div>
            <div className="bg-white/90 rounded-lg border border-slate-200/80 p-2.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Archive Size
              </span>
              <span className="font-mono font-bold text-slate-800">
                {formatBytes(sessionBackup.totalArchiveBytes)}
              </span>
            </div>
            <div className="bg-white/90 rounded-lg border border-slate-200/80 p-2.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Registrations
              </span>
              <span className="font-mono font-bold text-slate-800">
                {sessionBackup.recordCounts.registrations}
              </span>
            </div>
            <div className="bg-white/90 rounded-lg border border-slate-200/80 p-2.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Abstracts
              </span>
              <span className="font-mono font-bold text-slate-800">
                {sessionBackup.recordCounts.abstracts}
              </span>
            </div>
            <div className="bg-white/90 rounded-lg border border-slate-200/80 p-2.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Extracted Files
              </span>
              <span className="font-mono font-bold text-slate-800">
                {sessionBackup.storageSummary.totalExtractedFiles}
              </span>
            </div>
          </div>

          {sessionBackup.historySaveWarning && (
            <div className="text-[11px] text-amber-800 bg-amber-100/70 border border-amber-200 rounded-lg px-3 py-2">
              {sessionBackup.historySaveWarning}
            </div>
          )}

          {/* Incomplete Errors List */}
          {sessionBackup.manifest.errors.length > 0 && (
            <div className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
              <div className="text-xs font-bold text-amber-900">
                Affected Items ({sessionBackup.manifest.errors.length})
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                {sessionBackup.manifest.errors.map((err, i) => (
                  <div
                    key={`${err.path || err.targetId || 'err'}-${i}`}
                    className="p-2 rounded bg-amber-50/70 border border-amber-100 text-slate-700"
                  >
                    <span className="font-semibold text-amber-900">[{err.source}]</span>{' '}
                    <span className="font-mono text-slate-800">{err.path || err.targetId}</span> —{' '}
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two-Column Guidance Row: Google Drive Manual Upload + Restore & Scope Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Google Drive Manual Upload Instructions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Store a copy in Google Drive
                </h3>
                <p className="text-[11px] text-slate-500">
                  Recommended manual off-site archival workflow (no automatic Drive sync)
                </p>
              </div>
            </div>
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Open Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside bg-slate-50 rounded-lg border border-slate-100 p-3.5">
            <li>
              Click <strong>Open Google Drive</strong> and sign in with the official conference Google account.
            </li>
            <li>
              Open or create the folder named{' '}
              <span className="font-mono font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
                <FolderOpen className="w-3 h-3 text-amber-500" />
                SRMCON 2027 – Database Backups
              </span>
              .
            </li>
            <li>
              Manually upload the downloaded <span className="font-mono">.zip</span> archive without renaming or modifying its contents.
            </li>
            <li>
              Confirm the upload finishes completely before closing Google Drive.
            </li>
          </ol>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              Upload to Google Drive is performed manually by the administrator; this portal does not transmit backups automatically.
            </span>
          </p>
        </div>

        {/* Restore Safety & Scope Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Archive Contents &amp; Restoration Safeguards
              </h3>
              <p className="text-[11px] text-slate-500">
                Restore-ready JSON datasets with strict type &amp; document ID preservation
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-950 font-medium leading-relaxed">
              Restoring a database backup is a separate administrative operation. Do not manually import backup files into the live database.
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileArchive className="w-3.5 h-3.5 text-purple-600" />
                <span>Included Inside Each Archive</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Preserves original Firestore document IDs, Timestamps, Registration &amp; Abstract cross-links, payment verification metadata, abstract evaluation notes, presentation allocations, administrative logs, and binary payment proofs / supporting documents.
              </p>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Security note: Firebase Authentication user passwords, API keys, and private credentials are never exported.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Persistent Backup History Table (Metadata Only) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Backup Audit History</h3>
            <p className="text-[11px] text-slate-500">
              Metadata log of manual backups created from this portal (ZIP files are stored locally or manually in Google Drive, not inside Firestore).
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {history.length} recorded snapshot{history.length === 1 ? '' : 's'}
          </span>
        </div>

        {loadingStats ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            <span>Loading backup audit logs...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Clock className="w-7 h-7 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-600">
              No database backup has been created yet.
            </div>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Use <strong>Create Full Database Backup</strong> above to download your first complete SRMCON 2027 archive.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Archive Filename</th>
                  <th className="py-3 px-4 font-semibold">Initiated By</th>
                  <th className="py-3 px-4 font-semibold">Records</th>
                  <th className="py-3 px-4 font-semibold">Files / Size</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {formatDisplayDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                      {item.filename}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {item.initiatedBy}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {item.recordCounts?.registrations ?? 0} Reg ·{' '}
                      {item.recordCounts?.abstracts ?? 0} Abs
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                      {item.storageFilesCount} files · {formatBytes(item.totalArchiveBytes)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'complete'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status === 'complete'
                          ? 'Complete'
                          : `Incomplete (${item.errorCount})`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B112C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-300" />
                <h3 className="text-sm font-bold font-heading">
                  Confirm Full Database Backup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                You are about to create a complete backup of SRMCON 2027 conference records and associated uploaded documents. The backup will be downloaded as a ZIP file to your computer. Continue?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-[11px] text-slate-600">
                <div>
                  <strong>Scope:</strong> {registrationsCount} registrations, {abstractsCount} abstracts, payments, evaluations, allocations &amp; {uploadedFilesCount} uploaded files.
                </div>
                <div>
                  <strong>Initiating Account:</strong>{' '}
                  <span className="font-mono">{user?.email || 'org.secy.cp@srmist.edu.in'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndStartBackup}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Create Backup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  AlertTriangle,
  Columns,
  Eye,
  FileText,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import type { AbstractRecord, RegistrationRecord } from '../lib/managementService';
import {
  extractAbstractBodyText,
  normalizeEmail,
  normalizeMobileInternational,
  normalizePersonName,
  normalizeTransactionReference,
  type AbstractDuplicateGroup,
  type RegistrationDuplicateGroup,
} from '../lib/duplicatePreventionService';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';

export type ComparisonModalTarget =
  | { kind: 'registration'; group: RegistrationDuplicateGroup }
  | { kind: 'abstract'; group: AbstractDuplicateGroup };

interface DuplicateComparisonModalProps {
  target: ComparisonModalTarget | null;
  onClose: () => void;
  onInspectRegistration?: (reg: RegistrationRecord) => void;
  onInspectAbstract?: (abs: AbstractRecord) => void;
}

const formatTimestamp = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const DuplicateComparisonModal: React.FC<DuplicateComparisonModalProps> = ({
  target,
  onClose,
  onInspectRegistration,
  onInspectAbstract,
}) => {
  if (!target) return null;

  const isCritical = target.group.severity === 'critical';

  return (
    <div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white max-w-6xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 text-white flex items-start justify-between gap-3 shrink-0 ${
            isCritical ? 'bg-red-950' : 'bg-amber-950'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                isCritical
                  ? 'bg-red-900 border-red-700 text-amber-300'
                  : 'bg-amber-900 border-amber-700 text-amber-200'
              }`}
            >
              <Columns className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/15">
                  Side-by-Side Duplicate Comparison
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/80">
                  {target.group.records.length} Records
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold font-heading mt-0.5">
                {target.group.label}
              </h3>
              <p className="text-[11px] text-white/80 font-mono truncate">
                Matched indicator: {target.group.matchedValue}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer shrink-0"
            title="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Integrity Policy Notice */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-700 shrink-0">
          {isCritical ? (
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="leading-snug">
            <strong>Non-Destructive Audit View:</strong> Existing records are preserved intact and
            are never auto-deleted.{' '}
            {target.kind === 'registration' && target.group.type === 'duplicate_reg_id'
              ? 'Duplicate Registration IDs are strictly prohibited and cannot be approved via exception.'
              : target.kind === 'registration'
              ? 'Compare contact details, institution, and UTR values below to distinguish genuine accidental duplicates from distinct delegates with similar names.'
              : 'Compare titles, author lists, and full abstract text below. Collaborative abstracts sharing co-authors with distinct content are not flagged.'}
          </div>
        </div>

        {/* Side-by-Side Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100/70">
          {target.kind === 'registration' ? (
            <RegistrationComparisonGrid
              group={target.group}
              onInspectRegistration={(reg) => {
                onClose();
                onInspectRegistration?.(reg);
              }}
            />
          ) : (
            <AbstractComparisonGrid
              group={target.group}
              onInspectAbstract={(abs) => {
                onClose();
                onInspectAbstract?.(abs);
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {target.kind === 'registration'
              ? 'Highlighted fields indicate matching or conflicting values across compared registrations.'
              : 'Review full text carefully before making an editorial decision.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg cursor-pointer"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

const RegistrationComparisonGrid: React.FC<{
  group: RegistrationDuplicateGroup;
  onInspectRegistration: (reg: RegistrationRecord) => void;
}> = ({ group, onInspectRegistration }) => {
  const records = group.records;

  // Determine which normalized fields actually collide across >= 2 records in this group
  const hasCollision = (extractor: (r: RegistrationRecord) => string): boolean => {
    const counts = new Map<string, number>();
    for (const r of records) {
      const val = extractor(r);
      if (!val) continue;
      counts.set(val, (counts.get(val) || 0) + 1);
      if ((counts.get(val) || 0) >= 2) return true;
    }
    return false;
  };

  const regIdCollides = hasCollision((r) => (r.registrationId || '').trim().toUpperCase());
  const emailCollides = hasCollision((r) => normalizeEmail(r.normalizedEmail || r.email));
  const mobileCollides = hasCollision((r) =>
    normalizeMobileInternational(r.normalizedMobile || r.mobile, r.country || 'India')
  );
  const utrCollides = hasCollision((r) =>
    normalizeTransactionReference(r.normalizedTransactionReference || r.transactionReference)
  );
  const nameCollides = hasCollision((r) => normalizePersonName(r.fullName));

  return (
    <div
      className={`grid gap-4 ${
        records.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      }`}
    >
      {records.map((reg, idx) => {
        const normMobile = normalizeMobileInternational(
          reg.normalizedMobile || reg.mobile,
          reg.country || 'India'
        );
        const normUtr = normalizeTransactionReference(
          reg.normalizedTransactionReference || reg.transactionReference
        );

        return (
          <div
            key={reg.id}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-mono font-bold text-purple-800 text-xs truncate">
                    {reg.registrationId || 'Pending ID'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    Doc: {reg.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onInspectRegistration(reg)}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Eye className="w-3 h-3" />
                <span>Inspect</span>
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs flex-1">
              <ComparisonField
                label="Registration ID"
                value={reg.registrationId || 'Pending ID'}
                highlight={regIdCollides ? 'critical' : undefined}
                mono
              />
              <ComparisonField
                label="Full Name"
                value={reg.fullName}
                highlight={
                  nameCollides || group.type === 'similar_name' || group.type === 'same_name_institution'
                    ? 'warning'
                    : undefined
                }
              />
              <ComparisonField
                label="Email Address"
                value={reg.email}
                highlight={emailCollides ? 'critical' : undefined}
              />
              <ComparisonField
                label="Mobile Number (Intl. Normalized)"
                value={`${reg.mobile}${normMobile ? ` (${normMobile})` : ''}`}
                highlight={mobileCollides ? 'critical' : undefined}
                mono
              />
              <ComparisonField
                label="Institution / College"
                value={reg.institution}
                highlight={group.type === 'same_name_institution' ? 'warning' : undefined}
              />
              <div className="grid grid-cols-2 gap-2">
                <ComparisonField label="Category" value={reg.category} />
                <ComparisonField label="Mode" value={reg.participationMode || '—'} />
              </div>
              <ComparisonField
                label="UTR / Transaction Ref"
                value={`${reg.transactionReference}${
                  normUtr && normUtr !== reg.transactionReference ? ` [Norm: ${normUtr}]` : ''
                }`}
                highlight={utrCollides ? 'critical' : undefined}
                mono
              />
              <div className="grid grid-cols-2 gap-2">
                <ComparisonField
                  label="Amount Paid"
                  value={`₹${reg.paymentAmount || reg.amount || 2000}`}
                  mono
                />
                <ComparisonField label="Payment Mode" value={reg.paymentMode || '—'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ComparisonField label="Payment Status" value={reg.paymentStatus} />
                <ComparisonField label="Reg. Status" value={reg.registrationStatus} />
              </div>
              <ComparisonField label="Submitted At" value={formatTimestamp(reg.createdAt)} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AbstractComparisonGrid: React.FC<{
  group: AbstractDuplicateGroup;
  onInspectAbstract: (abs: AbstractRecord) => void;
}> = ({ group, onInspectAbstract }) => {
  const records = group.records;

  return (
    <div
      className={`grid gap-4 ${
        records.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      }`}
    >
      {records.map((abs, idx) => {
        const author = abs.presentingAuthor || {};
        const bodyText = extractAbstractBodyText(abs.abstractContent);
        const trackTitle =
          SCIENTIFIC_TRACKS.find((t) => t.id === abs.trackId)?.title || abs.trackId;
        const coAuthorNames = Array.isArray(abs.coAuthors)
          ? abs.coAuthors
              .map((c) => (c?.name ? `${c.name}${c.affiliation ? ` (${c.affiliation})` : ''}` : ''))
              .filter(Boolean)
          : [];

        return (
          <div
            key={`${abs.id}_${idx}`}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-mono font-bold text-purple-800 text-xs truncate">
                    {abs.id}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    Linked Reg: {abs.registrationId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onInspectAbstract(abs)}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FileText className="w-3 h-3" />
                <span>Review</span>
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs flex-1">
              <ComparisonField
                label="Abstract Title"
                value={abs.title}
                highlight={
                  group.type === 'duplicate_title'
                    ? 'critical'
                    : group.type === 'similar_content'
                    ? 'warning'
                    : undefined
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <ComparisonField
                  label="Presenting Author"
                  value={author.fullName || author.name || '—'}
                />
                <ComparisonField label="Review Status" value={abs.status || 'Submitted'} />
              </div>
              <ComparisonField label="Corresponding Email" value={author.email || '—'} />
              <ComparisonField label="Affiliation" value={author.affiliation || '—'} />
              <ComparisonField label="Scientific Track" value={trackTitle} />
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Co-Authors</span>
                </div>
                <div className="text-[11px] text-slate-700 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  {coAuthorNames.length > 0 ? coAuthorNames.join('; ') : 'None listed'}
                </div>
              </div>
              <ComparisonField label="Submitted At" value={formatTimestamp(abs.createdAt)} />

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Abstract Text
                  </span>
                  {typeof group.similarityPercent === 'number' && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        group.similarityPercent >= 95
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {group.similarityPercent}% Content Overlap
                    </span>
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg border text-[11.5px] leading-relaxed text-slate-800 max-h-56 overflow-y-auto whitespace-pre-wrap ${
                    group.type === 'identical_content'
                      ? 'bg-red-50/60 border-red-200'
                      : group.type === 'similar_content'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {bodyText || 'No abstract body text recorded.'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ComparisonField: React.FC<{
  label: string;
  value: string;
  highlight?: 'critical' | 'warning';
  mono?: boolean;
}> = ({ label, value, highlight, mono }) => {
  return (
    <div
      className={`rounded-lg px-2.5 py-1.5 border ${
        highlight === 'critical'
          ? 'bg-red-50 border-red-300'
          : highlight === 'warning'
          ? 'bg-amber-50 border-amber-300'
          : 'bg-slate-50/70 border-slate-100'
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={`text-[11.5px] font-semibold break-words ${
          mono ? 'font-mono' : ''
        } ${
          highlight === 'critical'
            ? 'text-red-900'
            : highlight === 'warning'
            ? 'text-amber-950'
            : 'text-slate-800'
        }`}
      >
        {value || '—'}
      </div>
    </div>
  );
};

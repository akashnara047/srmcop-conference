import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Edit, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  updateRegistrationIdentifiers,
  type RegistrationRecord,
} from '../lib/managementService';
import {
  isDuplicateRecordError,
  normalizeTransactionReference,
} from '../lib/duplicatePreventionService';

interface EditRegistrationIdentifiersPanelProps {
  registration: RegistrationRecord;
  adminEmail: string;
  onUpdated: (updated: RegistrationRecord) => void;
}

export const EditRegistrationIdentifiersPanel: React.FC<EditRegistrationIdentifiersPanelProps> = ({
  registration,
  adminEmail,
  onUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState(registration.fullName || '');
  const [email, setEmail] = useState(registration.email || '');
  const [mobile, setMobile] = useState(registration.mobile || '');
  const [institution, setInstitution] = useState(registration.institution || '');
  const [country, setCountry] = useState(registration.country || 'India');
  const [utr, setUtr] = useState(registration.transactionReference || '');
  const [auditReason, setAuditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setFullName(registration.fullName || '');
    setEmail(registration.email || '');
    setMobile(registration.mobile || '');
    setInstitution(registration.institution || '');
    setCountry(registration.country || 'India');
    setUtr(registration.transactionReference || '');
    setAuditReason('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsOpen(false);
  }, [registration.id]);

  const utrChanged =
    normalizeTransactionReference(utr) !==
    normalizeTransactionReference(
      registration.normalizedTransactionReference || registration.transactionReference
    );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (utrChanged && auditReason.trim().length < 5) {
      setErrorMsg('Please enter an investigation reason (at least 5 characters) before modifying the payment UTR.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateRegistrationIdentifiers({
        regDocId: registration.id,
        updates: {
          fullName: fullName.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          institution: institution.trim(),
          country: country.trim() || 'India',
          transactionReference: utr.trim(),
        },
        adminEmail,
        auditReason: auditReason.trim() || 'Organising Secretary record correction',
      });
      setSuccessMsg('Participant details updated atomically and logged to audit trail.');
      setAuditReason('');
      onUpdated(updated);
    } catch (err: any) {
      if (isDuplicateRecordError(err)) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err?.message || 'Unable to update registration details.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-700">
          <Edit className="w-3.5 h-3.5 text-purple-600" />
          <span>Edit Participant Identity / Contact Details</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer"
        >
          {isOpen ? 'Cancel Edit' : 'Edit Details'}
        </button>
      </div>

      {!isOpen && (
        <p className="text-[11px] text-slate-500 leading-snug">
          Atomic uniqueness checks preserve this participant&apos;s own identifiers while blocking any collision with another registered delegate.
        </p>
      )}

      {isOpen && (
        <form onSubmit={handleSave} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Email Address (Uniqueness Checked)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Mobile Number (Intl. Uniqueness Checked)
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Country
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Institution / Organization
              </label>
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                UTR / Transaction Reference (Old UTR lock is never silently freed)
              </label>
              <input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-purple-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Audit Reason {utrChanged ? <span className="text-red-600">* (Required for UTR change)</span> : '(Optional)'}
              </label>
              <input
                type="text"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Reason for updating participant record..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating &amp; Saving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Save Changes Atomically</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

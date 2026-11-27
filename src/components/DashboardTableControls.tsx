import React from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Shield,
  X,
  XCircle,
} from 'lucide-react';

export type PageSizeOption = 25 | 50 | 100;

interface TableBulkActionBarProps {
  totalFilteredCount: number;
  pageItemCount: number;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  selectedCount: number;
  eligibleSelectedCount: number;
  onToggleSelectAllPage: () => void;
  onClearSelection: () => void;
  onBulkApprove?: () => void;
  onBulkReject: () => void;
  pageSize: PageSizeOption;
  onPageSizeChange: (size: PageSizeOption) => void;
  disabled?: boolean;
  itemNoun: string;
}

export const TableBulkActionBar: React.FC<TableBulkActionBarProps> = ({
  totalFilteredCount,
  pageItemCount,
  allOnPageSelected,
  someOnPageSelected,
  selectedCount,
  eligibleSelectedCount,
  onToggleSelectAllPage,
  onClearSelection,
  onBulkApprove,
  onBulkReject,
  pageSize,
  onPageSizeChange,
  disabled = false,
  itemNoun,
}) => {
  return (
    <div className="px-3.5 py-2.5 bg-white border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pageItemCount > 0 && allOnPageSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
            }}
            onChange={onToggleSelectAllPage}
            disabled={pageItemCount === 0 || disabled}
            aria-label={`Select all ${itemNoun} on current page`}
            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer disabled:opacity-40"
          />
          <span className="font-semibold text-slate-700 tabular-nums">
            {selectedCount} selected
          </span>
        </label>

        {selectedCount > 0 && eligibleSelectedCount < selectedCount && (
          <span className="text-[10.5px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            {eligibleSelectedCount} pending eligible
          </span>
        )}

        <div className="flex items-center gap-1.5">
          {onBulkApprove && (
            <button
              type="button"
              disabled={disabled || selectedCount === 0 || eligibleSelectedCount === 0}
              onClick={onBulkApprove}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 font-semibold text-[11.5px] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span>Approve Selected</span>
            </button>
          )}

          <button
            type="button"
            disabled={disabled || selectedCount === 0 || eligibleSelectedCount === 0}
            onClick={onBulkReject}
            className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/90 font-semibold text-[11.5px] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <X className="w-3.5 h-3.5 text-red-600 stroke-[2.5]" />
            <span>Reject Selected</span>
          </button>

          {selectedCount > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClearSelection}
              className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-[11px] text-slate-500 hidden sm:inline tabular-nums">
          {totalFilteredCount} matching
        </span>
        <label className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-600 font-medium">
          <span>Show</span>
          <select
            aria-label={`Rows per page for ${itemNoun}`}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSizeOption)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11.5px] font-semibold text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </label>
      </div>
    </div>
  );
};

interface TablePaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: PageSizeOption;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

export const TablePaginationBar: React.FC<TablePaginationBarProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  itemLabel,
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, currentPage), safeTotalPages);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = totalItems === 0 ? 0 : Math.min(safePage * pageSize, totalItems);

  // Build compact page number list (max 5 visible page buttons)
  const pageNumbers: number[] = [];
  let startPage = Math.max(1, safePage - 2);
  let endPage = Math.min(safeTotalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  for (let p = startPage; p <= endPage; p += 1) {
    pageNumbers.push(p);
  }

  return (
    <div className="px-3.5 py-2.5 bg-white border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      <div className="text-[11.5px] text-slate-600 font-medium tabular-nums">
        {totalItems === 0
          ? `Showing 0 of 0 ${itemLabel}`
          : `Showing ${startIdx} – ${endIdx} of ${totalItems} ${itemLabel} (Page ${safePage} of ${safeTotalPages})`}
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          aria-label="First page"
          title="First page"
          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
          title="Previous page"
          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            aria-current={pageNum === safePage ? 'page' : undefined}
            className={`min-w-[28px] h-7 px-2 rounded-lg text-[11.5px] font-bold tabular-nums transition-colors cursor-pointer border ${
              pageNum === safePage
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200 hover:border-purple-200'
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotalPages}
          aria-label="Next page"
          title="Next page"
          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safePage >= safeTotalPages}
          aria-label="Last page"
          title="Last page"
          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export interface BulkConfirmModalConfig {
  entity: 'registrations' | 'abstracts';
  action: 'approve' | 'reject';
  totalSelected: number;
  eligibleCount: number;
  skippedSettledCount: number;
  skippedDuplicateGuardCount: number;
  previewLabels: string[];
}

interface BulkActionConfirmModalProps {
  config: BulkConfirmModalConfig | null;
  remarks: string;
  onRemarksChange: (value: string) => void;
  isProcessing: boolean;
  progressText?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const BulkActionConfirmModal: React.FC<BulkActionConfirmModalProps> = ({
  config,
  remarks,
  onRemarksChange,
  isProcessing,
  progressText,
  onCancel,
  onConfirm,
}) => {
  if (!config) return null;

  const isApprove = config.action === 'approve';
  const isReg = config.entity === 'registrations';
  const nounSingular = isReg ? 'registration' : 'abstract';
  const nounPlural = isReg ? 'registrations' : 'abstracts';
  const totalSkipped = config.skippedSettledCount + config.skippedDuplicateGuardCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-confirm-title"
        className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isApprove
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-red-50/80 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isApprove
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {isApprove ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3
                id="bulk-confirm-title"
                className="text-sm font-bold text-slate-900 font-heading"
              >
                Confirm Bulk {isApprove ? 'Approval' : 'Rejection'} ({isReg ? 'Registrations' : 'Abstracts'})
              </h3>
              <p className="text-[11px] text-slate-600">
                Audited Organising Secretary action · Existing approval workflows preserved
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-black/5 cursor-pointer disabled:opacity-40"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-slate-800 leading-relaxed">
              You are about to{' '}
              <strong className={isApprove ? 'text-emerald-700' : 'text-red-700'}>
                {isApprove ? 'approve' : 'reject'} {config.eligibleCount}{' '}
                {config.eligibleCount === 1 ? nounSingular : nounPlural}
              </strong>{' '}
              (out of {config.totalSelected} selected).
            </div>

            {config.previewLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {config.previewLabels.slice(0, 8).map((label) => (
                  <span
                    key={label}
                    className="font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-purple-800"
                  >
                    {label}
                  </span>
                ))}
                {config.eligibleCount > 8 && (
                  <span className="text-[10.5px] font-semibold text-slate-500 px-1 py-0.5">
                    +{config.eligibleCount - 8} more
                  </span>
                )}
              </div>
            )}
          </div>

          {totalSkipped > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-snug">
                <div className="font-bold">
                  {totalSkipped} selected {totalSkipped === 1 ? 'record' : 'records'} will be safely skipped:
                </div>
                {config.skippedSettledCount > 0 && (
                  <div>
                    · {config.skippedSettledCount} already approved/verified or rejected (protected from duplicate processing).
                  </div>
                )}
                {config.skippedDuplicateGuardCount > 0 && (
                  <div>
                    · {config.skippedDuplicateGuardCount} flagged with a duplicate Registration ID or UTR (requires individual review/exception audit).
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/80 text-[11px] text-purple-950 flex items-start gap-2 leading-snug">
            <Shield className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
            <span>
              {isReg
                ? 'Registration approval is strictly independent from Abstract approval. Eligible approved participants receive their confirmation email via the existing duplicate-protected notification queue.'
                : 'Abstract approval is strictly independent from Registration payment approval. Eligible accepted abstracts trigger acceptance emails via the existing duplicate-protected notification queue.'}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 block">
              {isReg ? 'Admin Remarks (Optional)' : 'Review Notes (Optional)'}
            </label>
            <input
              type="text"
              disabled={isProcessing}
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder={
                isApprove
                  ? isReg
                    ? 'Payment verified by Org. Secretary (Bulk approval).'
                    : 'Abstract accepted by Scientific Committee (Bulk approval).'
                  : isReg
                  ? 'Payment transaction reference unverified.'
                  : 'Abstract not accepted in current review cycle.'
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15"
            />
          </div>

          {isProcessing && progressText && (
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
              <span>{progressText}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || config.eligibleCount === 0}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isApprove ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>
              {isProcessing
                ? 'Processing...'
                : `${isApprove ? 'Approve' : 'Reject'} ${config.eligibleCount} ${
                    config.eligibleCount === 1 ? nounSingular : nounPlural
                  }`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

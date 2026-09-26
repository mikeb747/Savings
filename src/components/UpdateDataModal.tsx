import React, { useState } from 'react';
import { PivotTableCell, PivotTableData } from '../types/savings';
import { AlertTriangle, Check, X, ArrowRight, Table, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: PivotTableData;
  initialCell?: {
    cell: PivotTableCell;
    rowLabel: string;
    colHeader: string;
  } | null;
  onConfirmUpdate: (cellCoordinate: string, newValue: string) => Promise<void>;
  isUpdating: boolean;
}

export const UpdateDataModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  initialCell,
  onConfirmUpdate,
  isUpdating,
}) => {
  const [cellCoord, setCellCoord] = useState(initialCell?.cell.sheetCell || 'B2');
  const [newValue, setNewValue] = useState(initialCell?.cell.rawValue || '');
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state if initialCell changes
  React.useEffect(() => {
    if (initialCell) {
      setCellCoord(initialCell.cell.sheetCell);
      setNewValue(initialCell.cell.rawValue);
      setShowConfirmStep(false);
      setErrorMsg(null);
    }
  }, [initialCell]);

  if (!isOpen) return null;

  const currentCellValue = initialCell?.cell.sheetCell === cellCoord
    ? initialCell.cell.rawValue
    : (data.rawValues[0]?.[0] || 'Unknown');

  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellCoord.trim()) {
      setErrorMsg('Please specify a cell coordinate (e.g. B2, C4)');
      return;
    }
    if (!newValue.trim()) {
      setErrorMsg('Please specify a new value');
      return;
    }
    setErrorMsg(null);
    setShowConfirmStep(true);
  };

  const handleExecuteUpdate = async () => {
    try {
      setErrorMsg(null);
      await onConfirmUpdate(cellCoord.trim().toUpperCase(), newValue.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update spreadsheet');
      setShowConfirmStep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">
                {showConfirmStep ? 'Confirm Spreadsheet Update' : 'Update Google Sheet Cell'}
              </h3>
              <p className="text-xs text-slate-400">
                {data.spreadsheetTitle} &bull; '{data.sheetName}'
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!showConfirmStep ? (
            <form onSubmit={handleProceedToConfirmation} className="space-y-4">
              {initialCell && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                  <div className="text-slate-400">Selected Pivot Point:</div>
                  <div className="font-medium text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400">{initialCell.rowLabel}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-slate-300">{initialCell.colHeader}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Cell Coordinate (e.g. B2, C4)
                </label>
                <input
                  type="text"
                  value={cellCoord}
                  onChange={(e) => setCellCoord(e.target.value.toUpperCase())}
                  placeholder="e.g. B2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Value or Amount
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="e.g. $2,500.00 or 2500"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Google Sheets will automatically recalculate totals and pivot summaries.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 active:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950"
                >
                  <span>Review & Confirm</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            /* Explicit Confirmation Dialog (Mandatory Workspace Integration Guideline) */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong>User Confirmation Required:</strong>
                  <p className="mt-1">
                    You are about to modify user spreadsheet data in Google Sheets via the Google Sheets API.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Spreadsheet:</span>
                  <span className="text-slate-200 font-semibold">{data.spreadsheetTitle}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Sheet Tab:</span>
                  <span className="text-emerald-400 font-semibold">'{data.sheetName}'</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Target Cell:</span>
                  <span className="text-slate-200 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                    {cellCoord}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Change:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-slate-500">{currentCellValue || '(empty)'}</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">{newValue}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmStep(false)}
                  disabled={isUpdating}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isUpdating}
                    className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteUpdate}
                    disabled={isUpdating}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 active:bg-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating Sheets...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm & Update</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

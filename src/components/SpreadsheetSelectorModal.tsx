import React, { useState } from 'react';
import { GoogleSheetFile } from '../types/savings';
import { FileSpreadsheet, Plus, ExternalLink, X, Search, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  spreadsheets: GoogleSheetFile[];
  currentSpreadsheetId?: string;
  onSelectSpreadsheet: (file: GoogleSheetFile) => void;
  onCreateNewSpreadsheet: () => Promise<void>;
  isCreating: boolean;
  onManualIdSubmit: (idOrUrl: string) => void;
}

export const SpreadsheetSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  spreadsheets,
  currentSpreadsheetId,
  onSelectSpreadsheet,
  onCreateNewSpreadsheet,
  isCreating,
  onManualIdSubmit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'manual'>('list');

  if (!isOpen) return null;

  const filtered = spreadsheets.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    // Check if input is full URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
    let id = customInput.trim();
    const urlMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      id = urlMatch[1];
    }

    onManualIdSubmit(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Select Google Spreadsheet</h3>
              <p className="text-xs text-slate-400">Choose or create your 'Savings' spreadsheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Drive Spreadsheets ({spreadsheets.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Enter ID or Link
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'list' ? (
            <>
              {/* Search & Create Actions */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search your sheets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={onCreateNewSpreadsheet}
                  disabled={isCreating}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer flex-shrink-0"
                  title="Create a new 'Savings' spreadsheet in your Google Drive with a PivotTable tab"
                >
                  {isCreating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create 'Savings'</span>
                </button>
              </div>

              {/* Spreadsheets List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 space-y-2 bg-slate-950/40 rounded-xl border border-slate-800 p-4">
                    <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
                    <p>No spreadsheets matching "{searchTerm}" found in your Google Drive.</p>
                    <button
                      onClick={onCreateNewSpreadsheet}
                      disabled={isCreating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-medium text-xs mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create a new 'Savings' Sheet now
                    </button>
                  </div>
                ) : (
                  filtered.map((sheet) => {
                    const isSelected = sheet.id === currentSpreadsheetId;
                    const isSavingsName = sheet.name.toLowerCase() === 'savings';
                    return (
                      <div
                        key={sheet.id}
                        onClick={() => {
                          onSelectSpreadsheet(sheet);
                          onClose();
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSavingsName
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                              <span>{sheet.name}</span>
                              {isSavingsName && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                              ID: {sheet.id}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                          {sheet.webViewLink && (
                            <a
                              href={sheet.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                              title="Open in Google Sheets"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Manual Input */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Spreadsheet ID or Google Sheets URL
                </label>
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  You can paste the entire address bar URL or just the Spreadsheet ID.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Connect Spreadsheet
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

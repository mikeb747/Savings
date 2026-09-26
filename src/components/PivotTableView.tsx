import React, { useState } from 'react';
import { PivotTableCell, PivotTableData } from '../types/savings';
import { Search, Edit3, ArrowRight, Table, Sparkles, Filter } from 'lucide-react';

interface Props {
  data: PivotTableData;
  onSelectCellToEdit: (cell: PivotTableCell, rowLabel: string, colHeader: string) => void;
}

export const PivotTableView: React.FC<Props> = ({ data, onSelectCellToEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { headers, rows, grandTotalRow, sheetName, spreadsheetTitle } = data;

  // Filter rows based on search
  const filteredRows = rows.filter((r) =>
    searchTerm.trim() === ''
      ? true
      : r.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.cells.some((c) => c.rawValue.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Header and Filter Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
        <div>
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-slate-200">
              Pivot Table: <span className="text-emerald-300 font-mono">'{sheetName}'</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tap any data cell to edit or update directly via the Google Sheets API.
          </p>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Swipe instruction hint on mobile */}
      <div className="sm:hidden px-4 py-1.5 bg-slate-950/80 border-b border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400/90">
          <Sparkles className="w-3 h-3" /> Scroll horizontally to see all columns
        </span>
        <span className="font-mono text-slate-500">{filteredRows.length} rows</span>
      </div>

      {/* Scrollable Pivot Table Container */}
      <div className="overflow-x-auto custom-scrollbar max-h-[550px] relative">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Headers */}
          <thead className="sticky top-0 z-20 bg-slate-950 shadow-sm border-b border-slate-800">
            <tr>
              {headers.map((header, colIdx) => (
                <th
                  key={colIdx}
                  className={`p-3 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap ${
                    colIdx === 0
                      ? 'sticky left-0 z-30 bg-slate-950 text-slate-300 min-w-[160px] sm:min-w-[180px] shadow-[2px_0_5px_rgba(0,0,0,0.4)]'
                      : 'text-right text-slate-400 min-w-[120px]'
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredRows.map((row, rIdx) => (
              <tr
                key={row.rowIndex}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Sticky Row Label (First Column) */}
                <td className="p-3 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800/80 text-slate-200 font-sans font-medium whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.3)] border-r border-slate-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{row.label}</span>
                  </div>
                </td>

                {/* Data Cells */}
                {row.cells.slice(1).map((cell, cIdx) => {
                  const actualColIdx = cIdx + 1;
                  const isTotalCol = cell.isTotal;
                  return (
                    <td
                      key={cell.sheetCell}
                      onClick={() => onSelectCellToEdit(cell, row.label, headers[actualColIdx] || '')}
                      className={`p-3 text-right whitespace-nowrap cursor-pointer transition-all ${
                        isTotalCol
                          ? 'font-bold text-emerald-300 bg-emerald-950/20 group-hover:bg-emerald-950/30'
                          : 'text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-200'
                      }`}
                      title={`Cell ${cell.sheetCell}: Click to edit`}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5 group/cell">
                        <span>{cell.formattedValue}</span>
                        <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Grand Total Row */}
            {grandTotalRow && (
              <tr className="sticky bottom-0 z-20 bg-emerald-950/60 font-bold border-t-2 border-emerald-500/40 shadow-[0_-2px_10px_rgba(0,0,0,0.5)]">
                {/* Grand Total Row Label */}
                <td className="p-3 sticky left-0 z-30 bg-emerald-950/90 text-emerald-300 font-sans uppercase tracking-wider text-[11px] whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.4)] border-r border-emerald-800/60">
                  {grandTotalRow.label}
                </td>

                {/* Grand Total Cells */}
                {grandTotalRow.cells.slice(1).map((cell, cIdx) => (
                  <td
                    key={cell.sheetCell}
                    className="p-3 text-right text-emerald-300 whitespace-nowrap"
                  >
                    {cell.formattedValue}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono">
          Sheet Range: <strong className="text-slate-300">{data.range}</strong>
        </span>
        <span>
          Showing {filteredRows.length} of {rows.length} categories
        </span>
      </div>
    </div>
  );
};

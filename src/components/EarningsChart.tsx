import React, { useState, useMemo } from 'react';
import { PivotTableData, AccountEarningsItem } from '../types/savings';
import { Filter, TrendingUp, BarChart2, DollarSign, ArrowUpDown, ChevronDown, Check } from 'lucide-react';

interface Props {
  data: PivotTableData;
  onCellClick?: (rowIndex: number, colIndex: number) => void;
}

export const EarningsChart: React.FC<Props> = ({ data, onCellClick }) => {
  const { metrics, currencySymbol } = data;
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'sheet' | 'desc' | 'asc'>('sheet');
  const [activeColIndex, setActiveColIndex] = useState<number>(metrics.selectedEarningsColIndex);

  // Compute all available account types dynamically
  const accountTypes = useMemo(() => {
    const types = new Set<string>();
    metrics.accountEarnings.forEach((item) => {
      if (item.accountType) types.add(item.accountType);
    });
    return Array.from(types).sort();
  }, [metrics.accountEarnings]);

  // If active column changed, recalculate earnings items for that column
  const currentEarningsItems = useMemo(() => {
    return data.rows
      .filter((r) => !r.isTotalRow)
      .map((r) => {
        const cell = r.cells[activeColIndex];
        const val = cell?.numericValue || 0;
        return {
          accountName: r.label,
          accountType: metrics.accountEarnings.find((a) => a.accountName === r.label)?.accountType || 'Standard',
          earnings: val,
          formattedEarnings:
            cell?.formattedValue && cell.formattedValue !== '-'
              ? cell.formattedValue
              : new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currencySymbol === '€' ? 'EUR' : currencySymbol === '£' ? 'GBP' : 'USD',
                  minimumFractionDigits: 2,
                }).format(val),
          columnName: data.headers[activeColIndex] || 'Total_Interest',
          balance: r.cells[1]?.numericValue || undefined,
          rowIndex: r.rowIndex,
        };
      });
  }, [data.rows, activeColIndex, data.headers, metrics.accountEarnings, currencySymbol]);

  // Filter items based on selected account type
  const filteredItems = useMemo(() => {
    let items = currentEarningsItems;
    if (selectedType !== 'ALL') {
      items = items.filter((item) => item.accountType === selectedType);
    }

    if (sortOrder === 'desc') {
      return [...items].sort((a, b) => b.earnings - a.earnings);
    } else if (sortOrder === 'asc') {
      return [...items].sort((a, b) => a.earnings - b.earnings);
    }
    return items;
  }, [currentEarningsItems, selectedType, sortOrder]);

  // Chart metrics
  const maxEarnings = useMemo(() => {
    const maxVal = Math.max(...filteredItems.map((i) => i.earnings), 0);
    // Round up to nice multiple for x-axis ticks
    if (maxVal <= 0) return 100;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const tickStep = magnitude >= 100 ? (maxVal > 500 ? 250 : 100) : 50;
    return Math.ceil(maxVal / tickStep) * tickStep;
  }, [filteredItems]);

  const totalFilteredEarnings = useMemo(() => {
    return filteredItems.reduce((acc, i) => acc + i.earnings, 0);
  }, [filteredItems]);

  // Generate x-axis grid ticks (e.g. 0, 250, 500, 750, 1000...)
  const xTicks = useMemo(() => {
    const steps = 4;
    const stepSize = maxEarnings / steps;
    const ticks: number[] = [];
    for (let i = 0; i <= steps; i++) {
      ticks.push(Math.round(i * stepSize));
    }
    return ticks;
  }, [maxEarnings]);

  const columnName = data.headers[activeColIndex] || 'Total_Interest';

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-4 sm:p-6 shadow-xl space-y-5">
      {/* Top Header matching user request */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-sky-400" />
            <span>Projected Annual Interest Earnings by Savings Account</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Plotting column <span className="font-mono text-emerald-400">'{columnName}'</span> across accounts.
          </p>
        </div>

        {/* Column selector if multiple numeric columns exist */}
        {metrics.availableEarningsColumns.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Metric Column:</span>
            <select
              value={activeColIndex}
              onChange={(e) => setActiveColIndex(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500"
            >
              {metrics.availableEarningsColumns.map((col) => (
                <option key={col.colIndex} value={col.colIndex}>
                  {col.name} (Col {String.fromCharCode(65 + col.colIndex)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Account Type Filter Pills & Sort controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Account Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
          <div className="flex items-center gap-1 text-slate-400 mr-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium text-[11px] uppercase tracking-wider">Type:</span>
          </div>

          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1 rounded-xl font-medium transition-all flex-shrink-0 cursor-pointer text-xs ${
              selectedType === 'ALL'
                ? 'bg-sky-600/30 text-sky-300 border border-sky-500/50 shadow-sm'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            All Accounts ({currentEarningsItems.length})
          </button>

          {accountTypes.map((type) => {
            const count = currentEarningsItems.filter((i) => i.accountType === type).length;
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-xl font-medium transition-all flex-shrink-0 cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-sky-600/30 text-sky-300 border border-sky-500/50 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort Switcher */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
          <span className="text-[11px] text-slate-500">Sort:</span>
          <div className="flex bg-slate-950 rounded-xl border border-slate-800 p-0.5 text-[11px]">
            <button
              onClick={() => setSortOrder('sheet')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                sortOrder === 'sheet' ? 'bg-slate-800 text-sky-300 font-semibold' : 'text-slate-400'
              }`}
              title="Spreadsheet Order (matching original)"
            >
              Original
            </button>
            <button
              onClick={() => setSortOrder('desc')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                sortOrder === 'desc' ? 'bg-slate-800 text-sky-300 font-semibold' : 'text-slate-400'
              }`}
              title="Highest Earnings First"
            >
              Highest
            </button>
            <button
              onClick={() => setSortOrder('asc')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                sortOrder === 'asc' ? 'bg-slate-800 text-sky-300 font-semibold' : 'text-slate-400'
              }`}
              title="Lowest Earnings First"
            >
              Lowest
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
        <div>
          <div className="text-[11px] text-slate-400">Total Projected Earnings</div>
          <div className="text-sm sm:text-base font-extrabold text-sky-300 font-mono mt-0.5">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currencySymbol === '€' ? 'EUR' : currencySymbol === '£' ? 'GBP' : 'USD',
              minimumFractionDigits: 2,
            }).format(totalFilteredEarnings)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Active Filter Accounts</div>
          <div className="text-sm sm:text-base font-bold text-slate-200 mt-0.5">
            {filteredItems.length} accounts
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400">Highest Earning Account</div>
          <div className="text-sm font-semibold text-emerald-400 truncate mt-0.5">
            {filteredItems.length > 0
              ? [...filteredItems].sort((a, b) => b.earnings - a.earnings)[0]?.accountName
              : 'None'}
          </div>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="relative pt-2 pb-4 bg-slate-950/40 rounded-xl border border-slate-800/50 p-2 sm:p-4">
        {/* Y-axis Label */}
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 pl-1">
          Account
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No accounts match the selected type filter.
          </div>
        ) : (
          <div className="space-y-3 relative">
            {/* Horizontal Bars */}
            {filteredItems.map((item, idx) => {
              const widthPct = maxEarnings > 0 ? (Math.max(item.earnings, 0) / maxEarnings) * 100 : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 group transition-colors hover:bg-slate-900/60 p-1 rounded-lg"
                >
                  {/* Account Name Label (Y-axis) */}
                  <div
                    className="w-32 sm:w-44 text-right text-xs font-medium text-slate-300 truncate flex-shrink-0 group-hover:text-white"
                    title={item.accountName}
                  >
                    {item.accountName}
                  </div>

                  {/* Horizontal Bar Track & Grid background */}
                  <div className="flex-1 relative flex items-center h-8 sm:h-9 bg-slate-900/40 rounded-md overflow-visible border-l border-slate-600">
                    {/* Background vertical grid tick lines */}
                    {xTicks.map((tick, tIdx) => {
                      const posPct = (tick / maxEarnings) * 100;
                      return (
                        <div
                          key={tIdx}
                          style={{ left: `${posPct}%` }}
                          className="absolute top-0 bottom-0 w-px bg-slate-800/60 pointer-events-none"
                        />
                      );
                    })}

                    {/* Bar Element (matching the classic solid slate-blue theme from image) */}
                    <div
                      style={{ width: `${Math.max(widthPct, 2)}%` }}
                      className="h-6 sm:h-7 bg-[#255784] hover:bg-[#2f6ea6] rounded-r-md transition-all duration-300 relative shadow-sm flex items-center justify-end pr-2 group/bar"
                    >
                      {/* Tooltip on hover / small tag */}
                      <span className="text-[11px] font-mono font-bold text-white whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity drop-shadow">
                        {item.formattedEarnings}
                      </span>
                    </div>

                    {/* Earnings value directly to right of bar */}
                    <div className="ml-2 text-xs font-mono font-semibold text-slate-300 whitespace-nowrap">
                      {item.formattedEarnings}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* X-axis ticks and gridline labels at bottom */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-700/80 mt-4">
              <div className="w-32 sm:w-44 flex-shrink-0" />
              <div className="flex-1 relative h-6">
                {xTicks.map((tick, tIdx) => {
                  const posPct = (tick / maxEarnings) * 100;
                  return (
                    <div
                      key={tIdx}
                      style={{ left: `${posPct}%` }}
                      className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                    >
                      <div className="w-px h-2 bg-slate-600" />
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        {tick}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis Label */}
            <div className="text-center text-xs font-semibold text-slate-400 tracking-wider pt-2">
              {columnName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { PivotTableData, AutoRefreshInterval } from '../types/savings';
import { TrendingUp, RefreshCw, ExternalLink, ShieldCheck, Clock, PlusCircle } from 'lucide-react';

interface Props {
  data: PivotTableData;
  autoRefreshInterval: AutoRefreshInterval;
  setAutoRefreshInterval: (interval: AutoRefreshInterval) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onQuickUpdateClick: () => void;
  spreadsheetUrl?: string;
}

export const SavingsOverview: React.FC<Props> = ({
  data,
  autoRefreshInterval,
  setAutoRefreshInterval,
  onRefresh,
  isRefreshing,
  onQuickUpdateClick,
  spreadsheetUrl,
}) => {
  const { metrics, formattedTotalSavings, spreadsheetTitle, sheetName, lastUpdated } = data;

  return (
    <div className="space-y-4">
      {/* Top Hero Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-5 sm:p-6 border border-emerald-500/20 shadow-xl shadow-black/40">
        {/* Ambient subtle glow background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header Row: Spreadsheet title & Live status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                Live Google Sheets Sync
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {lastUpdated}
              </span>
            </div>

            {/* Live status badge */}
          </div>

          {/* Big Savings Number */}
          <div>
            <div className="text-xs sm:text-sm font-medium text-slate-400">Total Net Savings</div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-1 flex items-baseline gap-2">
              <span className="bg-gradient-to-r from-emerald-200 via-teal-100 to-white bg-clip-text text-transparent">
                {formattedTotalSavings}
              </span>
            </div>
            {metrics.topCategory && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Primary account: <strong className="text-emerald-300">{metrics.topCategory.name}</strong> ({((metrics.topCategory.amount / (metrics.columnBTotal || metrics.totalSavings || 1)) * 100).toFixed(0)}%)
                </span>
              </p>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
            {/* Auto refresh interval switcher */}
            <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <span className="px-2 text-slate-500 hidden xs:inline">Auto-Sync:</span>
              {([0, 10, 30, 60] as AutoRefreshInterval[]).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setAutoRefreshInterval(sec)}
                  className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all ${
                    autoRefreshInterval === sec
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {sec === 0 ? 'Manual' : `${sec}s`}
                </button>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onQuickUpdateClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Update Sheet</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all disabled:opacity-60 cursor-pointer"
                title="Refresh from Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Category Breakdown Progress Bar (Derived strictly from Column B) */}
      {metrics.categoryBreakdown.length > 0 && (
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                Asset & Account Allocation
              </span>
              <span className="text-[10px] text-emerald-400 font-mono ml-2">
                (Column B: {data.headers[1] || 'Balance'})
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              Total:{' '}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: data.currencySymbol === '€' ? 'EUR' : data.currencySymbol === '£' ? 'GBP' : 'USD',
                maximumFractionDigits: 0,
              }).format(metrics.columnBTotal)}
            </span>
          </div>

          {/* Stacked Percentage Bar */}
          <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden flex shadow-inner">
            {metrics.categoryBreakdown.map((cat, i) => (
              <div
                key={i}
                style={{
                  width: `${cat.percentage}%`,
                  backgroundColor: cat.color,
                }}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                title={`${cat.category}: ${cat.percentage.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Category Chips / Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {metrics.categoryBreakdown.map((cat, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate font-medium">{cat.category}</span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-xs">
                  <span className="font-semibold text-slate-200">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: data.currencySymbol === '€' ? 'EUR' : data.currencySymbol === '£' ? 'GBP' : 'USD',
                      maximumFractionDigits: 0,
                    }).format(cat.amount)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

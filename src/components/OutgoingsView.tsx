import React, { useState, useMemo } from 'react';
import { OutgoingsData, OutgoingItem } from '../types/savings';
import {
  Calendar,
  CreditCard,
  Clock,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  ExternalLink,
  RefreshCw,
  Home,
  PiggyBank,
  Car,
  Dumbbell,
  Receipt,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface OutgoingsViewProps {
  data: OutgoingsData | null;
  isLoading: boolean;
  onRefresh: () => void;
  spreadsheetUrl?: string;
  errorMessage?: string | null;
}

export const OutgoingsView: React.FC<OutgoingsViewProps> = ({
  data,
  isLoading,
  onRefresh,
  spreadsheetUrl,
  errorMessage,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'settled' | 'ongoing' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  // Category icon helper based on item name
  const getItemIcon = (name: string, type: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('rent')) return <Home className="w-4 h-4 text-amber-400" />;
    if (lower.includes('saving')) return <PiggyBank className="w-4 h-4 text-emerald-400" />;
    if (lower.includes('car')) return <Car className="w-4 h-4 text-blue-400" />;
    if (lower.includes('gym')) return <Dumbbell className="w-4 h-4 text-rose-400" />;
    if (lower.includes('card') || lower.includes('paypal') || lower.includes('credit')) {
      return <CreditCard className="w-4 h-4 text-purple-400" />;
    }
    return <Receipt className="w-4 h-4 text-slate-400" />;
  };

  // Payment method badge colors
  const getMethodBadgeClass = (method: string) => {
    const lower = method.toLowerCase();
    if (lower.includes('direct debit')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (lower.includes('standing order')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (lower.includes('automatic')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (lower.includes('paye')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-700/50 text-slate-300 border-slate-600/40';
  };

  // Unique payment methods for filter
  const paymentMethods = useMemo(() => {
    if (!data?.items) return [];
    const set = new Set<string>();
    data.items.forEach((item) => {
      if (item.paymentMethod) set.add(item.paymentMethod);
    });
    return Array.from(set);
  }, [data]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((item) => {
      // Type filter
      if (filterType === 'settled' && !item.type.toLowerCase().includes('settled')) return false;
      if (filterType === 'ongoing' && !item.type.toLowerCase().includes('ongoing')) return false;
      if (filterType === 'upcoming' && !item.parsedNextDate) return false;

      // Method filter
      if (selectedMethod !== 'all' && item.paymentMethod !== selectedMethod) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesMethod = item.paymentMethod.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        if (!matchesName && !matchesMethod && !matchesType) return false;
      }

      return true;
    });
  }, [data, filterType, selectedMethod, searchQuery]);

  // Sort upcoming expenses by date
  const upcomingItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .filter((i) => i.parsedNextDate !== null)
      .sort((a, b) => (a.parsedNextDate?.getTime() || 0) - (b.parsedNextDate?.getTime() || 0));
  }, [data]);

  if (errorMessage && !data) {
    return (
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">Outgoings Tab Setup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-slate-200">Expected Columns in your 'Outgoings' tab:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">A: Name</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">B: Cost/Month</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">C: Amount until settled</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">D: Type</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">E: Frequency</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">F: Payment Method</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">G: Next Payment Date</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">H: Remaining Instalments</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Again</span>
          </button>
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <span>Open Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Monthly Outflow */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Monthly Outgoings</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-white font-mono">
            {data?.formattedTotalMonthlyCost || '£0.00'}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Fixed: £{data ? Math.round(data.ongoingMonthlyCost).toLocaleString() : '0'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Settling: £{data ? Math.round(data.untilSettledMonthlyCost).toLocaleString() : '0'}
            </span>
          </div>
        </div>

        {/* Total Debt / To Settle */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Until Settled</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-300 font-mono">
            {data?.formattedTotalUntilSettled || '£0.00'}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {data?.items.filter((i) => i.type.toLowerCase().includes('settled')).length || 0} scheduled balances
            </span>
            <span className="text-amber-400/80 font-medium">Credit cards & Pay in 3</span>
          </div>
        </div>

        {/* Next Scheduled Payments */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Upcoming Payment Dates</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          {upcomingItems.length > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-base font-semibold text-white flex items-center justify-between">
                <span className="truncate">{upcomingItems[0].name}</span>
                <span className="font-mono text-emerald-400 text-sm">{upcomingItems[0].formattedCost}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-sky-300 font-medium">{upcomingItems[0].nextPaymentDate}</span>
                {upcomingItems[0].remainingInstalments !== null && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-mono">
                    {upcomingItems[0].remainingInstalments} inst. left
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-500">No scheduled upcoming dates found</div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Filter Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterType === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({data?.items.length || 0})
            </button>
            <button
              onClick={() => setFilterType('settled')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterType === 'settled'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Until Settled ({data?.items.filter((i) => i.type.toLowerCase().includes('settled')).length || 0})
            </button>
            <button
              onClick={() => setFilterType('ongoing')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterType === 'ongoing'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ongoing ({data?.items.filter((i) => i.type.toLowerCase().includes('ongoing')).length || 0})
            </button>
            <button
              onClick={() => setFilterType('upcoming')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterType === 'upcoming'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              With Due Date ({upcomingItems.length})
            </button>
          </div>

          {/* Search Input & Method Select */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search outgoings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {paymentMethods.length > 0 && (
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="all">All Methods</option>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 transition-colors cursor-pointer"
              title="Refresh outgoings data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Outgoings Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-400">No scheduled expenses match your filter</p>
            <p className="text-xs text-slate-600">Try clearing your search or switching to "All"</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isSettled = item.type.toLowerCase().includes('settled');
            const hasDueCountdown = item.daysUntilDue !== null;

            return (
              <div
                key={`${item.name}-${idx}`}
                className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Icon, Name, and Badges */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 shrink-0 mt-0.5">
                    {getItemIcon(item.name, item.type)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                      
                      {/* Payment Method Badge */}
                      {item.paymentMethod && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${getMethodBadgeClass(
                            item.paymentMethod,
                          )}`}
                        >
                          {item.paymentMethod}
                        </span>
                      )}

                      {/* Type Badge */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                          isSettled
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>

                    {/* Due Date & Remaining details */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {item.nextPaymentDate && (
                        <span className="flex items-center gap-1 text-sky-400 font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>Next: {item.nextPaymentDate}</span>
                          {hasDueCountdown && (
                            <span className="text-[10px] text-sky-300/70">
                              ({item.daysUntilDue! > 0 ? `in ${item.daysUntilDue} days` : 'due today'})
                            </span>
                          )}
                        </span>
                      )}

                      {item.amountUntilSettled !== null && item.amountUntilSettled > 0 && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <CreditCard className="w-3 h-3" />
                          <span>Balance: {item.formattedUntilSettled}</span>
                        </span>
                      )}

                      {item.remainingInstalments !== null && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-mono border border-purple-500/20">
                          {item.remainingInstalments} instalment{item.remainingInstalments === 1 ? '' : 's'} remaining
                        </span>
                      )}

                      {item.amountUntilSettledRaw &&
                        item.amountUntilSettled === null &&
                        item.amountUntilSettledRaw.toLowerCase() === 'to update' && (
                          <span className="text-[10px] text-slate-500 italic">Balance to update</span>
                        )}
                    </div>
                  </div>
                </div>

                {/* Right: Cost & Frequency */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/60 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-bold text-white font-mono">{item.formattedCost}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                      {item.frequency || 'Monthly'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info / Sheet Status */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
        <span>
          Tab: <strong className="text-slate-400">{data?.sheetName || 'Outgoings'}</strong> • Last synced:{' '}
          {data?.lastUpdated || 'just now'}
        </span>
        {spreadsheetUrl && (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <span>Edit in Google Sheets</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

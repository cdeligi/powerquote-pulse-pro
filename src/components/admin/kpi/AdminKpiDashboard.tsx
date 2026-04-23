import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCheck, Clock3, RefreshCw, ShieldAlert, TimerReset, UserCircle2, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  kpiService,
  type ApprovalAgingLane,
  type ApprovalAgingOpenCase,
  type ApprovalAgingPayload,
} from '@/services/kpiService';
import type { User } from '@/types/auth';

interface Props {
  user: User;
}

type OwnerMode = 'queue_owner' | 'sales_owner' | 'lane_owner';
type RangePreset = 'today' | '7d' | '30d' | 'mtd' | 'custom';
type QuickFilter = 'all' | 'over_sla' | 'unclaimed_admin' | 'unclaimed_finance';

type ChartSeries = {
  key: string;
  label: string;
  color: string;
  total: number;
};

const AGE_BUCKETS = [
  { key: '0_1', label: '0-1d', minDays: 0, maxDays: 1 },
  { key: '1_2', label: '1-2d', minDays: 1, maxDays: 2 },
  { key: '2_4', label: '2-4d', minDays: 2, maxDays: 4 },
  { key: '4_7', label: '4-7d', minDays: 4, maxDays: 7 },
  { key: '7_14', label: '7-14d', minDays: 7, maxDays: 14 },
  { key: '14_30', label: '14-30d', minDays: 14, maxDays: 30 },
  { key: '30_plus', label: '30d+', minDays: 30, maxDays: Number.POSITIVE_INFINITY },
] as const;

const CHART_COLORS = [
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#c084fc',
  '#f97316',
  '#22d3ee',
  '#818cf8',
  '#f472b6',
];

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const formatAgeCompact = (seconds?: number | null, fallback = '—') => {
  if (seconds == null || !Number.isFinite(seconds)) return fallback;
  const days = seconds / 86400;
  if (days >= 10) return `${Math.round(days)}d`;
  if (days >= 1) return `${days.toFixed(1)}d`;
  const hours = seconds / 3600;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  return `${Math.max(0, Math.round(seconds / 60))}m`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

const clampPositive = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

const getAgeDays = (ageSeconds: number) => ageSeconds / 86400;

const getBucketForAge = (ageSeconds: number) => {
  const ageDays = ageSeconds / 86400;
  return AGE_BUCKETS.find((bucket) => ageDays >= bucket.minDays && ageDays < bucket.maxDays) ?? AGE_BUCKETS[AGE_BUCKETS.length - 1];
};

const getOwnerGrouping = (openCase: ApprovalAgingOpenCase, ownerMode: OwnerMode) => {
  if (ownerMode === 'sales_owner') {
    return {
      key: `sales:${openCase.salesOwnerLabel}`,
      label: openCase.salesOwnerLabel,
    };
  }

  if (ownerMode === 'lane_owner') {
    return {
      key: `lane:${openCase.lane}`,
      label: openCase.lane === 'finance' ? 'Finance Queue' : 'Admin Queue',
    };
  }

  return {
    key: `queue:${openCase.queueOwnerKey}`,
    label: openCase.queueOwnerLabel,
  };
};

const buildChartModel = (openCases: ApprovalAgingOpenCase[], ownerMode: OwnerMode) => {
  const buckets = new Map<string, { bucketLabel: string; total: number; owners: Map<string, { label: string; count: number }> }>();
  const ownerTotals = new Map<string, { label: string; total: number }>();

  AGE_BUCKETS.forEach((bucket) => {
    buckets.set(bucket.key, {
      bucketLabel: bucket.label,
      total: 0,
      owners: new Map(),
    });
  });

  openCases.forEach((openCase) => {
    const bucket = getBucketForAge(openCase.ageSeconds);
    const grouping = getOwnerGrouping(openCase, ownerMode);
    const bucketData = buckets.get(bucket.key);
    if (!bucketData) return;

    bucketData.total += 1;
    const current = bucketData.owners.get(grouping.key);
    bucketData.owners.set(grouping.key, {
      label: grouping.label,
      count: (current?.count ?? 0) + 1,
    });

    const total = ownerTotals.get(grouping.key);
    ownerTotals.set(grouping.key, {
      label: grouping.label,
      total: (total?.total ?? 0) + 1,
    });
  });

  const sortedOwners = Array.from(ownerTotals.entries())
    .sort((a, b) => b[1].total - a[1].total);

  const visibleOwners = sortedOwners.slice(0, 8);
  const hiddenOwnerKeys = new Set(sortedOwners.slice(8).map(([ownerKey]) => ownerKey));

  const series: ChartSeries[] = visibleOwners.map(([ownerKey, owner], index) => ({
    key: ownerKey,
    label: owner.label,
    color: CHART_COLORS[index % CHART_COLORS.length],
    total: owner.total,
  }));

  if (hiddenOwnerKeys.size > 0) {
    series.push({
      key: 'other',
      label: 'Other',
      color: '#94a3b8',
      total: sortedOwners.slice(8).reduce((sum, [, owner]) => sum + owner.total, 0),
    });
  }

  const data = AGE_BUCKETS.map((bucket) => {
    const bucketData = buckets.get(bucket.key)!;
    const row: Record<string, string | number> = {
      bucketLabel: bucketData.bucketLabel,
      total: bucketData.total,
    };

    series.forEach((item) => {
      row[item.key] = 0;
    });

    bucketData.owners.forEach((owner, ownerKey) => {
      const key = hiddenOwnerKeys.has(ownerKey) ? 'other' : ownerKey;
      row[key] = Number(row[key] || 0) + owner.count;
    });

    return row;
  });

  return { data, series };
};

const AgingChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;

  const rows = payload
    .filter((entry: any) => Number(entry.value) > 0)
    .sort((a: any, b: any) => Number(b.value) - Number(a.value));

  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur">
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="space-y-1.5">
        {rows.map((entry: any) => (
          <div key={entry.dataKey} className="flex min-w-[180px] items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const getOpenCaseSeverity = (openCase: ApprovalAgingOpenCase, slaDays: number) => {
  const ageDays = getAgeDays(openCase.ageSeconds);

  if (ageDays >= Math.max(slaDays * 2, 14)) {
    return {
      rowClass: 'bg-rose-500/[0.09] hover:bg-rose-500/[0.14]',
      ageClass: 'border-rose-400/40 bg-rose-400/15 text-rose-200',
      accentClass: 'bg-rose-400',
      label: 'Critical',
    };
  }

  if (ageDays >= slaDays) {
    return {
      rowClass: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.14]',
      ageClass: 'border-amber-400/40 bg-amber-400/15 text-amber-200',
      accentClass: 'bg-amber-300',
      label: 'Over SLA',
    };
  }

  if (!openCase.isClaimed) {
    return {
      rowClass: 'bg-orange-500/[0.06] hover:bg-orange-500/[0.11]',
      ageClass: 'border-orange-400/35 bg-orange-400/10 text-orange-200',
      accentClass: 'bg-orange-300',
      label: 'Unclaimed',
    };
  }

  return {
    rowClass: 'bg-transparent hover:bg-white/[0.05]',
    ageClass: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
    accentClass: 'bg-emerald-300',
    label: 'Healthy',
  };
};

export default function AdminKpiDashboard({ user }: Props) {
  const navigate = useNavigate();
  const [lane, setLane] = useState<ApprovalAgingLane>('all');
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('queue_owner');
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [startDate, setStartDate] = useState(toDateInput(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(toDateInput(new Date()));
  const [slaDays, setSlaDays] = useState(2);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<ApprovalAgingPayload | null>(null);
  const [focusedOwnerKey, setFocusedOwnerKey] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  useEffect(() => {
    kpiService
      .getDefaultSlaHours()
      .then((hours) => setSlaDays(Math.max(1, Math.round(hours / 24))))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (rangePreset === 'custom') return;

    const now = new Date();
    const nextEnd = toDateInput(now);

    if (rangePreset === 'today') {
      setStartDate(toDateInput(now));
      setEndDate(nextEnd);
      return;
    }

    if (rangePreset === '7d') {
      setStartDate(toDateInput(new Date(Date.now() - 7 * 86400000)));
      setEndDate(nextEnd);
      return;
    }

    if (rangePreset === '30d') {
      setStartDate(toDateInput(new Date(Date.now() - 30 * 86400000)));
      setEndDate(nextEnd);
      return;
    }

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    setStartDate(toDateInput(monthStart));
    setEndDate(nextEnd);
  }, [rangePreset]);

  const load = async () => {
    try {
      setLoading(true);
      const nextPayload = await kpiService.getApprovalAgingDashboard({
        start: new Date(`${startDate}T00:00:00Z`),
        end: new Date(`${endDate}T23:59:59Z`),
        lane,
        slaHours: Math.max(1, slaDays) * 24,
      });
      setPayload(nextPayload);
    } catch (error: any) {
      toast({
        title: 'KPI error',
        description: error?.message || 'Failed to load approval aging metrics.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFocusedOwnerKey(null);
  }, [ownerMode, lane]);

  useEffect(() => {
    setQuickFilter('all');
  }, [lane, startDate, endDate, slaDays]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane, startDate, endDate, slaDays]);

  const openCases = payload?.openCases ?? [];
  const quickFilteredCases = useMemo(() => {
    switch (quickFilter) {
      case 'over_sla':
        return openCases.filter((openCase) => getAgeDays(openCase.ageSeconds) >= slaDays);
      case 'unclaimed_admin':
        return openCases.filter((openCase) => openCase.lane === 'admin' && !openCase.isClaimed);
      case 'unclaimed_finance':
        return openCases.filter((openCase) => openCase.lane === 'finance' && !openCase.isClaimed);
      default:
        return openCases;
    }
  }, [openCases, quickFilter, slaDays]);

  const { data: chartData, series: chartSeries } = useMemo(
    () => buildChartModel(quickFilteredCases, ownerMode),
    [quickFilteredCases, ownerMode],
  );

  const ownerBoard = useMemo(
    () => (payload?.ownerBoard ?? []).slice().sort((a, b) => {
      const openDiff = b.openOwned - a.openOwned;
      if (openDiff !== 0) return openDiff;

      const overSlaDiff = b.overSlaOpen - a.overSlaOpen;
      if (overSlaDiff !== 0) return overSlaDiff;

      return b.closed - a.closed;
    }),
    [payload?.ownerBoard],
  );

  const visibleCases = useMemo(() => {
    if (!focusedOwnerKey) return quickFilteredCases;

    return quickFilteredCases.filter((openCase) => getOwnerGrouping(openCase, ownerMode).key === focusedOwnerKey);
  }, [focusedOwnerKey, quickFilteredCases, ownerMode]);

  const oldestCases = useMemo(
    () => visibleCases.slice().sort((a, b) => b.ageSeconds - a.ageSeconds).slice(0, 12),
    [visibleCases],
  );

  const summary = payload?.summary;

  const summaryCards = [
    {
      key: 'open',
      title: 'Open Approvals',
      value: String(summary?.openCases ?? 0),
      detail: 'Current cases still waiting for a final decision',
      filter: 'all' as QuickFilter,
      interactive: true,
      icon: TimerReset,
      accent: 'from-sky-500/20 via-cyan-400/10 to-transparent',
      valueClass: 'text-sky-300',
    },
    {
      key: 'sla',
      title: 'Over SLA',
      value: String(summary?.overSla ?? 0),
      detail: `Cases older than ${slaDays} days`,
      filter: 'over_sla' as QuickFilter,
      interactive: true,
      icon: AlertTriangle,
      accent: 'from-rose-500/20 via-orange-400/10 to-transparent',
      valueClass: 'text-rose-300',
    },
    {
      key: 'admin-unclaimed',
      title: 'Unclaimed Admin',
      value: String(summary?.unclaimedAdmin ?? 0),
      detail: 'Open admin reviews with no current owner',
      filter: 'unclaimed_admin' as QuickFilter,
      interactive: true,
      icon: UserCircle2,
      accent: 'from-amber-500/20 via-yellow-400/10 to-transparent',
      valueClass: 'text-amber-300',
    },
    {
      key: 'finance-unclaimed',
      title: 'Unclaimed Finance',
      value: String(summary?.unclaimedFinance ?? 0),
      detail: 'Finance queue waiting for someone to take it',
      filter: 'unclaimed_finance' as QuickFilter,
      interactive: true,
      icon: ShieldAlert,
      accent: 'from-fuchsia-500/20 via-pink-400/10 to-transparent',
      valueClass: 'text-fuchsia-300',
    },
    {
      key: 'median',
      title: 'Median Open Age',
      value: formatAgeCompact(summary?.medianOpenAgeSeconds),
      detail: 'More reliable than average when outliers exist',
      filter: 'all' as QuickFilter,
      interactive: false,
      icon: Clock3,
      accent: 'from-emerald-500/20 via-teal-400/10 to-transparent',
      valueClass: 'text-emerald-300',
    },
    {
      key: 'oldest',
      title: 'Oldest Open Case',
      value: formatAgeCompact(summary?.oldestOpenAgeSeconds),
      detail: 'The single case at highest response risk',
      filter: 'all' as QuickFilter,
      interactive: false,
      icon: Users,
      accent: 'from-violet-500/20 via-indigo-400/10 to-transparent',
      valueClass: 'text-violet-300',
    },
  ];

  const quickFilterLabel = (
    quickFilter === 'over_sla'
      ? `Over SLA · ${quickFilteredCases.length} case${quickFilteredCases.length === 1 ? '' : 's'}`
      : quickFilter === 'unclaimed_admin'
        ? `Unclaimed Admin Queue · ${quickFilteredCases.length} case${quickFilteredCases.length === 1 ? '' : 's'}`
        : quickFilter === 'unclaimed_finance'
          ? `Unclaimed Finance Queue · ${quickFilteredCases.length} case${quickFilteredCases.length === 1 ? '' : 's'}`
          : null
  );

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.95)_55%,rgba(30,41,59,0.92))] text-white shadow-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-sky-200">
                Approval Aging Control Tower
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-white">Get cases reviewed before they get old.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  This dashboard keeps the clock running from the moment a quote enters approval until final approve or reject.
                  It is built to expose aging, unclaimed work, and who is actually moving cases to closure.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <Badge className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                Open Queue Now
              </Badge>
              <Badge className="border border-white/10 bg-white/5 text-slate-200">
                Activity Range: {rangePreset === 'today' ? 'Today' : rangePreset === '7d' ? 'Last 7 days' : rangePreset === '30d' ? 'Last 30 days' : rangePreset === 'mtd' ? 'Month to date' : 'Custom'}
              </Badge>
              <span className="text-slate-400">Updated {formatDateTime(payload?.generatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/80 text-white shadow-xl">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Lane</Label>
              <Select value={lane} onValueChange={(value: ApprovalAgingLane) => setLane(value)}>
                <SelectTrigger className="mt-2 border-white/10 bg-slate-900 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-900 text-white">
                  <SelectItem value="all">All lanes</SelectItem>
                  <SelectItem value="admin">Admin only</SelectItem>
                  <SelectItem value="finance">Finance only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Color By</Label>
              <Select value={ownerMode} onValueChange={(value: OwnerMode) => setOwnerMode(value)}>
                <SelectTrigger className="mt-2 border-white/10 bg-slate-900 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-900 text-white">
                  <SelectItem value="queue_owner">Queue owner</SelectItem>
                  <SelectItem value="sales_owner">Sales owner</SelectItem>
                  <SelectItem value="lane_owner">Lane owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Activity Range</Label>
              <Select value={rangePreset} onValueChange={(value: RangePreset) => setRangePreset(value)}>
                <SelectTrigger className="mt-2 border-white/10 bg-slate-900 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-900 text-white">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="mtd">Month to date</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Start</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setRangePreset('custom');
                  setStartDate(event.target.value);
                }}
                className="mt-2 border-white/10 bg-slate-900 text-white"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">End</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setRangePreset('custom');
                  setEndDate(event.target.value);
                }}
                className="mt-2 border-white/10 bg-slate-900 text-white"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">SLA Days</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={slaDays}
                  onChange={(event) => setSlaDays(clampPositive(Number(event.target.value || 2)) || 2)}
                  className="border-white/10 bg-slate-900 text-white"
                />
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={async () => {
                    try {
                      await kpiService.saveDefaultSlaHours(Math.max(1, slaDays) * 24);
                      toast({ title: 'Saved', description: 'Default KPI SLA updated.' });
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error?.message || 'Could not save KPI SLA.',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={load}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh dashboard'}
            </Button>
            {focusedOwnerKey && (
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setFocusedOwnerKey(null)}
              >
                Clear owner focus
              </Button>
            )}
            {quickFilter !== 'all' && (
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setQuickFilter('all')}
              >
                Clear KPI filter
              </Button>
            )}
            <span className="text-xs text-slate-400">
              Open age never pauses. It stops only when the quote is approved or rejected.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          const isActive = item.interactive && quickFilter === item.filter;

          return (
            <button
              key={item.key}
              type="button"
              disabled={!item.interactive}
              onClick={() => {
                if (!item.interactive) return;
                setFocusedOwnerKey(null);
                setQuickFilter(item.filter);
              }}
              className={`h-full w-full text-left ${item.key === 'median' || item.key === 'oldest' ? 'md:col-span-1' : 'md:col-span-1'} ${item.interactive ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <Card
                className={`h-full min-h-[220px] overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] text-white shadow-xl transition ${item.interactive ? 'hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl' : ''} ${isActive ? 'border-sky-400/50 ring-1 ring-sky-400/30' : ''}`}
              >
                <CardContent className="relative flex h-full flex-col p-5">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.title}</div>
                        <div className={`mt-4 text-4xl font-semibold tracking-tight ${item.valueClass}`}>{item.value}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <p className="mt-4 min-h-[3rem] text-sm leading-6 text-slate-300">{item.detail}</p>
                    <div className="mt-auto pt-4 flex items-center justify-between text-xs">
                      <span className={item.interactive ? 'text-slate-300' : 'text-slate-500'}>
                        {item.interactive ? (isActive ? 'Filter active' : 'Click to focus') : 'Insight card'}
                      </span>
                      {item.interactive && (
                        <span className={`rounded-full border px-2 py-1 ${isActive ? 'border-sky-400/40 bg-sky-400/15 text-sky-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                          {isActive ? 'Focused' : 'Ready'}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.97))] text-white shadow-2xl xl:col-span-8">
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Open quotes vs age</div>
                <CardTitle className="mt-2 text-2xl text-white">Where the queue is getting old</CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Stack color can flip between current queue owner, sales owner, or lane owner so you can see who is carrying the aging inventory.
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>{quickFilteredCases.length} open case{quickFilteredCases.length === 1 ? '' : 's'} in view</div>
                <div>{summary?.overSla ?? 0} already over SLA</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {quickFilterLabel && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="border border-sky-400/35 bg-sky-400/10 text-sky-200">
                  {quickFilterLabel}
                </Badge>
                <span className="text-xs text-slate-400">Top KPI cards now act as instant queue filters.</span>
              </div>
            )}
            {loading ? (
              <div className="flex h-[380px] items-center justify-center text-slate-400">Loading chart...</div>
            ) : quickFilteredCases.length === 0 ? (
              <div className="flex h-[380px] flex-col items-center justify-center gap-2 text-center text-slate-400">
                <CheckCheck className="h-10 w-10 text-emerald-300" />
                <div className="text-lg font-medium text-white">No open approvals in this view</div>
                <div className="max-w-md text-sm">The queue is clear for the selected lane filter. Change the lane or refresh if you expect active work.</div>
              </div>
            ) : (
              <>
                <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="18%">
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#243246" />
                      <XAxis dataKey="bucketLabel" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <Tooltip content={<AgingChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                      {chartSeries.map((item) => (
                        <Bar
                          key={item.key}
                          dataKey={item.key}
                          name={item.label}
                          stackId="age"
                          fill={item.color}
                          radius={[10, 10, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {chartSeries.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.key === 'other') return;
                        setFocusedOwnerKey(item.key === focusedOwnerKey ? null : item.key);
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${focusedOwnerKey === item.key ? 'border-white bg-white/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                      <span className="text-slate-400">{item.total}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.97))] text-white shadow-2xl xl:sticky xl:top-24 xl:col-span-4 xl:self-start">
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Ownership board</div>
            <CardTitle className="mt-2 text-2xl text-white">Taken vs closed</CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Open owned is live now. Taken, closed, and released-to-finance follow the selected activity range.
            </p>
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-3 overflow-y-auto p-5">
            {loading ? (
              <div className="py-20 text-center text-slate-400">Loading ownership board...</div>
            ) : ownerBoard.length === 0 ? (
              <div className="py-20 text-center text-slate-400">No reviewer activity found for the selected range.</div>
            ) : (
              ownerBoard.map((row) => {
                const rowFocusKey = row.ownerType === 'reviewer'
                  ? `queue:${row.ownerKey}`
                  : row.ownerType === 'unclaimed_finance'
                    ? 'queue:unclaimed_finance'
                    : 'queue:unclaimed_admin';
                const isFocused = focusedOwnerKey === rowFocusKey;
                const riskLevel = row.overSlaOpen >= 3 ? 'high' : row.overSlaOpen > 0 ? 'medium' : 'low';

                return (
                  <button
                    key={row.ownerKey}
                    type="button"
                    onClick={() => {
                      if (ownerMode !== 'queue_owner') {
                        setOwnerMode('queue_owner');
                      }
                      setFocusedOwnerKey(isFocused ? null : rowFocusKey);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${isFocused ? 'border-sky-400/60 bg-sky-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-white">{row.ownerLabel}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {row.ownerType === 'reviewer' ? (row.role || 'Reviewer') : row.ownerType === 'unclaimed_finance' ? 'Finance queue' : 'Admin queue'}
                        </div>
                      </div>
                      <Badge className={`border ${riskLevel === 'high' ? 'border-rose-400/40 bg-rose-400/15 text-rose-200' : riskLevel === 'medium' ? 'border-amber-400/40 bg-amber-400/15 text-amber-200' : 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'}`}>
                        {row.openOwned} open
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Taken</div>
                        <div className="mt-1 text-lg font-semibold text-white">{row.taken}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Closed</div>
                        <div className="mt-1 text-lg font-semibold text-white">{row.closed}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Approved / Rejected</div>
                        <div className="mt-1 text-lg font-semibold text-white">{row.approved} / {row.rejected}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Over SLA Open</div>
                        <div className="mt-1 text-lg font-semibold text-white">{row.overSlaOpen}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Median Close Age</div>
                        <div className="mt-1 text-lg font-semibold text-white">{formatAgeCompact(row.medianCloseAgeSeconds)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Released to Finance</div>
                        <div className="mt-1 text-lg font-semibold text-white">{row.releasedToFinance}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.97))] text-white shadow-2xl">
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Action list</div>
              <CardTitle className="mt-2 text-2xl text-white">Oldest cases needing attention</CardTitle>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Start here when you want the queue to move. The table is always sorted by current age, oldest first.
              </p>
            </div>
            <div className="text-sm text-slate-400">
              {focusedOwnerKey ? 'Filtered to selected owner from chart / board' : 'Showing highest-risk open approvals'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading cases...</div>
          ) : oldestCases.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No open cases match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quote</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Sales Owner</th>
                    <th className="px-4 py-3 font-medium">Queue Owner</th>
                    <th className="px-4 py-3 font-medium">Lane</th>
                    <th className="px-4 py-3 font-medium">Current Age</th>
                    <th className="px-4 py-3 font-medium">Margin Signal</th>
                    <th className="px-4 py-3 font-medium">Claim</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {oldestCases.map((openCase) => {
                    const marginSignal = openCase.requiresFinanceApproval
                      ? (openCase.financeLimitPercent != null && openCase.discountedMargin != null
                        ? `${openCase.discountedMargin.toFixed(1)}% vs ${openCase.financeLimitPercent.toFixed(1)}% guardrail`
                        : 'Finance review required')
                      : (openCase.discountedMargin != null ? `${openCase.discountedMargin.toFixed(1)}% margin` : 'Standard review');
                    const severity = getOpenCaseSeverity(openCase, slaDays);

                    return (
                      <tr
                        key={openCase.quoteId}
                        className={`group cursor-pointer transition ${severity.rowClass}`}
                        onClick={() => navigate(`/quote/${encodeURIComponent(openCase.quoteId)}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`h-2.5 w-2.5 rounded-full ${severity.accentClass}`} />
                            <span className="font-mono text-sm text-sky-300">{openCase.quoteId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white">{openCase.customerName}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{openCase.salesOwnerLabel}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">{openCase.queueOwnerLabel}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge className={openCase.lane === 'finance' ? 'border border-amber-400/40 bg-amber-400/15 text-amber-200' : 'border border-sky-400/40 bg-sky-400/15 text-sky-200'}>
                            {openCase.lane === 'finance' ? 'Finance' : 'Admin'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${severity.ageClass}`}>
                            <span>{formatAgeCompact(openCase.ageSeconds)}</span>
                            <span className="text-[10px] uppercase tracking-[0.16em] opacity-80">{severity.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{marginSignal}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge className={openCase.isClaimed ? 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-200' : 'border border-rose-400/40 bg-rose-400/15 text-rose-200'}>
                            {openCase.isClaimed ? 'Claimed' : 'Unclaimed'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            className="text-slate-300 hover:bg-white/10 hover:text-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/quote/${encodeURIComponent(openCase.quoteId)}`);
                            }}
                          >
                            Open
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

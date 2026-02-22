import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import type { User } from '@/types/auth';
import { kpiService, KpiBucket, KpiLane, KpiPayload, secondsToHours, secondsToDays } from '@/services/kpiService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface Props {
  user: User;
}

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const pct = (num: number, den: number) => (den ? ((num / den) * 100).toFixed(1) : '0.0');

export default function AdminKpiDashboard({ user }: Props) {
  const [lane, setLane] = useState<KpiLane>('both');
  const [bucket, setBucket] = useState<KpiBucket>('day');
  const [rangePreset, setRangePreset] = useState<'7' | '14' | '30' | '90' | 'custom'>('30');
  const [startDate, setStartDate] = useState(toDateInput(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(toDateInput(new Date()));
  const [slaHours, setSlaHours] = useState(48);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<KpiPayload | null>(null);
  const [userMap, setUserMap] = useState<Record<string, { name: string; email: string; role: string }>>({});
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    kpiService.getDefaultSlaHours().then(setSlaHours).catch(() => null);
  }, []);

  useEffect(() => {
    if (rangePreset === 'custom') return;
    const days = Number(rangePreset);
    setStartDate(toDateInput(new Date(Date.now() - days * 86400000)));
    setEndDate(toDateInput(new Date()));
  }, [rangePreset]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await kpiService.getKpiMetrics({
        start: new Date(`${startDate}T00:00:00Z`),
        end: new Date(`${endDate}T23:59:59Z`),
        bucket,
        lane,
        slaHours,
      });
      setPayload(data);

      const ids = Array.from(new Set((data.per_user || []).map((r) => r.user_id).filter(Boolean))) as string[];
      const users = await kpiService.resolveUsers(ids);
      setUserMap(users);
    } catch (error: any) {
      toast({ title: 'KPI error', description: error?.message || 'Failed to load KPI data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane, bucket, startDate, endDate, slaHours]);

  const leaderboard = useMemo(() => {
    const rows = (payload?.per_user || []).map((r) => ({
      ...r,
      user_name: r.user_id ? (userMap[r.user_id]?.name || userMap[r.user_id]?.email || r.user_id) : 'Unassigned',
      otd: Number(pct(r.met_sla || 0, r.considered_sla || 0)),
      avg_claim_d: secondsToDays(r.avg_claim_seconds),
      avg_work_d: secondsToDays(r.avg_work_seconds),
      avg_cycle_d: secondsToDays(r.avg_cycle_seconds),
    }));

    return rows.sort((a, b) => (b.completed || 0) - (a.completed || 0));
  }, [payload?.per_user, userMap]);

  const ts = (payload?.timeseries || []).map((r) => ({
    bucket: String(r.bucket_start).slice(0, 10),
    submitted: r.submitted,
    completed: r.completed,
    avgCycleD: secondsToDays(r.avg_cycle_seconds),
    otd: Number(pct(r.met_sla || 0, r.considered_sla || 0)),
  }));

  const s = payload?.summary;
  const backlogAdmin = payload?.backlog?.admin;
  const backlogFinance = payload?.backlog?.finance;
  const backlogThresholdDays = Number((slaHours / 24).toFixed(1));

  return (
    <div className="space-y-4">
      <div className="text-gray-300 text-sm">KPI Dashboard · {user.name}</div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-gray-300">Lane</Label>
          <Select value={lane} onValueChange={(v: KpiLane) => setLane(v)}>
            <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="both">Both</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="admin">Admin</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300">Bucket</Label>
          <Select value={bucket} onValueChange={(v: KpiBucket) => setBucket(v)}>
            <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="day">Day</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="week">Week</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="biweek">Biweekly</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300">Range</Label>
          <Select value={rangePreset} onValueChange={(v: any) => setRangePreset(v)}>
            <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="7">Last 7d</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="14">Last 14d</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="30">Last 30d</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="90">Last 90d</SelectItem>
              <SelectItem className="text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white" value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300">Start</Label>
          <Input type="date" value={startDate} onChange={(e) => { setRangePreset('custom'); setStartDate(e.target.value); }} className="bg-gray-800 border-gray-700 text-white" />
        </div>
        <div>
          <Label className="text-gray-300">End</Label>
          <Input type="date" value={endDate} onChange={(e) => { setRangePreset('custom'); setEndDate(e.target.value); }} className="bg-gray-800 border-gray-700 text-white" />
        </div>
        <div>
          <Label className="text-gray-300">SLA Hours</Label>
          <Input type="number" min={1} value={slaHours} onChange={(e) => setSlaHours(Number(e.target.value || 48))} className="w-[110px] bg-gray-800 border-gray-700 text-white" />
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={async () => { try { await kpiService.saveDefaultSlaHours(slaHours); toast({ title: 'Saved', description: 'Default SLA updated.' }); } catch (e: any) { toast({ title: 'Error', description: e?.message || 'Could not save SLA', variant: 'destructive' }); } }}>
          Save as default
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">OTD ≤ SLA</CardTitle></CardHeader><CardContent className="text-2xl text-green-400">{pct(s?.met_sla || 0, s?.considered_sla || 0)}%</CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Avg Cycle (d)</CardTitle></CardHeader><CardContent className="text-2xl text-white">{secondsToDays(s?.avg_total_cycle_seconds)}</CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Avg Admin Claim (d)</CardTitle></CardHeader><CardContent className="text-2xl text-white">{secondsToDays(s?.avg_admin_claim_seconds)}</CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Avg Admin Work (d)</CardTitle></CardHeader><CardContent className="text-2xl text-white">{secondsToDays(s?.avg_admin_work_seconds)}</CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Avg Finance Claim (d)</CardTitle></CardHeader><CardContent className="text-2xl text-white">{secondsToDays(s?.avg_finance_claim_seconds)}</CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Avg Finance Work (d)</CardTitle></CardHeader><CardContent className="text-2xl text-white">{secondsToDays(s?.avg_finance_work_seconds)}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Admin Backlog / &gt;SLA / Avg Age(h)</CardTitle></CardHeader><CardContent className="text-gray-200">{backlogAdmin?.backlog || 0} / {backlogAdmin?.backlog_over_sla || 0} / {secondsToHours(backlogAdmin?.avg_age_seconds)}</CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Finance Backlog / &gt;SLA / Avg Age(h)</CardTitle></CardHeader><CardContent className="text-gray-200">{backlogFinance?.backlog || 0} / {backlogFinance?.backlog_over_sla || 0} / {secondsToHours(backlogFinance?.avg_age_seconds)}</CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-gray-800 w-full flex overflow-x-auto whitespace-nowrap h-auto p-1 gap-1">
          <TabsTrigger value="overview" className="shrink-0 text-white data-[state=active]:bg-red-600">Overview</TabsTrigger>
          <TabsTrigger value="admin" className="shrink-0 text-white data-[state=active]:bg-red-600">Admin Lane</TabsTrigger>
          <TabsTrigger value="finance" className="shrink-0 text-white data-[state=active]:bg-red-600">Finance Lane</TabsTrigger>
          <TabsTrigger value="leaderboard" className="shrink-0 text-white data-[state=active]:bg-red-600">Leaderboard</TabsTrigger>
          <TabsTrigger value="backlog" className="shrink-0 text-white data-[state=active]:bg-red-600">Backlog</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white">Average Cycle Time Trend (d)</CardTitle></CardHeader><CardContent className="h-72">{loading ? <div className="text-gray-400">Loading...</div> : <ResponsiveContainer width="100%" height="100%"><LineChart data={ts}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="bucket" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Line type="monotone" dataKey="avgCycleD" stroke="#22c55e" strokeWidth={2} /></LineChart></ResponsiveContainer>}</CardContent></Card>
          <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white">Completed vs Submitted</CardTitle></CardHeader><CardContent className="h-72">{loading ? <div className="text-gray-400">Loading...</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={ts}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="bucket" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Bar dataKey="submitted" fill="#64748b" /><Bar dataKey="completed" fill="#ef4444" /></BarChart></ResponsiveContainer>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="admin"><Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white">Admin lane focus</CardTitle></CardHeader><CardContent className="text-gray-300">Use lane filter = Admin to isolate claim/work bottlenecks before finance handoff.</CardContent></Card></TabsContent>
        <TabsContent value="finance"><Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white">Finance lane focus</CardTitle></CardHeader><CardContent className="text-gray-300">Use lane filter = Finance to isolate queueing after finance_required_at and processing time after claim.</CardContent></Card></TabsContent>

        <TabsContent value="leaderboard">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Productivity Ranking by User</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-gray-400 border-b border-gray-700"><tr><th>User</th><th>Completed</th><th>Approved</th><th>Rejected</th><th>OTD%</th><th>Avg Claim(d)</th><th>Avg Work(d)</th><th>Avg Cycle(d)</th></tr></thead>
                <tbody>
                  {leaderboard.map((r, i) => (
                    <tr key={`${r.user_id}-${i}`} className="border-b border-gray-800 text-gray-200">
                      <td>{r.user_name}</td><td>{r.completed || 0}</td><td>{r.approved || 0}</td><td>{r.rejected || 0}</td><td>{pct(r.met_sla || 0, r.considered_sla || 0)}%</td><td>{r.avg_claim_d}</td><td>{r.avg_work_d}</td><td>{r.avg_cycle_d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backlog">
          <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white">Backlog Aging (Avg Age Trend proxy)</CardTitle></CardHeader><CardContent className="h-72">{loading ? <div className="text-gray-400">Loading...</div> : <ResponsiveContainer width="100%" height="100%"><LineChart data={ts}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="bucket" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Line type="monotone" dataKey="otd" stroke="#f59e0b" strokeWidth={2} /></LineChart></ResponsiveContainer>}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { getSupabaseClient } from '@/integrations/supabase/client';

const supabase = getSupabaseClient();

export type KpiBucket = 'day' | 'week' | 'biweek' | 'month';
export type KpiLane = 'admin' | 'finance' | 'both';

export interface KpiSummary {
  total_submitted: number;
  total_completed: number;
  approved: number;
  rejected: number;
  avg_total_cycle_seconds: number | null;
  avg_admin_claim_seconds: number | null;
  avg_admin_work_seconds: number | null;
  avg_finance_claim_seconds: number | null;
  avg_finance_work_seconds: number | null;
  met_sla: number;
  considered_sla: number;
}

export interface KpiBacklogLane {
  backlog: number;
  backlog_over_sla: number;
  avg_age_seconds: number | null;
}

export interface KpiTimeseriesPoint {
  bucket_start: string;
  submitted: number;
  completed: number;
  avg_cycle_seconds: number | null;
  met_sla: number;
  considered_sla: number;
}

export interface KpiPerUser {
  user_id: string | null;
  completed: number;
  approved: number;
  rejected: number;
  avg_cycle_seconds: number | null;
  avg_claim_seconds: number | null;
  avg_work_seconds: number | null;
  met_sla: number;
  considered_sla: number;
}

export interface KpiPayload {
  summary: KpiSummary;
  backlog: {
    admin: KpiBacklogLane;
    finance: KpiBacklogLane;
  };
  timeseries: KpiTimeseriesPoint[];
  per_user: KpiPerUser[];
}

interface KpiFactRow {
  status?: string | null;
  submitted_at?: string | null;
  requires_finance?: boolean | null;
  requires_finance_approval?: boolean | null;
  admin_reviewer_id?: string | null;
  finance_reviewer_id?: string | null;
  admin_claimed_at?: string | null;
  admin_decision_at?: string | null;
  finance_required_at?: string | null;
  finance_claimed_at?: string | null;
  finance_decision_at?: string | null;
  reviewed_at?: string | null;
  total_cycle_seconds?: number | null;
  admin_claim_seconds?: number | null;
  admin_work_seconds?: number | null;
  finance_claim_seconds?: number | null;
  finance_work_seconds?: number | null;
}

export const secondsToHours = (seconds?: number | null): number =>
  seconds == null ? 0 : Number((seconds / 3600).toFixed(2));

const avg = (values: Array<number | null | undefined>): number | null => {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const emptyPayload = (): KpiPayload => ({
  summary: {
    total_submitted: 0,
    total_completed: 0,
    approved: 0,
    rejected: 0,
    avg_total_cycle_seconds: null,
    avg_admin_claim_seconds: null,
    avg_admin_work_seconds: null,
    avg_finance_claim_seconds: null,
    avg_finance_work_seconds: null,
    met_sla: 0,
    considered_sla: 0,
  },
  backlog: {
    admin: { backlog: 0, backlog_over_sla: 0, avg_age_seconds: null },
    finance: { backlog: 0, backlog_over_sla: 0, avg_age_seconds: null },
  },
  timeseries: [],
  per_user: [],
});

const bucketStartIso = (d: Date, bucket: KpiBucket): string => {
  const dt = new Date(d);
  if (bucket === 'day') dt.setUTCHours(0, 0, 0, 0);
  if (bucket === 'week' || bucket === 'biweek') {
    const day = dt.getUTCDay();
    const diff = (day + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - diff);
    dt.setUTCHours(0, 0, 0, 0);
    if (bucket === 'biweek') {
      const week = Math.floor((dt.getTime() / 86400000 + 4) / 7);
      if (week % 2 === 1) dt.setUTCDate(dt.getUTCDate() - 7);
    }
  }
  if (bucket === 'month') {
    dt.setUTCDate(1);
    dt.setUTCHours(0, 0, 0, 0);
  }
  return dt.toISOString();
};

const hasMeaningfulRpcData = (payload: any) => {
  if (!payload) return false;
  const total = Number(payload?.summary?.total_submitted || 0);
  const tsLen = Array.isArray(payload?.timeseries) ? payload.timeseries.length : 0;
  const usersLen = Array.isArray(payload?.per_user) ? payload.per_user.length : 0;
  return total > 0 || tsLen > 0 || usersLen > 0;
};

const sec = (a?: string | null, b?: string | null) => {
  if (!a || !b) return null;
  return (new Date(b).getTime() - new Date(a).getTime()) / 1000;
};

const buildPayloadFromFacts = (
  rows: KpiFactRow[],
  params: { bucket: KpiBucket; lane: KpiLane; slaHours: number },
): KpiPayload => {
  if (!rows.length) return emptyPayload();

  const now = Date.now();
  const slaSec = params.slaHours * 3600;

  const facts = rows.map((q) => {
    const submittedAt = q.submitted_at;
    const requiresFinance = Boolean(q.requires_finance ?? q.requires_finance_approval);

    const adminDecision = q.admin_decision_at || q.reviewed_at;
    const financeRequiredAt = q.finance_required_at;
    const financeDecision = q.finance_decision_at;
    const finalDecision = requiresFinance ? financeDecision : adminDecision;

    const adminClaimSec =
      typeof q.admin_claim_seconds === 'number' ? q.admin_claim_seconds : sec(submittedAt, q.admin_claimed_at);
    const adminWorkSec =
      typeof q.admin_work_seconds === 'number' ? q.admin_work_seconds : sec(q.admin_claimed_at, adminDecision);
    const financeClaimSec =
      typeof q.finance_claim_seconds === 'number' ? q.finance_claim_seconds : sec(financeRequiredAt, q.finance_claimed_at);
    const financeWorkSec =
      typeof q.finance_work_seconds === 'number' ? q.finance_work_seconds : sec(q.finance_claimed_at, financeDecision);
    const totalCycleSec =
      typeof q.total_cycle_seconds === 'number' ? q.total_cycle_seconds : sec(submittedAt, finalDecision);

    return {
      ...q,
      submittedAt,
      requiresFinance,
      finalDecision,
      adminClaimSec,
      adminWorkSec,
      financeClaimSec,
      financeWorkSec,
      totalCycleSec,
      financeRequiredAt,
    };
  }).filter((q) => {
    if (!q.submittedAt) return false;
    if (params.lane === 'admin') return !q.requiresFinance;
    if (params.lane === 'finance') return q.requiresFinance;
    return true;
  });

  if (!facts.length) return emptyPayload();

  const completed = facts.filter((f) => !!f.finalDecision);
  const metSla = completed.filter((f) => (f.totalCycleSec || Infinity) <= slaSec).length;

  const adminBacklog = facts.filter((f) => !f.requiresFinance && !f.admin_claimed_at);
  const financeBacklog = facts.filter((f) => f.requiresFinance && f.financeRequiredAt && !f.finance_claimed_at);

  const backlogAge = (startCol: 'submittedAt' | 'financeRequiredAt', arr: any[]) =>
    arr
      .map((r) => {
        const start = r[startCol];
        if (!start) return null;
        return (now - new Date(start).getTime()) / 1000;
      })
      .filter((v: number | null): v is number => typeof v === 'number' && Number.isFinite(v));

  const byBucket: Record<string, any[]> = {};
  facts.forEach((f) => {
    const key = bucketStartIso(new Date(f.submittedAt), params.bucket);
    byBucket[key] = byBucket[key] || [];
    byBucket[key].push(f);
  });

  const timeseries = Object.entries(byBucket).sort((a, b) => a[0].localeCompare(b[0])).map(([bucket_start, arr]) => {
    const done = arr.filter((x) => !!x.finalDecision);
    return {
      bucket_start,
      submitted: arr.length,
      completed: done.length,
      avg_cycle_seconds: avg(done.map((x) => x.totalCycleSec)),
      met_sla: done.filter((x) => (x.totalCycleSec || Infinity) <= slaSec).length,
      considered_sla: done.length,
    } as KpiTimeseriesPoint;
  });

  const perUserMap: Record<string, any[]> = {};
  facts.forEach((f) => {
    const userId = f.requiresFinance ? f.finance_reviewer_id : f.admin_reviewer_id;
    const key = userId || 'unassigned';
    perUserMap[key] = perUserMap[key] || [];
    perUserMap[key].push(f);
  });

  const per_user: KpiPerUser[] = Object.entries(perUserMap).map(([user_id, arr]) => {
    const done = arr.filter((x) => !!x.finalDecision);
    return {
      user_id: user_id === 'unassigned' ? null : user_id,
      completed: done.length,
      approved: done.filter((x) => x.status === 'approved').length,
      rejected: done.filter((x) => x.status === 'rejected').length,
      avg_cycle_seconds: avg(done.map((x) => x.totalCycleSec)),
      avg_claim_seconds: avg(arr.map((x) => (x.requiresFinance ? x.financeClaimSec : x.adminClaimSec))),
      avg_work_seconds: avg(arr.map((x) => (x.requiresFinance ? x.financeWorkSec : x.adminWorkSec))),
      met_sla: done.filter((x) => (x.totalCycleSec || Infinity) <= slaSec).length,
      considered_sla: done.length,
    };
  });

  return {
    summary: {
      total_submitted: facts.length,
      total_completed: completed.length,
      approved: completed.filter((f) => f.status === 'approved').length,
      rejected: completed.filter((f) => f.status === 'rejected').length,
      avg_total_cycle_seconds: avg(completed.map((f) => f.totalCycleSec)),
      avg_admin_claim_seconds: avg(facts.map((f) => f.adminClaimSec)),
      avg_admin_work_seconds: avg(facts.map((f) => f.adminWorkSec)),
      avg_finance_claim_seconds: avg(facts.map((f) => f.financeClaimSec)),
      avg_finance_work_seconds: avg(facts.map((f) => f.financeWorkSec)),
      met_sla: metSla,
      considered_sla: completed.length,
    },
    backlog: {
      admin: {
        backlog: adminBacklog.length,
        backlog_over_sla: adminBacklog.filter((r) => ((now - new Date(r.submittedAt).getTime()) / 1000) > slaSec).length,
        avg_age_seconds: avg(backlogAge('submittedAt', adminBacklog)),
      },
      finance: {
        backlog: financeBacklog.length,
        backlog_over_sla: financeBacklog.filter((r) => ((now - new Date(r.financeRequiredAt).getTime()) / 1000) > slaSec).length,
        avg_age_seconds: avg(backlogAge('financeRequiredAt', financeBacklog)),
      },
    },
    timeseries,
    per_user,
  };
};

class KpiService {
  async getDefaultSlaHours(): Promise<number> {
    try {
      const raw = localStorage.getItem('kpi_sla_hours_total');
      const value = Number(raw);
      return Number.isFinite(value) && value > 0 ? value : 48;
    } catch {
      return 48;
    }
  }

  async saveDefaultSlaHours(hours: number): Promise<void> {
    localStorage.setItem('kpi_sla_hours_total', String(Number(hours) || 48));
  }

  async getKpiMetrics(params: {
    start: Date;
    end: Date;
    bucket: KpiBucket;
    lane: KpiLane;
    slaHours: number;
  }): Promise<KpiPayload> {
    const rpc = await supabase.rpc('get_quote_kpi', {
      p_start: params.start.toISOString(),
      p_end: params.end.toISOString(),
      p_bucket: params.bucket,
      p_lane: params.lane,
      p_sla_hours: params.slaHours,
    });

    if (!rpc.error && rpc.data && hasMeaningfulRpcData(rpc.data)) {
      return rpc.data as KpiPayload;
    }

    // Fallback #1 (DB-full path): aggregate from quote_kpi_facts directly when RPC is unavailable/empty.
    const factsView = await supabase
      .from('quote_kpi_facts')
      .select('status,submitted_at,requires_finance,admin_reviewer_id,finance_reviewer_id,admin_claimed_at,admin_decision_at,finance_required_at,finance_claimed_at,finance_decision_at,total_cycle_seconds,admin_claim_seconds,admin_work_seconds,finance_claim_seconds,finance_work_seconds')
      .gte('submitted_at', params.start.toISOString())
      .lt('submitted_at', params.end.toISOString());

    if (!factsView.error && Array.isArray(factsView.data)) {
      return buildPayloadFromFacts(factsView.data as KpiFactRow[], params);
    }

    // Fallback #2 (legacy-safe): older schemas without KPI columns/view.
    const legacy = await supabase
      .from('quotes')
      .select('status,created_at,submitted_at,reviewed_at,requires_finance_approval,admin_reviewer_id,finance_reviewer_id')
      .gte('created_at', params.start.toISOString())
      .lt('created_at', params.end.toISOString());

    if (legacy.error) {
      throw legacy.error;
    }

    const rows = (legacy.data || []).map((q: any) => ({
      ...q,
      submitted_at: q.submitted_at || q.created_at,
      admin_decision_at: q.reviewed_at,
    })) as KpiFactRow[];

    return buildPayloadFromFacts(rows, params);
  }

  async resolveUsers(userIds: string[]): Promise<Record<string, { name: string; email: string; role: string }>> {
    if (!userIds.length) return {};

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .in('id', userIds);

    if (error) throw error;

    const map: Record<string, { name: string; email: string; role: string }> = {};
    (data || []).forEach((row: any) => {
      map[row.id] = {
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email || '',
        role: row.role || '',
      };
    });
    return map;
  }
}

export const kpiService = new KpiService();

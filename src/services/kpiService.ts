import { getSupabaseClient } from '@/integrations/supabase/client';

const supabase = getSupabaseClient();

export type KpiBucket = 'day' | 'week' | 'biweek' | 'month';
export type KpiLane = 'admin' | 'finance' | 'both';
export type ApprovalAgingLane = 'all' | 'admin' | 'finance';

export interface ApprovalAgingSummary {
  openCases: number;
  overSla: number;
  unclaimedAdmin: number;
  unclaimedFinance: number;
  medianOpenAgeSeconds: number | null;
  oldestOpenAgeSeconds: number | null;
}

export interface ApprovalAgingOpenCase {
  quoteId: string;
  customerName: string;
  salesOwnerLabel: string;
  lane: 'admin' | 'finance';
  queueOwnerKey: string;
  queueOwnerLabel: string;
  queueOwnerId: string | null;
  ageSeconds: number;
  startedAt: string;
  isClaimed: boolean;
  status: string;
  discountedMargin: number | null;
  financeLimitPercent: number | null;
  requiresFinanceApproval: boolean;
}

export interface ApprovalAgingOwnerBoardRow {
  ownerKey: string;
  ownerLabel: string;
  ownerType: 'reviewer' | 'unclaimed_admin' | 'unclaimed_finance';
  role: string | null;
  openOwned: number;
  taken: number;
  closed: number;
  approved: number;
  rejected: number;
  releasedToFinance: number;
  medianCloseAgeSeconds: number | null;
  overSlaOpen: number;
}

export interface ApprovalAgingPayload {
  summary: ApprovalAgingSummary;
  openCases: ApprovalAgingOpenCase[];
  ownerBoard: ApprovalAgingOwnerBoardRow[];
  generatedAt: string;
}

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

type WorkflowQuoteRow = Record<string, any>;

export const secondsToHours = (seconds?: number | null): number =>
  seconds == null ? 0 : Number((seconds / 3600).toFixed(2));

export const secondsToDays = (seconds?: number | null): number =>
  seconds == null ? 0 : Number((seconds / 86400).toFixed(2));

export const secondsToDaysDisplay = (seconds?: number | null, fallback = '—'): string =>
  seconds == null ? fallback : Number((seconds / 86400).toFixed(2)).toFixed(2);

if (import.meta?.env?.DEV) {
  const sanityCheck = secondsToDays(172800);
  if (sanityCheck !== 2) {
    console.warn('[KPI] secondsToDays sanity check failed', sanityCheck);
  }
}

const avg = (values: Array<number | null | undefined>): number | null => {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const median = (values: Array<number | null | undefined>): number | null => {
  const valid = values
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b);

  if (!valid.length) return null;

  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 1) {
    return valid[mid];
  }

  return (valid[mid - 1] + valid[mid]) / 2;
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

const FINAL_STATUSES = new Set(['approved', 'rejected']);

const normalizeText = (value?: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseDateValue = (value?: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const isWithinRange = (value: string | null | undefined, start: Date, end: Date) => {
  const ms = parseDateValue(value);
  if (ms === null) return false;
  return ms >= start.getTime() && ms <= end.getTime();
};

const isOpenApprovalStatus = (row: WorkflowQuoteRow) => {
  const status = String(row.status ?? '').toLowerCase();
  const workflowState = String(row.workflow_state ?? '').toLowerCase();

  if (FINAL_STATUSES.has(status) || status === 'draft' || status === 'needs_revision') {
    return false;
  }

  if (workflowState === 'closed' || workflowState === 'approved' || workflowState === 'rejected' || workflowState === 'needs_revision') {
    return false;
  }

  return (
    status === 'submitted'
    || status === 'pending_approval'
    || status === 'under-review'
    || workflowState === 'submitted'
    || workflowState === 'admin_review'
    || workflowState === 'finance_review'
    || Boolean(row.requires_finance_approval)
    || Boolean(row.finance_required_at && !row.finance_decision_at)
  );
};

const hasFinancePath = (row: WorkflowQuoteRow) => (
  Boolean(row.finance_required_at)
  || Boolean(row.finance_claimed_at)
  || Boolean(row.finance_decision_at)
  || Boolean(row.finance_reviewer_id)
  || Boolean(row.finance_decision_status)
  || String(row.admin_decision_status ?? '') === 'requires_finance'
  || String(row.workflow_state ?? '') === 'finance_review'
);

const deriveOpenLane = (row: WorkflowQuoteRow): 'admin' | 'finance' | null => {
  if (!isOpenApprovalStatus(row)) return null;

  if (
    Boolean(row.requires_finance_approval)
    || String(row.workflow_state ?? '').toLowerCase() === 'finance_review'
    || Boolean(row.finance_required_at && !row.finance_decision_at)
  ) {
    return 'finance';
  }

  return 'admin';
};

const extractFinanceLimitPercent = (row: WorkflowQuoteRow): number | null => {
  const snapshot = row.finance_threshold_snapshot;
  if (!snapshot || typeof snapshot !== 'object') return null;

  const raw = (snapshot as Record<string, unknown>).limitPercent;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getQueueOwnerId = (row: WorkflowQuoteRow, lane: 'admin' | 'finance') => {
  if (lane === 'finance') {
    return normalizeText(row.finance_reviewer_id);
  }

  return normalizeText(row.admin_reviewer_id) ?? normalizeText(row.reviewed_by);
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

  // Admin backlog should include *all* submitted quotes that are still unclaimed by admin,
  // including quotes that will later require finance. Restricting this to non-finance quotes
  // undercounts true queue pressure and makes SLA risk look artificially low.
  const adminBacklog = facts.filter((f) => !f.admin_claimed_at);
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

  async getApprovalAgingDashboard(params: {
    start: Date;
    end: Date;
    lane: ApprovalAgingLane;
    slaHours: number;
  }): Promise<ApprovalAgingPayload> {
    const [quotesResult, factsResult] = await Promise.all([
      supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('quote_kpi_facts')
        .select('quote_id,status,workflow_state,submitted_at,submitted_by_email,submitted_by_name,admin_reviewer_id,finance_reviewer_id,requires_finance,admin_claimed_at,admin_decision_at,finance_required_at,finance_claimed_at,finance_decision_at,final_decision_at,total_cycle_seconds'),
    ]);

    if (quotesResult.error) {
      throw quotesResult.error;
    }

    const factsByQuoteId = new Map<string, WorkflowQuoteRow>();
    if (!factsResult.error && Array.isArray(factsResult.data)) {
      (factsResult.data as WorkflowQuoteRow[]).forEach((row) => {
        const quoteId = normalizeText(row.quote_id);
        if (quoteId) {
          factsByQuoteId.set(quoteId, row);
        }
      });
    }

    const mergedRows = ((quotesResult.data || []) as WorkflowQuoteRow[]).map((quote) => {
      const facts = factsByQuoteId.get(String(quote.id)) || {};
      return {
        ...quote,
        ...facts,
        id: quote.id,
        customer_name: quote.customer_name,
        discounted_margin: quote.discounted_margin,
        finance_threshold_snapshot: quote.finance_threshold_snapshot,
        requires_finance_approval: quote.requires_finance_approval ?? facts.requires_finance ?? false,
        submitted_by_name: quote.submitted_by_name ?? facts.submitted_by_name,
        submitted_by_email: quote.submitted_by_email ?? facts.submitted_by_email,
      };
    });

    const reviewerIds = Array.from(
      new Set(
        mergedRows.flatMap((row) => [
          normalizeText(row.admin_reviewer_id),
          normalizeText(row.finance_reviewer_id),
          normalizeText(row.reviewed_by),
        ].filter(Boolean) as string[])
      )
    );

    const reviewerMap = reviewerIds.length > 0
      ? await this.resolveUsers(reviewerIds)
      : {};

    const now = Date.now();
    const slaSeconds = params.slaHours * 3600;

    const openCases = mergedRows
      .map((row) => {
        const lane = deriveOpenLane(row);
        if (!lane) return null;
        if (params.lane !== 'all' && params.lane !== lane) return null;

        const startedAt = normalizeText(row.submitted_at) ?? normalizeText(row.created_at);
        const startedAtMs = parseDateValue(startedAt);
        if (!startedAt || startedAtMs === null) return null;

        const queueOwnerId = getQueueOwnerId(row, lane);
        const queueOwnerLabel = queueOwnerId
          ? (reviewerMap[queueOwnerId]?.name || reviewerMap[queueOwnerId]?.email || queueOwnerId)
          : (lane === 'finance' ? 'Unclaimed Finance Queue' : 'Unclaimed Admin Queue');

        return {
          quoteId: String(row.id),
          customerName: normalizeText(row.customer_name) || 'Pending Customer',
          salesOwnerLabel: normalizeText(row.submitted_by_name) || normalizeText(row.submitted_by_email) || 'Unknown requester',
          lane,
          queueOwnerKey: queueOwnerId ?? `unclaimed_${lane}`,
          queueOwnerLabel,
          queueOwnerId,
          ageSeconds: Math.max(0, (now - startedAtMs) / 1000),
          startedAt,
          isClaimed: Boolean(queueOwnerId),
          status: String(row.status ?? lane),
          discountedMargin: toNumberOrNull(row.discounted_margin),
          financeLimitPercent: extractFinanceLimitPercent(row),
          requiresFinanceApproval: Boolean(row.requires_finance_approval) || lane === 'finance',
        } satisfies ApprovalAgingOpenCase;
      })
      .filter((value): value is ApprovalAgingOpenCase => Boolean(value))
      .sort((a, b) => b.ageSeconds - a.ageSeconds);

    type MutableBoardRow = ApprovalAgingOwnerBoardRow & {
      closeAgeSamples: number[];
    };

    const boardMap = new Map<string, MutableBoardRow>();
    const ensureBoardRow = (
      ownerKey: string,
      ownerLabel: string,
      ownerType: ApprovalAgingOwnerBoardRow['ownerType'],
      role: string | null,
    ) => {
      if (!boardMap.has(ownerKey)) {
        boardMap.set(ownerKey, {
          ownerKey,
          ownerLabel,
          ownerType,
          role,
          openOwned: 0,
          taken: 0,
          closed: 0,
          approved: 0,
          rejected: 0,
          releasedToFinance: 0,
          medianCloseAgeSeconds: null,
          overSlaOpen: 0,
          closeAgeSamples: [],
        });
      }

      return boardMap.get(ownerKey)!;
    };

    openCases.forEach((openCase) => {
      const row = ensureBoardRow(
        openCase.queueOwnerKey,
        openCase.queueOwnerLabel,
        openCase.queueOwnerId
          ? 'reviewer'
          : (openCase.lane === 'finance' ? 'unclaimed_finance' : 'unclaimed_admin'),
        openCase.queueOwnerId ? (reviewerMap[openCase.queueOwnerId]?.role || null) : null,
      );

      row.openOwned += 1;
      if (openCase.ageSeconds > slaSeconds) {
        row.overSlaOpen += 1;
      }
    });

    mergedRows.forEach((row) => {
      const startedAt = normalizeText(row.submitted_at) ?? normalizeText(row.created_at);
      const adminOwnerId = getQueueOwnerId(row, 'admin');
      const financeOwnerId = getQueueOwnerId(row, 'finance');
      const adminOwnerLabel = adminOwnerId
        ? (reviewerMap[adminOwnerId]?.name || reviewerMap[adminOwnerId]?.email || adminOwnerId)
        : 'Unclaimed Admin Queue';
      const financeOwnerLabel = financeOwnerId
        ? (reviewerMap[financeOwnerId]?.name || reviewerMap[financeOwnerId]?.email || financeOwnerId)
        : 'Unclaimed Finance Queue';
      const finalStatus = String(row.status ?? '').toLowerCase();
      const financePath = hasFinancePath(row);
      const totalCloseAgeSeconds = sec(startedAt, normalizeText(row.finance_decision_at) ?? normalizeText(row.admin_decision_at) ?? normalizeText(row.reviewed_at));

      if (params.lane !== 'finance' && adminOwnerId && isWithinRange(row.admin_claimed_at, params.start, params.end)) {
        ensureBoardRow(adminOwnerId, adminOwnerLabel, 'reviewer', reviewerMap[adminOwnerId]?.role || null).taken += 1;
      }

      if (params.lane !== 'admin' && financeOwnerId && isWithinRange(row.finance_claimed_at, params.start, params.end)) {
        ensureBoardRow(financeOwnerId, financeOwnerLabel, 'reviewer', reviewerMap[financeOwnerId]?.role || null).taken += 1;
      }

      if (
        params.lane !== 'finance'
        && adminOwnerId
        && String(row.admin_decision_status ?? '') === 'requires_finance'
        && isWithinRange(row.admin_decision_at, params.start, params.end)
      ) {
        ensureBoardRow(adminOwnerId, adminOwnerLabel, 'reviewer', reviewerMap[adminOwnerId]?.role || null).releasedToFinance += 1;
      }

      const adminClosedDirectly = !financePath
        && FINAL_STATUSES.has(finalStatus)
        && isWithinRange(normalizeText(row.admin_decision_at) ?? normalizeText(row.reviewed_at), params.start, params.end);

      if (params.lane !== 'finance' && adminOwnerId && adminClosedDirectly) {
        const boardRow = ensureBoardRow(adminOwnerId, adminOwnerLabel, 'reviewer', reviewerMap[adminOwnerId]?.role || null);
        boardRow.closed += 1;
        if (finalStatus === 'approved') boardRow.approved += 1;
        if (finalStatus === 'rejected') boardRow.rejected += 1;
        if (typeof totalCloseAgeSeconds === 'number' && Number.isFinite(totalCloseAgeSeconds)) {
          boardRow.closeAgeSamples.push(totalCloseAgeSeconds);
        }
      }

      const financeClosed = financePath
        && FINAL_STATUSES.has(finalStatus)
        && isWithinRange(row.finance_decision_at, params.start, params.end);

      if (params.lane !== 'admin' && financeOwnerId && financeClosed) {
        const boardRow = ensureBoardRow(financeOwnerId, financeOwnerLabel, 'reviewer', reviewerMap[financeOwnerId]?.role || null);
        boardRow.closed += 1;
        if (finalStatus === 'approved') boardRow.approved += 1;
        if (finalStatus === 'rejected') boardRow.rejected += 1;
        if (typeof totalCloseAgeSeconds === 'number' && Number.isFinite(totalCloseAgeSeconds)) {
          boardRow.closeAgeSamples.push(totalCloseAgeSeconds);
        }
      }
    });

    const ownerBoard = Array.from(boardMap.values())
      .map(({ closeAgeSamples, ...row }) => ({
        ...row,
        medianCloseAgeSeconds: median(closeAgeSamples),
      }))
      .filter((row) =>
        row.openOwned > 0
        || row.taken > 0
        || row.closed > 0
        || row.releasedToFinance > 0
      )
      .sort((a, b) => {
        const openDiff = b.openOwned - a.openOwned;
        if (openDiff !== 0) return openDiff;

        const overSlaDiff = b.overSlaOpen - a.overSlaOpen;
        if (overSlaDiff !== 0) return overSlaDiff;

        return b.closed - a.closed;
      });

    return {
      summary: {
        openCases: openCases.length,
        overSla: openCases.filter((row) => row.ageSeconds > slaSeconds).length,
        unclaimedAdmin: openCases.filter((row) => row.lane === 'admin' && !row.isClaimed).length,
        unclaimedFinance: openCases.filter((row) => row.lane === 'finance' && !row.isClaimed).length,
        medianOpenAgeSeconds: median(openCases.map((row) => row.ageSeconds)),
        oldestOpenAgeSeconds: openCases.length ? openCases[0].ageSeconds : null,
      },
      openCases,
      ownerBoard,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const kpiService = new KpiService();

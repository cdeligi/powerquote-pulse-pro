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

export const secondsToHours = (seconds?: number | null): number =>
  seconds == null ? 0 : Number((seconds / 3600).toFixed(2));

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
    const { data, error } = await supabase.rpc('get_quote_kpi', {
      p_start: params.start.toISOString(),
      p_end: params.end.toISOString(),
      p_bucket: params.bucket,
      p_lane: params.lane,
      p_sla_hours: params.slaHours,
    });

    if (error) throw error;

    return (data || {
      summary: {},
      backlog: { admin: {}, finance: {} },
      timeseries: [],
      per_user: [],
    }) as KpiPayload;
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

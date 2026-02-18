import { getSupabaseClient } from '@/integrations/supabase/client';

export type FinanceMarginLimit = {
  percent: number;
  currency: string;
  updatedAt?: string;
};

type EmailTemplateRecord = {
  id?: string;
  template_type?: string;
  subject_template: string;
  body_template: string;
  enabled?: boolean;
  variables?: string[];
};

type ClaimLane = 'admin' | 'finance';

type AdminDecision = 'approved' | 'rejected' | 'requires_finance' | 'needs_revision';
type FinanceDecision = 'approved' | 'rejected';

class QuoteWorkflowService {
  private supabase = getSupabaseClient();

  private async getAuthHeaders() {
    const { data } = await this.supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private fnBaseUrl() {
    // Prefer env at build time, fall back to configured client.
    const url = (import.meta as any).env?.VITE_SUPABASE_URL || (this.supabase as any)?.supabaseUrl;
    if (!url) throw new Error('Missing VITE_SUPABASE_URL');
    return `${String(url).replace(/\/$/, '')}/functions/v1/quote-workflow`;
  }

  private async request<T>(path: string, opts: { method: 'GET' | 'PUT' | 'POST'; body?: any; searchParams?: Record<string, string> } ) : Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = new URL(this.fnBaseUrl() + (path.startsWith('/') ? path : `/${path}`));
    for (const [k, v] of Object.entries(opts.searchParams || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      method: opts.method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || `Request failed (${res.status})`);
    }
    return json as T;
  }

  async getFinanceMarginLimit(): Promise<FinanceMarginLimit> {
    const res = await this.request<{ success: boolean; value: FinanceMarginLimit }>(
      '/finance-margin-limit',
      { method: 'GET', searchParams: {} },
    );
    return res.value;
  }

  async updateFinanceMarginLimit(percent: number, currency: string): Promise<FinanceMarginLimit> {
    const res = await this.request<{ success: boolean; value: FinanceMarginLimit }>(
      '/finance-margin-limit',
      { method: 'PUT', body: { percent, currency }, searchParams: {} },
    );
    return res.value;
  }

  async getEmailTemplate(templateType: string): Promise<EmailTemplateRecord | null> {
    const res = await this.request<{ success: boolean; template: EmailTemplateRecord | null }>(
      '/email-template',
      { method: 'GET', searchParams: { type: templateType } },
    );
    return res.template;
  }

  async updateEmailTemplate(payload: { templateType: string; subjectTemplate: string; bodyTemplate: string; enabled?: boolean }) {
    const res = await this.request<{ success: boolean; template: EmailTemplateRecord }>(
      '/email-template',
      {
        method: 'PUT',
        body: {
          templateType: payload.templateType,
          subjectTemplate: payload.subjectTemplate,
          bodyTemplate: payload.bodyTemplate,
          enabled: payload.enabled,
        },
        searchParams: {},
      },
    );
    return res.template;
  }

  async claimQuote(quoteId: string, lane: ClaimLane) {
    return this.request<{ success: boolean; quote: any }>('/claim', {
      method: 'POST',
      body: { quoteId, lane },
      searchParams: {},
    });
  }

  async recordAdminDecision(payload: {
    quoteId: string;
    decision: AdminDecision;
    notes?: string;
    marginPercent?: number;
    financeLimitPercent?: number;
  }) {
    return this.request<{ success: boolean; quote: any }>('/admin-decision', {
      method: 'POST',
      body: payload,
      searchParams: {},
    });
  }

  async recordFinanceDecision(payload: {
    quoteId: string;
    decision: FinanceDecision;
    notes?: string;
    marginPercent?: number;
    financeLimitPercent?: number;
  }) {
    return this.request<{ success: boolean; quote: any }>('/finance-decision', {
      method: 'POST',
      body: payload,
      searchParams: {},
    });
  }
}

export const quoteWorkflowService = new QuoteWorkflowService();

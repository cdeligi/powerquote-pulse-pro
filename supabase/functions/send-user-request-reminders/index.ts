import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";
import { Resend } from "https://esm.sh/resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_m, varName, content) => {
    return data[varName] ? content : '';
  });
  return result;
}

async function getSettings(supabase: any) {
  const { data, error } = await supabase
    .from('email_settings')
    .select('setting_key, setting_value');
  if (error) throw new Error(`Failed to fetch email settings: ${error.message}`);
  const out: Record<string, any> = {};
  for (const row of data ?? []) out[row.setting_key] = row.setting_value;
  return out;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const settings = await getSettings(supabase);
    if (settings.enable_notifications === false) {
      return new Response(JSON.stringify({ status: 'skipped', reason: 'notifications disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const approvalRecipients: string[] = Array.isArray(settings.approval_admin_recipients)
      ? settings.approval_admin_recipients
      : [];

    if (approvalRecipients.length === 0) {
      return new Response(JSON.stringify({ status: 'skipped', reason: 'no approval_admin_recipients configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find pending requests that need a reminder (every 24h, max 5 reminders)
    const { data: requests, error: reqErr } = await supabase
      .from('user_requests')
      .select('*')
      .eq('status', 'pending')
      .lt('reminder_count', 5)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`)
      .lte('requested_at', new Date().toISOString());

    if (reqErr) throw new Error(`Failed to fetch pending requests: ${reqErr.message}`);

    // Filter: if last_reminder_sent_at is null, ensure requested_at <= now-24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const due = (requests || []).filter((r: any) => {
      const last = r.last_reminder_sent_at ? Date.parse(r.last_reminder_sent_at) : null;
      if (last != null) return last <= cutoff;
      const requested = r.requested_at ? Date.parse(r.requested_at) : 0;
      return requested <= cutoff;
    });

    if (due.length === 0) {
      return new Response(JSON.stringify({ status: 'ok', processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load template
    const { data: templateRow, error: tplErr } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', 'user_request_admin_reminder')
      .eq('enabled', true)
      .maybeSingle();

    if (tplErr) throw new Error(`Failed to fetch template user_request_admin_reminder: ${tplErr.message}`);
    if (!templateRow) throw new Error('Template user_request_admin_reminder not found or disabled');

    const fromEmail = String(settings.smtp_from_email || '').trim();
    const fromName = String(settings.smtp_from_name || 'PowerQuotePro').trim();
    if (!fromEmail) throw new Error('smtp_from_email not configured');

    const provider = String(settings.email_service_provider || 'resend').toLowerCase();

    const sendViaResend = async (to: string[], subject: string, html: string) => {
      const key = Deno.env.get('RESEND_API_KEY');
      if (!key) throw new Error('RESEND_API_KEY not configured');
      const resend = new Resend(key);
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
      });
    };

    const sendViaSMTP = async (to: string[], subject: string, html: string) => {
      const host = String(settings.smtp_host || '').trim();
      const port = Number(settings.smtp_port || 587);
      const secure = Boolean(settings.smtp_secure);
      if (!host) throw new Error('smtp_host not configured');

      const user = Deno.env.get('SMTP_USER') || '';
      const pass = Deno.env.get('SMTP_PASSWORD') || '';

      const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      } as any);

      await transport.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: to.join(', '),
        subject,
        html,
      });
    };

    let sent = 0;

    for (const r of due) {
      const requesterName = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'User';
      const data = {
        request_id: r.id,
        requester_name: requesterName,
        requester_email: r.email,
        requested_role: r.requested_role,
        sla_text: 'within 2 business days (48 hours)',
        reminder_number: Number(r.reminder_count || 0) + 1,
        max_reminders: 5,
      };

      const subject = renderTemplate(String(templateRow.subject_template || ''), data);
      const html = renderTemplate(String(templateRow.body_template || ''), data);

      if (provider === 'smtp') {
        await sendViaSMTP(approvalRecipients, subject, html);
      } else {
        await sendViaResend(approvalRecipients, subject, html);
      }

      await supabase
        .from('user_requests')
        .update({
          reminder_count: Number(r.reminder_count || 0) + 1,
          last_reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', r.id);

      sent += 1;
    }

    return new Response(JSON.stringify({ status: 'ok', processed: sent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('send-user-request-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);

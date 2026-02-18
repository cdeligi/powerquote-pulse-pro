import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuoteNotificationRequest {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  quoteId: string;
  quoteName: string;
  permissionLevel: 'view' | 'edit';
  message?: string;
  // Optional: use email_templates table
  template_type?: string;
  template_data?: Record<string, any>;
}

// Simple template engine (Mustache-style)
function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return data[varName] ? content : '';
  });
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      senderName,
      quoteId,
      quoteName,
      permissionLevel,
      message,
      template_type,
      template_data,
    }: QuoteNotificationRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settingsRows } = await supabaseAdmin
      .from('email_settings')
      .select('setting_key, setting_value');

    const settings: Record<string, any> = {};
    for (const row of settingsRows ?? []) settings[row.setting_key] = row.setting_value;

    if (settings.enable_notifications === false) {
      return new Response(JSON.stringify({ status: 'skipped', reason: 'notifications disabled' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const fromEmail = settings.smtp_from_email as string | undefined;
    const fromName = (settings.smtp_from_name as string | undefined) ?? 'PowerQuotePro';
    if (!fromEmail) {
      return new Response(JSON.stringify({ error: 'smtp_from_email not configured' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const provider = String(settings.email_service_provider || 'resend').toLowerCase();

    // Default subject/body if no template is provided
    const safeMsg = message ? String(message).replaceAll('<', '&lt;').replaceAll('>', '&gt;') : '';

    let subject = `PowerQuotePro Notification: ${quoteName}`;
    let html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <p>Hello ${recipientName || 'there'},</p>
        <p><strong>${senderName}</strong> sent a notification from PowerQuotePro.</p>
        <p><strong>Context:</strong> ${quoteName}</p>
        <p><strong>ID:</strong> ${quoteId}</p>
        ${message ? `<div style="margin-top:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb"><strong>Message:</strong><br/>${safeMsg}</div>` : ''}
        <p style="margin-top:16px">Regards,<br/>PowerQuotePro</p>
      </div>
    `;

    // If template_type is provided, pull from email_templates
    if (template_type) {
      const { data: templateRow, error: templateErr } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('template_type', template_type)
        .eq('enabled', true)
        .maybeSingle();

      if (templateErr) throw new Error(`Failed to fetch email template (${template_type}): ${templateErr.message}`);
      if (!templateRow) throw new Error(`Email template not found or disabled: ${template_type}`);

      const data = {
        recipient_name: recipientName || 'there',
        recipient_email: recipientEmail,
        sender_name: senderName,
        quote_id: quoteId,
        quote_name: quoteName,
        permission_level: permissionLevel,
        message: safeMsg,
        ...(template_data || {}),
      };

      subject = renderTemplate(String(templateRow.subject_template || ''), data);
      html = renderTemplate(String(templateRow.body_template || ''), data);
    }

    const from = `${fromName} <${fromEmail}>`;

    const sendViaResend = async () => {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');
      const resend = new Resend(resendApiKey);
      return await resend.emails.send({ from, to: [recipientEmail], subject, html });
    };

    const sendViaSMTP = async () => {
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

      const info = await transport.sendMail({ from, to: recipientEmail, subject, html });
      return { data: { id: (info as any)?.messageId } };
    };

    const result = provider === 'smtp' ? await sendViaSMTP() : await sendViaResend();

    return new Response(JSON.stringify({ status: 'sent', result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-quote-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send notification' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
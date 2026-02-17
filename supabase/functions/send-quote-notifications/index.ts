import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

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
      message
    }: QuoteNotificationRequest = await req.json();

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    const subject = `PowerQuotePro Notification: ${quoteName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <p>Hello ${recipientName || 'there'},</p>
        <p><strong>${senderName}</strong> sent a notification from PowerQuotePro.</p>
        <p><strong>Context:</strong> ${quoteName}</p>
        <p><strong>ID:</strong> ${quoteId}</p>
        <p><strong>Permission:</strong> ${permissionLevel}</p>
        ${message ? `<div style="margin-top:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb"><strong>Message:</strong><br/>${String(message).replaceAll('<','&lt;').replaceAll('>','&gt;')}</div>` : ''}
        <p style="margin-top:16px">Regards,<br/>PowerQuotePro</p>
      </div>
    `;

    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject,
      html,
    });

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
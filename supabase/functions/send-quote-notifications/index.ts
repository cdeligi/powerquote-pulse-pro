import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    console.log('Sending quote notification:', {
      recipientEmail,
      quoteId,
      permissionLevel
    });

    const emailResponse = await resend.emails.send({
      from: "Quote System <noreply@qualitrol.com>",
      to: [recipientEmail],
      subject: `Quote Shared: ${quoteName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
            Quote Shared With You
          </h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #2c3e50; margin-top: 0;">Quote Details</h2>
            <p><strong>Quote ID:</strong> ${quoteId}</p>
            <p><strong>Quote Name:</strong> ${quoteName}</p>
            <p><strong>Shared by:</strong> ${senderName}</p>
            <p><strong>Permission Level:</strong> ${permissionLevel === 'edit' ? 'View & Edit' : 'View Only'}</p>
          </div>
          
          ${message ? `
            <div style="background-color: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">Message from ${senderName}:</h3>
              <p style="margin-bottom: 0;">${message}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || 'https://your-app.vercel.app'}/quotes" 
               style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Quote
            </a>
          </div>
          
          <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
            <p>This quote was shared with you through the Qualitrol Quote System.</p>
            <p>If you have questions about this quote, please contact ${senderName} directly.</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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
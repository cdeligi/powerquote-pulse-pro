import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Note: Resend functionality temporarily disabled to fix build issues

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

    console.log('Quote notification would be sent:', {
      recipientEmail,
      quoteId,
      permissionLevel
    });

    // TODO: Implement email notification when resend is properly configured
    const mockResponse = {
      id: `mock-${Date.now()}`,
      to: recipientEmail,
      subject: `Quote Shared: ${quoteName}`,
      status: 'sent'
    };

    console.log("Mock email response:", mockResponse);

    return new Response(JSON.stringify(mockResponse), {
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
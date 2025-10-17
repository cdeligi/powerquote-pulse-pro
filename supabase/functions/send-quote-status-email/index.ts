import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  quoteId: string;
  action: 'approved' | 'rejected';
  recipientEmails?: string[];
}

interface EmailSettings {
  smtp_from_email: string;
  smtp_from_name: string;
  email_service_provider: string;
  notification_recipients: string[];
  enable_notifications: boolean;
}

interface EmailTemplate {
  subject_template: string;
  body_template: string;
  variables: string[];
}

// Simple template engine (Mustache-style)
function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  
  // Handle {{variable}} replacements
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  
  // Handle {{#if variable}} ... {{/if}} conditionals
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return data[varName] ? content : '';
  });
  
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, action, recipientEmails }: EmailRequest = await req.json();
    
    console.log(`Processing email notification for quote ${quoteId}, action: ${action}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch email settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('email_settings')
      .select('setting_key, setting_value');

    if (settingsError) throw new Error(`Failed to fetch email settings: ${settingsError.message}`);

    const settings: any = settingsData.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {} as any);

    // Check if notifications are enabled
    if (!settings.enable_notifications) {
      console.log('Email notifications are disabled globally');
      return new Response(
        JSON.stringify({ message: 'Notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch email template
    const templateType = action === 'approved' ? 'quote_approved' : 'quote_rejected';
    const { data: templateRecord, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', templateType)
      .eq('enabled', true)
      .single();

    if (templateError) throw new Error(`Failed to fetch email template: ${templateError.message}`);

    const template: EmailTemplate = templateRecord;

    // 3. Fetch quote details or use mock data for testing
    let quoteData: any;

    if (quoteId === 'TEST') {
      // Use mock data for testing
      console.log('Using mock data for test email');
      quoteData = {
        id: 'TEST-QUOTE-001',
        customer_name: 'Test Customer Inc.',
        original_quote_value: 50000,
        discounted_value: 47500,
        approved_discount: 5,
        approval_notes: 'This is a test email notification',
        rejection_reason: 'This is a test rejection notification',
        reviewed_at: new Date().toISOString(),
        reviewer: {
          first_name: 'Test',
          last_name: 'Reviewer',
          email: settings.smtp_from_email
        },
        submitter: {
          first_name: 'Test',
          last_name: 'User',
          email: settings.smtp_from_email
        }
      };
    } else {
      // Fetch real quote data
      const { data: fetchedQuoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          reviewer:reviewed_by(first_name, last_name, email),
          submitter:user_id(first_name, last_name, email)
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw new Error(`Failed to fetch quote: ${quoteError.message}`);
      quoteData = fetchedQuoteData;
    }

    // 4. Determine recipients
    let recipients: string[] = [];
    
    if (recipientEmails && recipientEmails.length > 0) {
      recipients = recipientEmails;
    } else {
      // Default recipients: quote submitter + configured notification emails
      if (quoteData.submitter?.email) {
        recipients.push(quoteData.submitter.email);
      }
      if (settings.notification_recipients && Array.isArray(settings.notification_recipients)) {
        recipients.push(...settings.notification_recipients);
      }
    }

    // Remove duplicates
    recipients = [...new Set(recipients)].filter(email => email && email.trim());

    if (recipients.length === 0) {
      throw new Error('No valid recipients found');
    }

    console.log(`Sending emails to: ${recipients.join(', ')}`);

    // 5. Prepare template data
    const reviewerName = quoteData.reviewer 
      ? `${quoteData.reviewer.first_name || ''} ${quoteData.reviewer.last_name || ''}`.trim()
      : 'System';
    
    const submitterName = quoteData.submitter
      ? `${quoteData.submitter.first_name || ''} ${quoteData.submitter.last_name || ''}`.trim()
      : 'Unknown';

    // Extract customer name from quote_fields first, then fall back to root-level customer_name
    const extractCustomerName = (quoteData: any): string => {
      // Try to get from quote_fields JSON first (most accurate)
      if (quoteData.quote_fields) {
        const fields = quoteData.quote_fields;
        const directKeys = ['customerName', 'customer_name', 'customer-name', 'customer name', 'customer', 
                           'clientName', 'client_name', 'client-name', 'client name', 'client'];
        
        for (const key of directKeys) {
          const value = fields[key];
          if (value && typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
          }
        }
      }
      
      // Fall back to root-level customer_name
      return quoteData.customer_name || 'Unknown Customer';
    };

    // Generate PDF access link with configurable domain
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
    const appDomain = Deno.env.get("APP_DOMAIN") || `${projectRef}.lovable.app`;
    const pdfUrl = `https://${appDomain}/quote-pdf/${quoteId}`;
    
    console.log(`Generated PDF access URL: ${pdfUrl}`);

    const templateData = {
      quote_id: quoteData.id,
      customer_name: extractCustomerName(quoteData),
      original_value: `$${Number(quoteData.original_quote_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      approved_discount: quoteData.approved_discount || 0,
      final_value: `$${Number(quoteData.discounted_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      quote_value: `$${Number(quoteData.original_quote_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      approved_by: reviewerName,
      rejected_by: reviewerName,
      approved_date: quoteData.reviewed_at ? new Date(quoteData.reviewed_at).toLocaleString() : new Date().toLocaleString(),
      rejected_date: quoteData.reviewed_at ? new Date(quoteData.reviewed_at).toLocaleString() : new Date().toLocaleString(),
      approval_notes: quoteData.approval_notes || '',
      rejection_reason: quoteData.rejection_reason || '',
      recipient_name: submitterName,
      pdf_url: pdfUrl,
      pdf_link: `<a href="${pdfUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View & Download Full Quote PDF</a>`,
    };

    // 6. Send emails
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const emailResults = [];

    for (const recipient of recipients) {
      const recipientTemplateData = {
        ...templateData,
        recipient_name: recipient === quoteData.submitter?.email ? submitterName : 'Team Member',
      };

      const subject = renderTemplate(template.subject_template, recipientTemplateData);
      const body = renderTemplate(template.body_template, recipientTemplateData);

      try {
        const emailPayload: any = {
          from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
          to: [recipient],
          subject: subject,
          html: body,
        };
        
        const { data, error } = await resend.emails.send(emailPayload);

        if (error) {
          console.error(`Failed to send email to ${recipient}:`, error);
          
          await supabase.from('email_audit_log').insert({
            quote_id: quoteId,
            template_type: templateType,
            recipient_email: recipient,
            recipient_name: recipientTemplateData.recipient_name,
            subject: subject,
            body: body,
            status: 'failed',
            error_message: error.message,
          });

          emailResults.push({ recipient, status: 'failed', error: error.message });
        } else {
          console.log(`Email sent successfully to ${recipient}`);
          
          await supabase.from('email_audit_log').insert({
            quote_id: quoteId,
            template_type: templateType,
            recipient_email: recipient,
            recipient_name: recipientTemplateData.recipient_name,
            subject: subject,
            body: body,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          emailResults.push({ recipient, status: 'sent', messageId: data?.id });
        }
      } catch (sendError: any) {
        console.error(`Exception sending email to ${recipient}:`, sendError);
        
        await supabase.from('email_audit_log').insert({
          quote_id: quoteId,
          template_type: templateType,
          recipient_email: recipient,
          recipient_name: recipientTemplateData.recipient_name,
          subject: subject,
          body: body,
          status: 'failed',
          error_message: sendError.message,
        });

        emailResults.push({ recipient, status: 'failed', error: sendError.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${emailResults.length} emails`,
        results: emailResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-quote-status-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to send email notifications' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

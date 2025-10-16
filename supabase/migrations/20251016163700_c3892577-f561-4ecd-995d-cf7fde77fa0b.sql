-- Email Notification System Migration
-- Create tables for email configuration, templates, and audit logging

-- 1. Email Settings Table
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE CHECK (template_type IN ('quote_approved', 'quote_rejected')),
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Email Audit Log Table
CREATE TABLE IF NOT EXISTS public.email_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  template_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_settings
CREATE POLICY "Admins can manage email settings"
  ON public.email_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view enabled templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (enabled = true);

-- RLS Policies for email_audit_log
CREATE POLICY "Admins can view email logs"
  ON public.email_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert email logs"
  ON public.email_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_settings_key ON public.email_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_audit_quote ON public.email_audit_log(quote_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_status ON public.email_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_email_audit_created ON public.email_audit_log(created_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Insert default email configuration
INSERT INTO public.email_settings (setting_key, setting_value, description) VALUES
  ('smtp_host', '""'::jsonb, 'SMTP server hostname'),
  ('smtp_port', '587'::jsonb, 'SMTP server port'),
  ('smtp_secure', 'true'::jsonb, 'Use TLS/SSL'),
  ('smtp_from_email', '""'::jsonb, 'Sender email address'),
  ('smtp_from_name', '"QUALITROL Quote System"'::jsonb, 'Sender display name'),
  ('email_service_provider', '"resend"'::jsonb, 'Email service provider (resend, smtp, sendgrid)'),
  ('notification_recipients', '[]'::jsonb, 'Additional email addresses to receive notifications'),
  ('enable_notifications', 'true'::jsonb, 'Enable/disable email notifications globally')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default email templates
INSERT INTO public.email_templates (template_type, subject_template, body_template, variables) VALUES
  (
    'quote_approved',
    'Quote {{quote_id}} - Approved',
    E'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><h2 style="color: #22c55e;">Quote Approved</h2><p>Dear {{recipient_name}},</p><p>The quote <strong>{{quote_id}}</strong> for customer <strong>{{customer_name}}</strong> has been approved.</p><div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;"><h3 style="margin-top: 0;">Quote Details</h3><p><strong>Quote ID:</strong> {{quote_id}}</p><p><strong>Customer:</strong> {{customer_name}}</p><p><strong>Original Value:</strong> {{original_value}}</p><p><strong>Approved Discount:</strong> {{approved_discount}}%</p><p><strong>Final Value:</strong> {{final_value}}</p><p><strong>Approved By:</strong> {{approved_by}}</p><p><strong>Approved On:</strong> {{approved_date}}</p></div>{{#if approval_notes}}<div style="background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;"><h3 style="margin-top: 0;">Approval Notes</h3><p>{{approval_notes}}</p></div>{{/if}}<p>You can view the full quote details in the system.</p><p>Best regards,<br>QUALITROL Quote System</p></body></html>',
    '["quote_id", "customer_name", "original_value", "approved_discount", "final_value", "approved_by", "approved_date", "approval_notes", "recipient_name"]'::jsonb
  ),
  (
    'quote_rejected',
    'Quote {{quote_id}} - Rejected',
    E'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><h2 style="color: #ef4444;">Quote Rejected</h2><p>Dear {{recipient_name}},</p><p>The quote <strong>{{quote_id}}</strong> for customer <strong>{{customer_name}}</strong> has been rejected.</p><div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;"><h3 style="margin-top: 0;">Quote Details</h3><p><strong>Quote ID:</strong> {{quote_id}}</p><p><strong>Customer:</strong> {{customer_name}}</p><p><strong>Quote Value:</strong> {{quote_value}}</p><p><strong>Rejected By:</strong> {{rejected_by}}</p><p><strong>Rejected On:</strong> {{rejected_date}}</p></div>{{#if rejection_reason}}<div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;"><h3 style="margin-top: 0;">Rejection Reason</h3><p>{{rejection_reason}}</p></div>{{/if}}<p>Please review the rejection reason and make necessary adjustments before resubmitting.</p><p>Best regards,<br>QUALITROL Quote System</p></body></html>',
    '["quote_id", "customer_name", "quote_value", "rejected_by", "rejected_date", "rejection_reason", "recipient_name"]'::jsonb
  )
ON CONFLICT (template_type) DO NOTHING;
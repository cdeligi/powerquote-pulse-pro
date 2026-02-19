import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Save, Mail, Send, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const supabase = getSupabaseClient();

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_from_email: string;
  smtp_from_name: string;
  // 'resend' | 'smtp' | 'sendgrid'
  email_service_provider: string;

  // Quote and system notifications (non-approval)
  notification_recipients: string[];

  // Admins responsible for user access approvals (used for onboarding requests + reminders)
  approval_admin_recipients: string[];

  enable_notifications: boolean;
  support_email?: string;
}

interface EmailTemplate {
  id: string;
  template_type: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  enabled: boolean;
}

export const EmailSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSMTP, setTestingSMTP] = useState(false);
  
  const [settings, setSettings] = useState<EmailSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: true,
    smtp_from_email: '',
    smtp_from_name: 'QUALITROL Quote System',
    email_service_provider: 'resend',
    notification_recipients: [],
    approval_admin_recipients: [],
    enable_notifications: true,
    support_email: 'cdeligi@qualitrolcorp.com',
  });

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  const [newTemplate, setNewTemplate] = useState<{ template_type: string; variables: string } | null>(null);

  useEffect(() => {
    fetchEmailSettings();
    fetchEmailTemplates();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsObj: any = {};
      data?.forEach(row => {
        settingsObj[row.setting_key] = row.setting_value;
      });

      setSettings({
        smtp_host: settingsObj.smtp_host || '',
        smtp_port: settingsObj.smtp_port || 587,
        smtp_secure: settingsObj.smtp_secure ?? true,
        smtp_from_email: settingsObj.smtp_from_email || '',
        smtp_from_name: settingsObj.smtp_from_name || 'QUALITROL Quote System',
        email_service_provider: settingsObj.email_service_provider || 'resend',
        notification_recipients: settingsObj.notification_recipients || [],
        approval_admin_recipients: settingsObj.approval_admin_recipients || [],
        enable_notifications: settingsObj.enable_notifications ?? true,
        support_email: settingsObj.support_email || 'cdeligi@qualitrolcorp.com',
      });
    } catch (error: any) {
      console.error('Error fetching email settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_type');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching email templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive',
      });
    }
  };

  const saveEmailSettings = async (override?: EmailSettings) => {
    const next = override || settings;

    try {
      setSaving(true);

      const updates = Object.entries(next).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('email_settings')
          .upsert({
            setting_key: update.setting_key,
            setting_value: update.setting_value,
          }, {
            onConflict: 'setting_key',
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Email settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveEmailTemplate = async (template: EmailTemplate) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('email_templates')
        .update({
          subject_template: template.subject_template,
          body_template: template.body_template,
          enabled: template.enabled,
          variables: template.variables,
        })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email template saved successfully',
      });

      await fetchEmailTemplates();
    } catch (error: any) {
      console.error('Error saving email template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const createEmailTemplate = async () => {
    if (!newTemplate) return;

    const templateType = newTemplate.template_type.trim();
    const variables = newTemplate.variables
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (!templateType) {
      toast({ title: 'Error', description: 'Template type is required', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          template_type: templateType,
          subject_template: `${templateType.replaceAll('_', ' ')} notification`,
          body_template: '<p>Hello {{recipient_name}},</p>\n<p>TODO: write template.</p>',
          variables,
          enabled: true,
        })
        .select('*')
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: 'Email template created successfully' });
      setNewTemplate(null);
      await fetchEmailTemplates();
      if (data) setSelectedTemplate(data as any);
    } catch (error: any) {
      console.error('Error creating email template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create email template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testSMTPConnection = async () => {
    try {
      setTestingSMTP(true);

      // Use notification recipients for test email (not the from_email which is the sender)
      const testRecipients = settings.notification_recipients.length > 0
        ? settings.notification_recipients
        : [];

      if (testRecipients.length === 0) {
        toast({
          title: 'Add a test recipient',
          description: 'Please add at least one Notification Recipient before sending a test email.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.functions.invoke('send-quote-status-email', {
        body: {
          quoteId: 'TEST',
          action: 'approved',
          recipientEmails: testRecipients,
        },
      });

      if (error) throw error;

      toast({
        title: 'Test Email Sent',
        description: 'Check your inbox for the test email',
      });
    } catch (error: any) {
      console.error('Error testing SMTP:', error);
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setTestingSMTP(false);
    }
  };

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  const addRecipient = async (email: string, list: 'notification' | 'approval') => {
    const normalized = normalizeEmail(email);
    if (!normalized) return;

    const next: EmailSettings = {
      ...settings,
      approval_admin_recipients:
        list === 'approval'
          ? Array.from(new Set([...settings.approval_admin_recipients.map(normalizeEmail), normalized]))
          : settings.approval_admin_recipients,
      notification_recipients:
        list === 'notification'
          ? Array.from(new Set([...settings.notification_recipients.map(normalizeEmail), normalized]))
          : settings.notification_recipients,
    };

    // Update UI immediately, then persist to DB (same behavior as Save All Settings)
    setSettings(next);
    await saveEmailSettings(next);
  };

  const removeRecipient = async (email: string, list: 'notification' | 'approval') => {
    const normalized = normalizeEmail(email);

    const next: EmailSettings = {
      ...settings,
      approval_admin_recipients:
        list === 'approval'
          ? settings.approval_admin_recipients.map(normalizeEmail).filter(e => e !== normalized)
          : settings.approval_admin_recipients,
      notification_recipients:
        list === 'notification'
          ? settings.notification_recipients.map(normalizeEmail).filter(e => e !== normalized)
          : settings.notification_recipients,
    };

    setSettings(next);
    await saveEmailSettings(next);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Settings</h2>
          <p className="text-muted-foreground">Configure email notifications for quote approvals and rejections</p>
        </div>
        <Button onClick={saveEmailSettings} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="audit">Email Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Service Configuration</CardTitle>
              <CardDescription>Configure your email service provider and SMTP settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For security, RESEND_API_KEY is stored as a Supabase secret. Ensure it's configured in your Supabase project settings.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.enable_notifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_notifications: checked })
                  }
                />
                <Label>Enable Email Notifications</Label>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Email Service Provider</Label>
                  <Select
                    value={settings.email_service_provider}
                    onValueChange={(value) =>
                      setSettings({ ...settings, email_service_provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="smtp">Custom SMTP</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Support Email (for onboarding / access requests)</Label>
                    <Input
                      type="email"
                      value={settings.support_email || ''}
                      onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                      placeholder="cdeligi@qualitrolcorp.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Email</Label>
                    <Input
                      type="email"
                      value={settings.smtp_from_email}
                      onChange={(e) =>
                        setSettings({ ...settings, smtp_from_email: e.target.value })
                      }
                      placeholder="noreply@qualitrol.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Name</Label>
                    <Input
                      value={settings.smtp_from_name}
                      onChange={(e) =>
                        setSettings({ ...settings, smtp_from_name: e.target.value })
                      }
                      placeholder="QUALITROL Quote System"
                    />
                  </div>
                </div>


                {settings.email_service_provider === 'smtp' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        value={settings.smtp_host}
                        onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                        placeholder="smtp.office365.com or <tenant>.mail.protection.outlook.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => setSettings({ ...settings, smtp_port: Number(e.target.value || 0) })}
                        placeholder="25 / 587"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.smtp_secure}
                        onCheckedChange={(checked) => setSettings({ ...settings, smtp_secure: checked })}
                      />
                      <Label>Use TLS (secure)</Label>
                    </div>
                    <Alert className="col-span-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        For enterprise deployments, we recommend SMTP relay/connector (no password) or storing SMTP credentials as Supabase secrets (not in the database/UI).
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <Button onClick={testSMTPConnection} disabled={testingSMTP} variant="outline">
                  <Send className="w-4 h-4 mr-2" />
                  {testingSMTP ? 'Testing...' : 'Send Test Email'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Recipients</CardTitle>
              <CardDescription>
                Configure recipients for quote submission copies (Salesforce case trigger)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The quote submitter will always receive quote notifications. Additional recipients below will receive a copy only when a quote is submitted (for Salesforce case creation). They will not receive approved/rejected status emails. External domains are allowed.
                </AlertDescription>
              </Alert>

              {/* Approval Admin Recipients */}
              <div className="space-y-2">
                <Label>Approval Admin Recipients (new user access approvals)</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="approver@qualitrolcorp.com"
                    id="new-approval-recipient"
                  />
                  <Button
                    disabled={saving}
                    onClick={async () => {
                      const input = document.getElementById('new-approval-recipient') as HTMLInputElement;
                      if (input.value) {
                        await addRecipient(input.value, 'approval');
                        input.value = '';
                      }
                    }}
                  >
                    {saving ? 'Saving…' : 'Add'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {settings.approval_admin_recipients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No approval admins configured</p>
                  ) : (
                    settings.approval_admin_recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-2">
                        <Mail className="w-3 h-3" />
                        {email}
                        <button
                          onClick={() => removeRecipient(email, 'approval')}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Notification Recipients */}
              <div className="space-y-2">
                <Label>Notification Recipients (quote submission copy only)</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    id="new-recipient"
                  />
                  <Button
                    disabled={saving}
                    onClick={async () => {
                      const input = document.getElementById('new-recipient') as HTMLInputElement;
                      if (input.value) {
                        await addRecipient(input.value, 'notification');
                        input.value = '';
                      }
                    }}
                  >
                    {saving ? 'Saving…' : 'Add'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Notification Recipients</Label>
                <div className="flex flex-wrap gap-2">
                  {settings.notification_recipients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No additional notification recipients configured</p>
                  ) : (
                    settings.notification_recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-2">
                        <Mail className="w-3 h-3" />
                        {email}
                        <button
                          onClick={() => removeRecipient(email, 'notification')}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Create and edit templates (supports adding new templates in the future)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setNewTemplate({ template_type: '', variables: 'recipient_name' })}
                >
                  + Add Template
                </Button>

                {newTemplate && (
                  <div className="border rounded p-3 space-y-2">
                    <div className="space-y-1">
                      <Label>Template Type (unique key)</Label>
                      <Input
                        value={newTemplate.template_type}
                        onChange={(e) => setNewTemplate({ ...newTemplate, template_type: e.target.value })}
                        placeholder="user_request_received"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Variables (comma-separated)</Label>
                      <Input
                        value={newTemplate.variables}
                        onChange={(e) => setNewTemplate({ ...newTemplate, variables: e.target.value })}
                        placeholder="recipient_name, requested_role, request_id"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createEmailTemplate} disabled={saving}>Create</Button>
                      <Button variant="outline" onClick={() => setNewTemplate(null)} disabled={saving}>Cancel</Button>
                    </div>
                  </div>
                )}
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate?.id === template.id ? 'default' : 'outline'}
                    className="w-full justify-between"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <span>{template.template_type.replace('_', ' ').toUpperCase()}</span>
                    <Badge variant={template.enabled ? 'default' : 'secondary'}>
                      {template.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Template: {selectedTemplate.template_type}</CardTitle>
                  <CardDescription>
                    Available variables: {selectedTemplate.variables.join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={selectedTemplate.enabled}
                      onCheckedChange={(checked) =>
                        setSelectedTemplate({ ...selectedTemplate, enabled: checked })
                      }
                    />
                    <Label>Template Enabled</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={selectedTemplate.subject_template}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          subject_template: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body (HTML)</Label>
                    <Textarea
                      value={selectedTemplate.body_template}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          body_template: e.target.value,
                        })
                      }
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveEmailTemplate(selectedTemplate)}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewHtml(selectedTemplate.body_template)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {previewHtml && (
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border rounded p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <EmailAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EmailAuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching email logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Audit Log</CardTitle>
        <CardDescription>Last 50 email notifications sent</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails sent yet</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {log.status === 'sent' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-medium">{log.recipient_email}</span>
                    <Badge variant="outline">{log.template_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quote: {log.quote_id} • {new Date(log.created_at).toLocaleString()}
                  </p>
                  {log.error_message && (
                    <p className="text-sm text-red-500 mt-1">{log.error_message}</p>
                  )}
                </div>
                <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                  {log.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

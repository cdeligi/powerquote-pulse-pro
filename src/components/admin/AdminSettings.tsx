import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserSharingManager } from './UserSharingManager';
import { EmailSettings } from './EmailSettings';

const AdminSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [quoteTermsContent, setQuoteTermsContent] = useState('');
  const [quotePrefix, setQuotePrefix] = useState('QLT');
  const [quoteCounter, setQuoteCounter] = useState(1);
  const [quoteExpiresDays, setQuoteExpiresDays] = useState(30);
  const [companyName, setCompanyName] = useState('QUALITROL');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  
  // Session management settings
  const [sessionDurationHours, setSessionDurationHours] = useState(8);
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState(30);
  const [sessionRefreshIntervalMinutes, setSessionRefreshIntervalMinutes] = useState(30);

  const fetchLegalContent = async () => {
    try {
      setLoading(true);

      // Fetch legal content
      const { data: legalData, error: legalError } = await supabase
        .from('legal_pages')
        .select('slug, content')
        .in('slug', ['terms', 'privacy', 'quote_terms']);

      if (legalError) throw legalError;

      const termsPage = legalData?.find(page => page.slug === 'terms');
      const privacyPage = legalData?.find(page => page.slug === 'privacy');
      const quoteTermsPage = legalData?.find(page => page.slug === 'quote_terms');

      setTermsContent(termsPage?.content || '');
      setPrivacyContent(privacyPage?.content || '');
      setQuoteTermsContent(quoteTermsPage?.content || '');

      // Fetch quote settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['quote_id_prefix', 'quote_id_counter', 'quote_expires_days', 'company_name', 'company_logo_url', 'session_duration_hours', 'inactivity_timeout_minutes', 'session_refresh_interval_minutes']);

      if (settingsError) throw settingsError;

      const prefixSetting = settingsData?.find(s => s.key === 'quote_id_prefix');
      const counterSetting = settingsData?.find(s => s.key === 'quote_id_counter');
      const expiresSetting = settingsData?.find(s => s.key === 'quote_expires_days');
      const nameSetting = settingsData?.find(s => s.key === 'company_name');
      const logoSetting = settingsData?.find(s => s.key === 'company_logo_url');
      const sessionDurationSetting = settingsData?.find(s => s.key === 'session_duration_hours');
      const inactivityTimeoutSetting = settingsData?.find(s => s.key === 'inactivity_timeout_minutes');
      const sessionRefreshSetting = settingsData?.find(s => s.key === 'session_refresh_interval_minutes');

      // Parse values - they're stored as JSONB now (directly, not double-stringified)
      setQuotePrefix(prefixSetting?.value || 'QLT');

      try {
        const limit = await quoteWorkflowService.getFinanceMarginLimit();
        setFinanceLimit(limit);
      } catch (limitError) {
        console.warn('Unable to load finance limit', limitError);
      }

      try {
        const template = await quoteWorkflowService.getEmailTemplate('quote_admin_decision');
        setWorkflowTemplate(template);
      } catch (templateError) {
        console.warn('Unable to load workflow template', templateError);
      }

      setQuoteCounter(typeof counterSetting?.value === 'number' ? counterSetting.value : parseInt(counterSetting?.value || '1'));
      setQuoteExpiresDays(typeof expiresSetting?.value === 'number' ? expiresSetting.value : parseInt(expiresSetting?.value || '30'));
      setCompanyName(nameSetting?.value || 'QUALITROL');
      setCompanyLogoUrl(logoSetting?.value || '');
      setSessionDurationHours(typeof sessionDurationSetting?.value === 'number' ? sessionDurationSetting.value : parseInt(sessionDurationSetting?.value || '8'));
      setInactivityTimeoutMinutes(typeof inactivityTimeoutSetting?.value === 'number' ? inactivityTimeoutSetting.value : parseInt(inactivityTimeoutSetting?.value || '30'));
      setSessionRefreshIntervalMinutes(typeof sessionRefreshSetting?.value === 'number' ? sessionRefreshSetting.value : parseInt(sessionRefreshSetting?.value || '30'));

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalContent();
  }, []);

  const saveLegalContent = async (slug: 'terms' | 'privacy' | 'quote_terms', content: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('legal_pages')
        .upsert({
          slug,
          content,
          updated_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${slug === 'terms' ? 'Terms of Service' : 'Privacy Policy'} updated successfully.`
      });

    } catch (error) {
      console.error('Error saving legal content:', error);
      toast({
        title: 'Error',
        description: `Failed to save ${slug === 'terms' ? 'Terms of Service' : 'Privacy Policy'}.`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const saveFinanceGuardrail = async () => {
    if (!financeLimit) return;
    try {
      setFinanceLimitSaving(true);
      const updated = await quoteWorkflowService.updateFinanceMarginLimit(financeLimit.percent, financeLimit.currency);
      setFinanceLimit(updated);
      toast({
        title: 'Finance Guardrail Updated',
        description: `Minimum margin set to ${updated.percent}%`,
      });
    } catch (error) {
      console.error('Error updating finance guardrail:', error);
      toast({
        title: 'Error',
        description: 'Unable to update finance guardrail.',
        variant: 'destructive',
      });
    } finally {
      setFinanceLimitSaving(false);
    }
  };

  const saveWorkflowTemplate = async () => {
    if (!workflowTemplate) return;
    try {
      setWorkflowTemplateSaving(true);
      await quoteWorkflowService.updateEmailTemplate({
        templateType: workflowTemplate.template_type ?? 'quote_admin_decision',
        subjectTemplate: workflowTemplate.subject_template,
        bodyTemplate: workflowTemplate.body_template,
        enabled: workflowTemplate.enabled ?? true,
      });
      toast({
        title: 'Template Saved',
        description: 'Workflow email template updated successfully.',
      });
    } catch (error) {
      console.error('Error updating workflow template:', error);
      toast({
        title: 'Error',
        description: 'Unable to update workflow template.',
        variant: 'destructive',
      });
    } finally {
      setWorkflowTemplateSaving(false);
    }
  };

  const saveQuoteSettings = async () => {
    try {
      setSaving(true);

      // Store values directly as JSONB - no double stringify
      const updates = [
        { key: 'quote_id_prefix', value: quotePrefix },
        { key: 'quote_id_counter', value: quoteCounter },
        { key: 'quote_expires_days', value: quoteExpiresDays },
        { key: 'company_name', value: companyName },
        { key: 'company_logo_url', value: companyLogoUrl }
      ];

      for (const update of updates) {
        console.log('Saving setting:', update.key, update.value);
        const { error } = await supabase
          .from('app_settings')
          .upsert({
            key: update.key,
            value: update.value,
            updated_by: user?.id
          }, {
            onConflict: 'key'
          });

        if (error) {
          console.error(`Error saving ${update.key}:`, error);
          throw error;
        }
      }

      toast({
        title: 'Success',
        description: 'Quote settings updated successfully.'
      });

    } catch (error) {
      console.error('Error saving quote settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save quote settings.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
        <span className="ml-2 text-white">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Admin Settings</h2>
        <p className="text-gray-400">Configure system settings and legal documents</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-8 bg-gray-800">
          <TabsTrigger value="general" className="text-white data-[state=active]:bg-red-600">
            General
          </TabsTrigger>
          <TabsTrigger value="quotes" className="text-white data-[state=active]:bg-red-600">
            Quote Management
          </TabsTrigger>
          <TabsTrigger value="pdf-template" className="text-white data-[state=active]:bg-red-600">
            PDF Template
          </TabsTrigger>
          <TabsTrigger value="session" className="text-white data-[state=active]:bg-red-600">
            Session Management
          </TabsTrigger>
          <TabsTrigger value="email" className="text-white data-[state=active]:bg-red-600">
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="terms" className="text-white data-[state=active]:bg-red-600">
            Terms & Conditions
          </TabsTrigger>
          <TabsTrigger value="sharing" className="text-white data-[state=active]:bg-red-600">
            User Sharing
          </TabsTrigger>
          <TabsTrigger value="legal" className="text-white data-[state=active]:bg-red-600">
            Legal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-400">
              <p>General system settings will be available here in future updates.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Quote ID Configuration</CardTitle>
                <Button
                  onClick={saveQuoteSettings}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quote-prefix" className="text-white">
                    Quote ID Prefix
                  </Label>
                  <Input
                    id="quote-prefix"
                    value={quotePrefix}
                    onChange={(e) => setQuotePrefix(e.target.value.toUpperCase())}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    placeholder="QLT"
                    maxLength={10}
                  />
                  <p className="text-sm text-gray-400">
                    Letters/numbers only. Will be used as: {quotePrefix}-{quoteCounter}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-counter" className="text-white">
                    Starting Number
                  </Label>
                  <Input
                    id="quote-counter"
                    type="number"
                    value={quoteCounter}
                    onChange={(e) => setQuoteCounter(parseInt(e.target.value) || 1)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    min="1"
                  />
                  <p className="text-sm text-gray-400">
                    Next quote will be: {quotePrefix}-{quoteCounter}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-expires" className="text-white">
                    Expires in (days)
                  </Label>
                  <Input
                    id="quote-expires"
                    type="number"
                    value={quoteExpiresDays}
                    onChange={(e) => setQuoteExpiresDays(parseInt(e.target.value) || 30)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    min="1"
                  />
                  <p className="text-sm text-gray-400">
                    Quote validity period from creation date
                  </p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-white font-medium mb-2">Preview</h4>
                <p className="text-gray-300">
                  Quote IDs will be generated as: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{quotePrefix}-{quoteCounter}</span>, <span className="font-mono bg-gray-700 px-2 py-1 rounded">{quotePrefix}-{quoteCounter + 1}</span>, etc.
                </p>
                <p className="text-gray-300 mt-2">
                  Quotes will be valid for <span className="font-semibold">{quoteExpiresDays} days</span> from creation date.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Finance Guardrail & Workflow Email</CardTitle>
              <CardDescription className="text-gray-400">Update the minimum margin threshold and the admin decision email template.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-white">Minimum Margin Percentage</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={financeLimit?.percent ?? ''}
                    onChange={(e) => setFinanceLimit(prev => ({
                      percent: Number(e.target.value) || 0,
                      currency: prev?.currency ?? 'USD',
                      updatedAt: prev?.updatedAt,
                      updatedBy: prev?.updatedBy,
                    }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="22"
                  />
                  <Button
                    onClick={saveFinanceGuardrail}
                    disabled={financeLimitSaving || !financeLimit}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {financeLimitSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                  </Button>
                </div>
                <p className="text-sm text-gray-400">Quotes below this blended margin automatically route to finance.</p>
                {financeLimit?.updatedAt && (
                  <p className="text-xs text-gray-500">Last updated {new Date(financeLimit.updatedAt).toLocaleString()}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-white">Admin Decision Email</Label>
                <Input
                  value={workflowTemplate?.subject_template ?? ''}
                  onChange={(e) => setWorkflowTemplate(prev => ({
                    ...(prev ?? { template_type: 'quote_admin_decision', enabled: true }),
                    subject_template: e.target.value,
                  }))}
                  placeholder="Quote {{quote_id}} decision"
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <Textarea
                  value={workflowTemplate?.body_template ?? ''}
                  onChange={(e) => setWorkflowTemplate(prev => ({
                    ...(prev ?? { template_type: 'quote_admin_decision', enabled: true }),
                    body_template: e.target.value,
                  }))}
                  className="bg-gray-800 border-gray-600 text-white min-h-[120px]"
                  placeholder="Compose the workflow email body..."
                />
                <Button
                  onClick={saveWorkflowTemplate}
                  disabled={workflowTemplateSaving || !workflowTemplate}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {workflowTemplateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Template'}
                </Button>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="pdf-template">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">PDF Template Configuration</CardTitle>
                <Button
                  onClick={saveQuoteSettings}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Template Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-white">
                    Company Name
                  </Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    placeholder="Enter company name"
                  />
                  <p className="text-sm text-gray-400">
                    This name will appear in the PDF header
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-logo" className="text-white">
                    Company Logo URL
                  </Label>
                  <Input
                    id="company-logo"
                    value={companyLogoUrl}
                    onChange={(e) => setCompanyLogoUrl(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-sm text-gray-400">
                    Upload your logo to an image hosting service and paste the URL here. Logo will appear in PDF header.
                  </p>
                </div>

                {companyLogoUrl && (
                  <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Logo Preview</h4>
                    <img 
                      src={companyLogoUrl} 
                      alt="Company Logo" 
                      className="max-h-20 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">💡 Tip: Logo Hosting</h4>
                <p className="text-gray-300 text-sm">
                  You can use free image hosting services like Imgur, Cloudinary, or upload to your own web server.
                  Make sure the image URL is publicly accessible.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Session Management Configuration</CardTitle>
                <Button
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const updates = [
                        { key: 'session_duration_hours', value: sessionDurationHours },
                        { key: 'inactivity_timeout_minutes', value: inactivityTimeoutMinutes },
                        { key: 'session_refresh_interval_minutes', value: sessionRefreshIntervalMinutes }
                      ];

                      for (const update of updates) {
                        const { error } = await supabase
                          .from('app_settings')
                          .upsert({
                            key: update.key,
                            value: update.value,
                            updated_by: user?.id
                          }, {
                            onConflict: 'key'
                          });

                        if (error) {
                          console.error('Error saving session setting:', update.key, error);
                          throw error;
                        }
                      }

                      toast({
                        title: 'Success',
                        description: 'Session settings saved successfully. Changes will apply on next login.',
                      });
                    } catch (error) {
                      console.error('Error saving session settings:', error);
                      toast({
                        title: 'Error',
                        description: 'Failed to save session settings.',
                        variant: 'destructive'
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Session Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
                <p className="text-blue-300 text-sm">
                  ⚠️ Session management settings control authentication behavior and security. Changes will take effect on the next user login.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-duration" className="text-white">
                    Session Duration (hours)
                  </Label>
                  <Input
                    id="session-duration"
                    type="number"
                    value={sessionDurationHours}
                    onChange={(e) => setSessionDurationHours(parseInt(e.target.value) || 8)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    min="1"
                    max="24"
                  />
                  <p className="text-sm text-gray-400">
                    How long a user session remains valid without activity. Recommended: 8-24 hours.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inactivity-timeout" className="text-white">
                    Inactivity Timeout (minutes)
                  </Label>
                  <Input
                    id="inactivity-timeout"
                    type="number"
                    value={inactivityTimeoutMinutes}
                    onChange={(e) => setInactivityTimeoutMinutes(parseInt(e.target.value) || 30)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    min="5"
                    max="120"
                  />
                  <p className="text-sm text-gray-400">
                    Log out users after this period of inactivity. Recommended: 30-60 minutes for security.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-refresh" className="text-white">
                    Session Refresh Interval (minutes)
                  </Label>
                  <Input
                    id="session-refresh"
                    type="number"
                    value={sessionRefreshIntervalMinutes}
                    onChange={(e) => setSessionRefreshIntervalMinutes(parseInt(e.target.value) || 30)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    min="5"
                    max="60"
                  />
                  <p className="text-sm text-gray-400">
                    How often to automatically refresh authentication tokens to maintain session. Recommended: 30 minutes.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-white font-medium mb-3">Current Configuration</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    • Users will stay logged in for up to <span className="font-semibold text-white">{sessionDurationHours} hours</span>
                  </p>
                  <p className="text-gray-300">
                    • Automatic logout after <span className="font-semibold text-white">{inactivityTimeoutMinutes} minutes</span> of inactivity
                  </p>
                  <p className="text-gray-300">
                    • Session tokens refresh every <span className="font-semibold text-white">{sessionRefreshIntervalMinutes} minutes</span>
                  </p>
                  <p className="text-gray-300 mt-3 pt-3 border-t border-gray-700">
                    <span className="text-yellow-400">⚡</span> Sessions persist across tab switches and page reloads
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  <strong>Security Best Practices:</strong>
                  <br />• Shorter session durations increase security but may inconvenience users
                  <br />• For high-security environments, use 2-4 hour sessions with 15-30 minute inactivity timeout
                  <br />• For convenience, use 8-12 hour sessions with 60 minute inactivity timeout
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Quote Terms & Conditions</CardTitle>
                <Button
                  onClick={() => saveLegalContent('quote_terms', quoteTermsContent)}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Terms & Conditions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="quote-terms" className="text-white">
                  Terms & Conditions Content (Will appear on all generated quote PDFs)
                </Label>
                <Textarea
                  id="quote-terms"
                  value={quoteTermsContent}
                  onChange={(e) => setQuoteTermsContent(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500 min-h-[400px] font-mono text-sm"
                  placeholder="Enter the full Terms & Conditions text that will appear on quote PDFs..."
                />
                <p className="text-sm text-gray-400">
                  This content will automatically be included on the last page of all generated quote PDFs.
                  Use clear, professional language for your terms and conditions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sharing">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">User Sharing & Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <UserSharingManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="legal">
          <div className="space-y-6">
            {/* Terms of Service */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Terms of Service</CardTitle>
                  <Button
                    onClick={() => saveLegalContent('terms', termsContent)}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Terms
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="terms" className="text-white">
                    Terms of Service Content (Markdown supported)
                  </Label>
                  <Textarea
                    id="terms"
                    value={termsContent}
                    onChange={(e) => setTermsContent(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500 min-h-[300px] font-mono text-sm"
                    placeholder="Enter Terms of Service content..."
                  />
                  <p className="text-sm text-gray-400">
                    This content will be displayed when users click on the Terms of Service link during registration.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Policy */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Privacy Policy</CardTitle>
                  <Button
                    onClick={() => saveLegalContent('privacy', privacyContent)}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Privacy Policy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="privacy" className="text-white">
                    Privacy Policy Content (Markdown supported)
                  </Label>
                  <Textarea
                    id="privacy"
                    value={privacyContent}
                    onChange={(e) => setPrivacyContent(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500 min-h-[300px] font-mono text-sm"
                    placeholder="Enter Privacy Policy content..."
                  />
                  <p className="text-sm text-gray-400">
                    This content will be displayed when users click on the Privacy Policy link during registration.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
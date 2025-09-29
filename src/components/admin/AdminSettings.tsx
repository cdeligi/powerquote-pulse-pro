import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserSharingManager } from './UserSharingManager';

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
        .in('key', ['quote_id_prefix', 'quote_id_counter', 'quote_expires_days', 'company_name', 'company_logo_url']);

      if (settingsError) throw settingsError;

      const prefixSetting = settingsData?.find(s => s.key === 'quote_id_prefix');
      const counterSetting = settingsData?.find(s => s.key === 'quote_id_counter');
      const expiresSetting = settingsData?.find(s => s.key === 'quote_expires_days');
      const nameSetting = settingsData?.find(s => s.key === 'company_name');
      const logoSetting = settingsData?.find(s => s.key === 'company_logo_url');

      // Parse values - they're stored as JSONB now (directly, not double-stringified)
      setQuotePrefix(prefixSetting?.value || 'QLT');
      setQuoteCounter(typeof counterSetting?.value === 'number' ? counterSetting.value : parseInt(counterSetting?.value || '1'));
      setQuoteExpiresDays(typeof expiresSetting?.value === 'number' ? expiresSetting.value : parseInt(expiresSetting?.value || '30'));
      setCompanyName(nameSetting?.value || 'QUALITROL');
      setCompanyLogoUrl(logoSetting?.value || '');

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
        <TabsList className="grid w-full grid-cols-6 bg-gray-800">
          <TabsTrigger value="general" className="text-white data-[state=active]:bg-red-600">
            General
          </TabsTrigger>
          <TabsTrigger value="quotes" className="text-white data-[state=active]:bg-red-600">
            Quote Management
          </TabsTrigger>
          <TabsTrigger value="pdf-template" className="text-white data-[state=active]:bg-red-600">
            PDF Template
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
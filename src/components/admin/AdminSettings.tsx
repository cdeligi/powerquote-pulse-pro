import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const AdminSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');

  const fetchLegalContent = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('legal_pages')
        .select('slug, content')
        .in('slug', ['terms', 'privacy']);

      if (error) throw error;

      const termsPage = data?.find(page => page.slug === 'terms');
      const privacyPage = data?.find(page => page.slug === 'privacy');

      setTermsContent(termsPage?.content || '');
      setPrivacyContent(privacyPage?.content || '');

    } catch (error) {
      console.error('Error fetching legal content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load legal content.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalContent();
  }, []);

  const saveLegalContent = async (slug: 'terms' | 'privacy', content: string) => {
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
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="general" className="text-white data-[state=active]:bg-red-600">
            General
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
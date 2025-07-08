/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Plus, Trash2, Save } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'quote_approval' | 'quote_rejection' | 'quote_approved' | 'quote_rejected';
}

interface EmailRecipient {
  email: string;
  role: string;
  notifications: string[];
}

const EmailConfigurationPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [newRecipient, setNewRecipient] = useState({ email: '', role: '', notifications: [''] });

  useEffect(() => {
    loadEmailConfiguration();
  }, []);

  const loadEmailConfiguration = async () => {
    try {
      setLoading(true);
      
      // Load email templates
      const { data: templates, error: templatesError } = await supabase
        .from('app_settings')
        .select('*')
        .like('key', 'email_template_%');

      if (templatesError) throw templatesError;

      // Load email recipients
      const { data: recipients, error: recipientsError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'email_recipients');

      if (recipientsError) throw recipientsError;

      // Process templates
      const processedTemplates = templates?.map(template => ({
        id: template.key,
        name: template.key.replace('email_template_', '').replace('_', ' ').toUpperCase(),
        subject: (template.value as any)?.subject || '',
        body: (template.value as any)?.body || '',
        type: template.key.replace('email_template_', '') as any
      })) || [];

      setEmailTemplates(processedTemplates);
      setEmailRecipients((recipients?.[0]?.value as any) || []);

    } catch (error) {
      console.error('Error loading email configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load email configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: template.id,
          value: {
            subject: template.subject,
            body: template.body
          },
          description: `Email template for ${template.name}`
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email template saved successfully"
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive"
      });
    }
  };

  const saveRecipients = async () => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'email_recipients',
          value: emailRecipients,
          description: 'Email recipients configuration'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email recipients saved successfully"
      });
    } catch (error) {
      console.error('Error saving recipients:', error);
      toast({
        title: "Error",
        description: "Failed to save email recipients",
        variant: "destructive"
      });
    }
  };

  const addRecipient = () => {
    if (newRecipient.email && newRecipient.role) {
      setEmailRecipients([...emailRecipients, { ...newRecipient, notifications: newRecipient.notifications.filter(n => n) }]);
      setNewRecipient({ email: '', role: '', notifications: [''] });
    }
  };

  const removeRecipient = (index: number) => {
    setEmailRecipients(emailRecipients.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white">Loading email configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Templates Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailTemplates.map((template) => (
            <div key={template.id} className="space-y-3 p-4 border border-gray-600 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">{template.name}</h4>
                <Badge variant="outline" className="text-gray-300">
                  {template.type}
                </Badge>
              </div>
              
              <div className="grid gap-3">
                <div>
                  <Label htmlFor={`subject-${template.id}`} className="text-gray-300">
                    Subject
                  </Label>
                  <Input
                    id={`subject-${template.id}`}
                    value={template.subject}
                    onChange={(e) => {
                      const updated = emailTemplates.map(t => 
                        t.id === template.id ? { ...t, subject: e.target.value } : t
                      );
                      setEmailTemplates(updated);
                    }}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Email subject..."
                  />
                </div>
                
                <div>
                  <Label htmlFor={`body-${template.id}`} className="text-gray-300">
                    Body
                  </Label>
                  <Textarea
                    id={`body-${template.id}`}
                    value={template.body}
                    onChange={(e) => {
                      const updated = emailTemplates.map(t => 
                        t.id === template.id ? { ...t, body: e.target.value } : t
                      );
                      setEmailTemplates(updated);
                    }}
                    className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                    placeholder="Email body content..."
                  />
                </div>
                
                <Button
                  onClick={() => saveTemplate(template)}
                  className="bg-blue-600 hover:bg-blue-700 w-fit"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator className="bg-gray-700" />

      {/* Email Recipients Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Email Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Recipients */}
          <div className="space-y-3">
            {emailRecipients.map((recipient, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-600 rounded-lg">
                <div className="flex-1">
                  <div className="text-white font-medium">{recipient.email}</div>
                  <div className="text-gray-400 text-sm">
                    Role: {recipient.role} | Notifications: {recipient.notifications.join(', ')}
                  </div>
                </div>
                <Button
                  onClick={() => removeRecipient(index)}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator className="bg-gray-700" />

          {/* Add New Recipient */}
          <div className="space-y-3 p-4 border border-gray-600 rounded-lg">
            <h4 className="text-white font-medium">Add New Recipient</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="new-email" className="text-gray-300">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({...newRecipient, email: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="email@company.com"
                />
              </div>
              
              <div>
                <Label htmlFor="new-role" className="text-gray-300">Role</Label>
                <Input
                  id="new-role"
                  value={newRecipient.role}
                  onChange={(e) => setNewRecipient({...newRecipient, role: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Finance Manager"
                />
              </div>
              
              <div>
                <Label htmlFor="new-notifications" className="text-gray-300">Notifications</Label>
                <Input
                  id="new-notifications"
                  value={newRecipient.notifications[0]}
                  onChange={(e) => setNewRecipient({...newRecipient, notifications: [e.target.value]})}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="quote_approval, margin_alerts"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={addRecipient}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Recipient
              </Button>
              
              <Button
                onClick={saveRecipients}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save All Recipients
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfigurationPanel;

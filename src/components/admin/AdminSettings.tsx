import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Mail, AlertTriangle, Percent, TrendingUp } from "lucide-react";
import { settingsService, AppSettings } from "@/services/settingsService";

interface AdminSettingsProps {
  onSettingsSave?: (settings: AppSettings) => void;
}

const AdminSettings = ({ onSettingsSave }: AdminSettingsProps) => {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [newCcEmail, setNewCcEmail] = useState('');

  useEffect(() => {
    setSettings(settingsService.getSettings());
  }, []);

  const handleAddCcEmail = () => {
    if (newCcEmail && !settings.ccEmails.includes(newCcEmail)) {
      setSettings(prev => ({
        ...prev,
        ccEmails: [...prev.ccEmails, newCcEmail]
      }));
      setNewCcEmail('');
    }
  };

  const handleRemoveCcEmail = (email: string) => {
    setSettings(prev => ({
      ...prev,
      ccEmails: prev.ccEmails.filter(e => e !== email)
    }));
  };

  const handleSave = () => {
    settingsService.updateSettings(settings);
    
    if (onSettingsSave) {
      onSettingsSave(settings);
    }
    
    alert('Settings saved successfully! Margin changes will apply to new quotes and BOM pricing.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          System Settings
        </h2>
        <p className="text-gray-400">
          Configure system-wide settings including margin thresholds and pricing
        </p>
      </div>

      {/* Margin & Pricing Configuration */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Margin & Pricing Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure margin thresholds and automatic pricing rules for the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="margin-threshold" className="text-white font-medium mb-2 block">
                Margin Warning Threshold (%) *
              </Label>
              <Input
                id="margin-threshold"
                type="number"
                min="0"
                max="100"
                value={settings.marginWarningThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, marginWarningThreshold: Number(e.target.value) }))}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                placeholder="25"
              />
              <p className="text-gray-400 text-xs mt-1">
                Show warnings when discounts reduce margin below this %
              </p>
            </div>

            <div>
              <Label htmlFor="minimum-margin" className="text-white font-medium mb-2 block">
                Minimum Margin (%) *
              </Label>
              <Input
                id="minimum-margin"
                type="number"
                min="0"
                max="100"
                value={settings.minimumMargin}
                onChange={(e) => setSettings(prev => ({ ...prev, minimumMargin: Number(e.target.value) }))}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                placeholder="25"
              />
              <p className="text-gray-400 text-xs mt-1">
                Absolute minimum margin for all products
              </p>
            </div>

            <div>
              <Label htmlFor="standard-margin" className="text-white font-medium mb-2 block">
                Standard Margin (%) *
              </Label>
              <Input
                id="standard-margin"
                type="number"
                min="0"
                max="100"
                value={settings.standardMargin}
                onChange={(e) => setSettings(prev => ({ ...prev, standardMargin: Number(e.target.value) }))}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                placeholder="40"
              />
              <p className="text-gray-400 text-xs mt-1">
                Default margin applied to BOM pricing
              </p>
            </div>
          </div>

          {/* Margin Preview */}
          <div className="bg-gray-800 p-4 rounded border border-blue-600">
            <div className="flex items-center space-x-2 mb-3">
              <Percent className="h-4 w-4 text-blue-500" />
              <span className="text-blue-500 font-medium">Margin Configuration Preview:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Warning appears at:</p>
                <p className="text-yellow-400 font-medium">{settings.marginWarningThreshold}% margin</p>
              </div>
              <div>
                <p className="text-gray-400">Minimum allowed:</p>
                <p className="text-red-400 font-medium">{settings.minimumMargin}% margin</p>
              </div>
              <div>
                <p className="text-gray-400">BOM auto-pricing uses:</p>
                <p className="text-green-400 font-medium">{settings.standardMargin}% margin</p>
              </div>
            </div>
            
            {/* Example calculation */}
            <div className="mt-4 p-3 bg-gray-700 rounded">
              <p className="text-gray-300 text-sm mb-2">Example: Product with $1,000 cost</p>
              <div className="text-xs space-y-1">
                <p className="text-gray-400">
                  • Standard price: ${settingsService.calculatePriceForMargin(1000, settings.standardMargin).toLocaleString()} 
                  ({settings.standardMargin}% margin)
                </p>
                <p className="text-yellow-400">
                  • Warning triggers at: ${settingsService.calculatePriceForMargin(1000, settings.marginWarningThreshold).toLocaleString()} 
                  ({settings.marginWarningThreshold}% margin)
                </p>
                <p className="text-red-400">
                  • Minimum allowed: ${settingsService.calculatePriceForMargin(1000, settings.minimumMargin).toLocaleString()} 
                  ({settings.minimumMargin}% margin)
                </p>
              </div>
            </div>
          </div>

          {/* Preview warning message */}
          <div className="bg-gray-800 p-4 rounded border border-yellow-600">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-500 font-medium">Preview Warning Message:</span>
            </div>
            <p className="text-yellow-400 mt-2 text-sm">
              "Warning: Requested discount will reduce margin to X.X% (below {settings.marginWarningThreshold}% threshold)"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Orders Team Email Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure email settings for PO submissions and order notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Orders Email */}
          <div>
            <Label htmlFor="orders-email" className="text-white font-medium mb-2 block">
              Primary Orders Team Email *
            </Label>
            <Input
              id="orders-email"
              type="email"
              value={settings.ordersTeamEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, ordersTeamEmail: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
              placeholder="orders@company.com"
            />
            <p className="text-gray-400 text-sm mt-1">
              Main email address that will receive PO submissions and BOM attachments
            </p>
          </div>

          {/* CC Emails */}
          <div>
            <Label className="text-white font-medium mb-2 block">
              CC Email Addresses (Optional)
            </Label>
            <div className="space-y-3">
              {/* Existing CC emails */}
              {settings.ccEmails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={email}
                    readOnly
                    className="bg-gray-800 border-gray-600 text-white flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveCcEmail(email)}
                    className="border-gray-600 text-red-400 hover:bg-red-900/20 hover:border-red-500"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              
              {/* Add new CC email */}
              <div className="flex items-center space-x-2">
                <Input
                  type="email"
                  value={newCcEmail}
                  onChange={(e) => setNewCcEmail(e.target.value)}
                  placeholder="additional-email@company.com"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500 flex-1"
                />
                <Button
                  onClick={handleAddCcEmail}
                  disabled={!newCcEmail}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Add CC
                </Button>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Additional email addresses that will receive copies of order notifications
            </p>
          </div>

          {/* Email Subject Prefix */}
          <div>
            <Label htmlFor="subject-prefix" className="text-white font-medium mb-2 block">
              Email Subject Prefix
            </Label>
            <Input
              id="subject-prefix"
              value={settings.emailSubjectPrefix}
              onChange={(e) => setSettings(prev => ({ ...prev, emailSubjectPrefix: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
              placeholder="[PowerQuotePro]"
            />
            <p className="text-gray-400 text-sm mt-1">
              Prefix that will be added to all order notification email subjects
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="pt-4">
        <Button
          onClick={handleSave}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Save className="mr-2 h-4 w-4" />
          Save All Settings
        </Button>
      </div>

      {/* Email Template Preview */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Email Template Preview</CardTitle>
          <CardDescription className="text-gray-400">
            Preview of how order notification emails will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-800 p-4 rounded font-mono text-sm text-gray-300">
            <div className="space-y-2">
              <div><strong>To:</strong> {settings.ordersTeamEmail}</div>
              {settings.ccEmails.length > 0 && (
                <div><strong>CC:</strong> {settings.ccEmails.join(', ')}</div>
              )}
              <div><strong>Subject:</strong> {settings.emailSubjectPrefix} New PO Submission - [Customer Name] - [Quote ID]</div>
              <div className="border-t border-gray-600 pt-2 mt-3">
                <div><strong>Body:</strong></div>
                <div className="mt-2 text-gray-400">
                  New Purchase Order submitted for processing:<br/>
                  <br/>
                  Customer: [Customer Name]<br/>
                  Oracle Customer ID: [Oracle ID]<br/>
                  SFDC Opportunity: [Opportunity ID]<br/>
                  Quote ID: [Quote ID]<br/>
                  Total Value: [Total Value]<br/>
                  <br/>
                  Please find the attached PO and BOM documents.<br/>
                  <br/>
                  Attachments:<br/>
                  - Purchase Order (PDF)<br/>
                  - Bill of Materials (PDF)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;

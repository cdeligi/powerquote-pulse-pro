import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Mail, AlertTriangle, Calendar } from "lucide-react";

interface AdminSettingsProps {
  onSettingsSave?: (settings: AdminSettings) => void;
}

interface AdminSettings {
  ordersTeamEmail: string;
  ccEmails: string[];
  emailSubjectPrefix: string;
  marginWarningThreshold: number;
  quoteValidityDays: number; // New field for quote validity
}

const AdminSettings = ({ onSettingsSave }: AdminSettingsProps) => {
  const [ordersTeamEmail, setOrdersTeamEmail] = useState('orders@qualitrolcorp.com');
  const [ccEmails, setCcEmails] = useState<string[]>(['orders-backup@qualitrolcorp.com']);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [emailSubjectPrefix, setEmailSubjectPrefix] = useState('[PowerQuotePro]');
  const [marginWarningThreshold, setMarginWarningThreshold] = useState(25);
  const [quoteValidityDays, setQuoteValidityDays] = useState(30); // New state for quote validity

  const handleAddCcEmail = () => {
    if (newCcEmail && !ccEmails.includes(newCcEmail)) {
      setCcEmails([...ccEmails, newCcEmail]);
      setNewCcEmail('');
    }
  };

  const handleRemoveCcEmail = (email: string) => {
    setCcEmails(ccEmails.filter(e => e !== email));
  };

  const handleSave = () => {
    const settings: AdminSettings = {
      ordersTeamEmail,
      ccEmails,
      emailSubjectPrefix,
      marginWarningThreshold,
      quoteValidityDays
    };
    
    // Save to localStorage or send to backend
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    if (onSettingsSave) {
      onSettingsSave(settings);
    }
    
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          System Settings
        </h2>
        <p className="text-gray-400">
          Configure system-wide settings and email notifications
        </p>
      </div>

      {/* Quote Validity Settings */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Quote Validity Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure quote expiration settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="quote-validity" className="text-white font-medium mb-2 block">
              Quote Validity Period (Days) *
            </Label>
            <Input
              id="quote-validity"
              type="number"
              min="1"
              max="365"
              value={quoteValidityDays}
              onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
              placeholder="30"
            />
            <p className="text-gray-400 text-sm mt-1">
              All quotes will be valid for this number of days from creation date. 
              Current setting: {quoteValidityDays} days
            </p>
          </div>

          {/* Preview validity message */}
          <div className="bg-gray-800 p-4 rounded border border-blue-600">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-blue-500 font-medium">Preview Quote Validity:</span>
            </div>
            <p className="text-blue-400 mt-2 text-sm">
              "Valid Until: {new Date(Date.now() + quoteValidityDays * 24 * 60 * 60 * 1000).toLocaleDateString()}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Margin Warning Threshold Settings */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Margin Warning Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure when discount warnings should appear in the quote approval process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="margin-threshold" className="text-white font-medium mb-2 block">
              Margin Warning Threshold (%) *
            </Label>
            <Input
              id="margin-threshold"
              type="number"
              min="0"
              max="100"
              value={marginWarningThreshold}
              onChange={(e) => setMarginWarningThreshold(Number(e.target.value))}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
              placeholder="25"
            />
            <p className="text-gray-400 text-sm mt-1">
              Warning will appear when requested discount reduces margin below this percentage. 
              Current setting: {marginWarningThreshold}%
            </p>
          </div>

          {/* Preview warning message */}
          <div className="bg-gray-800 p-4 rounded border border-yellow-600">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-500 font-medium">Preview Warning Message:</span>
            </div>
            <p className="text-yellow-400 mt-2 text-sm">
              "Warning: Requested discount will reduce margin to X.X% (below {marginWarningThreshold}% threshold)"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Orders Team Email Configuration */}
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
              value={ordersTeamEmail}
              onChange={(e) => setOrdersTeamEmail(e.target.value)}
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
              {ccEmails.map((email, index) => (
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
              value={emailSubjectPrefix}
              onChange={(e) => setEmailSubjectPrefix(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
              placeholder="[PowerQuotePro]"
            />
            <p className="text-gray-400 text-sm mt-1">
              Prefix that will be added to all order notification email subjects
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-700">
            <Button
              onClick={handleSave}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <div><strong>To:</strong> {ordersTeamEmail}</div>
              {ccEmails.length > 0 && (
                <div><strong>CC:</strong> {ccEmails.join(', ')}</div>
              )}
              <div><strong>Subject:</strong> {emailSubjectPrefix} New PO Submission - [Customer Name] - [Quote ID]</div>
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

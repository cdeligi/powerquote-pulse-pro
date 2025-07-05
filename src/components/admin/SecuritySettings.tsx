
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Eye, AlertTriangle } from 'lucide-react';

const SecuritySettings = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Security Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Authentication</span>
                <Badge className="bg-green-600 text-white">Enabled</Badge>
              </div>
              <p className="text-gray-400 text-sm">User authentication is active</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Row Level Security</span>
                <Badge className="bg-green-600 text-white">Active</Badge>
              </div>
              <p className="text-gray-400 text-sm">Database access controls enabled</p>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-medium mb-3">Security Actions</h4>
            <div className="flex space-x-2">
              <Button variant="outline" className="border-gray-600 text-white">
                <Eye className="h-4 w-4 mr-2" />
                View Audit Logs
              </Button>
              <Button variant="outline" className="border-gray-600 text-white">
                <Lock className="h-4 w-4 mr-2" />
                Security Report
              </Button>
              <Button variant="outline" className="border-yellow-600 text-yellow-400">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Security Scan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;

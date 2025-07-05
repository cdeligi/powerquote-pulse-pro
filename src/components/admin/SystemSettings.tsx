
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw, Settings } from 'lucide-react';

const SystemSettings = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="mr-2 h-5 w-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Database Status</span>
                <Badge className="bg-green-600 text-white">Active</Badge>
              </div>
              <p className="text-gray-400 text-sm">System database is operational</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Cache Status</span>
                <Badge className="bg-green-600 text-white">Healthy</Badge>
              </div>
              <p className="text-gray-400 text-sm">Application cache is functioning</p>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-medium mb-3">System Maintenance</h4>
            <div className="flex space-x-2">
              <Button variant="outline" className="border-gray-600 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <Button variant="outline" className="border-gray-600 text-white">
                <Settings className="h-4 w-4 mr-2" />
                System Diagnostics
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;

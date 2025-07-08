
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinanceApprovalSettings from './FinanceApprovalSettings';
import UserActivityMonitor from './UserActivityMonitor';
import { Settings, DollarSign, Activity } from 'lucide-react';

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="finance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="finance" className="text-white data-[state=active]:bg-blue-600">
                <DollarSign className="mr-2 h-4 w-4" />
                Finance Settings
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-white data-[state=active]:bg-blue-600">
                <Activity className="mr-2 h-4 w-4" />
                User Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="finance" className="mt-6">
              <FinanceApprovalSettings />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <UserActivityMonitor />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;

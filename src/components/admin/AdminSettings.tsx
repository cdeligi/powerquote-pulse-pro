
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinanceApprovalSettings from './FinanceApprovalSettings';
import EmailConfigurationPanel from './EmailConfigurationPanel';
import MarginConfigurationPanel from './MarginConfigurationPanel';
import { Settings, DollarSign, Mail, Percent } from 'lucide-react';

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
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="finance" className="text-white data-[state=active]:bg-blue-600">
                <DollarSign className="mr-2 h-4 w-4" />
                Finance Settings
              </TabsTrigger>
              <TabsTrigger value="email" className="text-white data-[state=active]:bg-blue-600">
                <Mail className="mr-2 h-4 w-4" />
                Email Configuration
              </TabsTrigger>
              <TabsTrigger value="margin" className="text-white data-[state=active]:bg-blue-600">
                <Percent className="mr-2 h-4 w-4" />
                Margin Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="finance" className="mt-6">
              <FinanceApprovalSettings />
            </TabsContent>

            <TabsContent value="email" className="mt-6">
              <EmailConfigurationPanel />
            </TabsContent>

            <TabsContent value="margin" className="mt-6">
              <MarginConfigurationPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;

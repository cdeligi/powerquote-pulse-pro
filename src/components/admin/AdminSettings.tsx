
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, DollarSign, Shield, Database } from "lucide-react";
import FinanceApprovalSettings from "./FinanceApprovalSettings";
import SystemSettings from "./SystemSettings";
import SecuritySettings from "./SecuritySettings";

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="finance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger value="finance" className="text-white data-[state=active]:bg-blue-600">
            <DollarSign className="mr-2 h-4 w-4" />
            Finance Settings
          </TabsTrigger>
          <TabsTrigger value="system" className="text-white data-[state=active]:bg-blue-600">
            <Database className="mr-2 h-4 w-4" />
            System Settings
          </TabsTrigger>
          <TabsTrigger value="security" className="text-white data-[state=active]:bg-blue-600">
            <Shield className="mr-2 h-4 w-4" />
            Security Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="mt-6">
          <FinanceApprovalSettings />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;

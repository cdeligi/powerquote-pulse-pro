
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Activity } from "lucide-react";
import UserActivityMonitor from "./UserActivityMonitor";
import UserManagementCore from "./UserManagementCore";

const UserManagementEnhanced = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="management" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
          <TabsTrigger value="management" className="text-white data-[state=active]:bg-blue-600">
            <Users className="mr-2 h-4 w-4" />
            User Administration
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-white data-[state=active]:bg-blue-600">
            <Activity className="mr-2 h-4 w-4" />
            User Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="mt-6">
          <UserManagementCore />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <UserActivityMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagementEnhanced;

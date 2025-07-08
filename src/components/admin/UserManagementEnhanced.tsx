
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from './UserManagement';
import UserActivityMonitor from './UserActivityMonitor';
import { Users, Activity } from 'lucide-react';
import { User } from '@/types/auth';

interface UserManagementEnhancedProps {
  user: User;
}

const UserManagementEnhanced = ({ user }: UserManagementEnhancedProps) => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Management System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="users" className="text-white data-[state=active]:bg-blue-600">
                <Users className="mr-2 h-4 w-4" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-white data-[state=active]:bg-blue-600">
                <Activity className="mr-2 h-4 w-4" />
                User Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <UserManagement user={user} />
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

export default UserManagementEnhanced;


import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Package, BarChart3, FileText, Database, UserPlus } from 'lucide-react';
import UserManagementEnhanced from './UserManagementEnhanced';
import ProductManagement from './ProductManagement';
import QuoteApprovalDashboard from './QuoteApprovalDashboard';
import MarginDashboard from './MarginDashboard';
import QuoteFieldConfiguration from './QuoteFieldConfiguration';
import AdminSettings from './AdminSettings';
import { User } from '@/types/auth';

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState("quotes");

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="w-full max-w-none">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-gray-900 border-b border-gray-800 rounded-none">
            <TabsTrigger 
              value="quotes" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-800"
            >
              <FileText className="mr-2 h-4 w-4" />
              Quote Approval
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-800"
            >
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-800"
            >
              <Package className="mr-2 h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger 
              value="margins" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-800"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Margins
            </TabsTrigger>
            <TabsTrigger 
              value="quote-fields" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-800"
            >
              <Database className="mr-2 h-4 w-4" />
              Quote Fields
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-800"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="m-0">
            <QuoteApprovalDashboard user={user} />
          </TabsContent>

          <TabsContent value="users" className="m-0">
            <UserManagementEnhanced />
          </TabsContent>

          <TabsContent value="products" className="m-0">
            <ProductManagement />
          </TabsContent>

          <TabsContent value="margins" className="m-0">
            <MarginDashboard />
          </TabsContent>

          <TabsContent value="quote-fields" className="m-0">
            <QuoteFieldConfiguration />
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;

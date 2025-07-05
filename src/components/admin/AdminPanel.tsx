
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/types/auth";
import QuoteApprovalDashboard from "./QuoteApprovalDashboard";
import UserManagementEnhanced from "./UserManagementEnhanced";
import ProductManagement from "./ProductManagement";
import QuoteFieldConfiguration from "./QuoteFieldConfiguration";
import AdminSettings from "./AdminSettings";
import FinanceApprovalSettings from "./FinanceApprovalSettings";
import UserActivityMonitor from "./UserActivityMonitor";
import MarginDashboard from "./MarginDashboard";
import { Settings, Users, Package, FileText, BarChart3, Shield, Activity, DollarSign } from "lucide-react";

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const isFinanceUser = user.role === 'finance';
  const isAdminUser = user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isFinanceUser ? 'Finance Panel' : 'Admin Panel'}
          </h1>
          <p className="text-gray-400">
            {isFinanceUser 
              ? 'Manage financial approvals and margin controls'
              : 'Manage system settings, users, and approvals'
            }
          </p>
        </div>

        <Tabs defaultValue="quotes" className="w-full">
          <TabsList className="grid w-full bg-gray-900 border-gray-800" style={{
            gridTemplateColumns: isFinanceUser 
              ? 'repeat(4, 1fr)' 
              : 'repeat(8, 1fr)'
          }}>
            <TabsTrigger value="quotes" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="mr-2 h-4 w-4" />
              Quote Approval
            </TabsTrigger>
            
            <TabsTrigger value="margin" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BarChart3 className="mr-2 h-4 w-4" />
              Margin Dashboard
            </TabsTrigger>

            <TabsTrigger value="finance" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <DollarSign className="mr-2 h-4 w-4" />
              Finance Settings
            </TabsTrigger>

            <TabsTrigger value="activity" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Activity className="mr-2 h-4 w-4" />
              User Activity
            </TabsTrigger>

            {isAdminUser && (
              <>
                <TabsTrigger value="users" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </TabsTrigger>

                <TabsTrigger value="products" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Package className="mr-2 h-4 w-4" />
                  Products
                </TabsTrigger>

                <TabsTrigger value="fields" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Shield className="mr-2 h-4 w-4" />
                  Quote Fields
                </TabsTrigger>

                <TabsTrigger value="settings" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="quotes" className="mt-6">
            <QuoteApprovalDashboard user={user} />
          </TabsContent>

          <TabsContent value="margin" className="mt-6">
            <MarginDashboard user={user} />
          </TabsContent>

          <TabsContent value="finance" className="mt-6">
            <FinanceApprovalSettings />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <UserActivityMonitor />
          </TabsContent>

          {isAdminUser && (
            <>
              <TabsContent value="users" className="mt-6">
                <UserManagementEnhanced />
              </TabsContent>

              <TabsContent value="products" className="mt-6">
                <ProductManagement />
              </TabsContent>

              <TabsContent value="fields" className="mt-6">
                <QuoteFieldConfiguration />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <AdminSettings />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;

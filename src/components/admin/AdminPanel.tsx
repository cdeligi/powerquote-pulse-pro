
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/types/auth";
import ProductManagement from "./ProductManagement";
import UserManagement from "./UserManagement";
import QuoteFieldConfiguration from "./QuoteFieldConfiguration";
import AdminSettings from "./AdminSettings";
import MarginDashboard from "./MarginDashboard";
import QuoteAnalyticsDashboard from "../dashboard/QuoteAnalyticsDashboard";
import { 
  Package, 
  Users, 
  Settings, 
  BarChart3, 
  TrendingUp,
  FileText
} from "lucide-react";

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400">Manage products, users, and system configuration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-gray-800">
          <TabsTrigger 
            value="products" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Package className="h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger 
            value="quote-fields" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Quote Fields
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="margins" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Margins
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <ProductManagement user={user} />
        </TabsContent>

        <TabsContent value="quote-fields" className="mt-6">
          <QuoteFieldConfiguration user={user} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement user={user} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <QuoteAnalyticsDashboard user={user} />
        </TabsContent>

        <TabsContent value="margins" className="mt-6">
          <MarginDashboard user={user} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <AdminSettings user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;

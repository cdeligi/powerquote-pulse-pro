
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/types/auth";
import { BOMItem, Level1Product } from "@/types/product";
import { ProductManagement } from "./ProductManagement";
import UserManagement from "./UserManagement";
import QuoteFieldConfiguration from "./QuoteFieldConfiguration";
import AdminSettings from "./AdminSettings";
import MarginDashboard from "./MarginDashboard";
import QuoteAnalyticsDashboard from "../dashboard/QuoteAnalyticsDashboard";
import QuoteApprovalDashboard from "./QuoteApprovalDashboard";
import { productDataService } from "@/services/productDataService";
import { 
  Package, 
  Users, 
  Settings, 
  BarChart3, 
  TrendingUp,
  FileText,
  CheckCircle
} from "lucide-react";

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState("products");

  // Mock analytics data for the dashboard
  const mockAnalytics = {
    monthly: {
      executed: 25,
      approved: 15,
      underAnalysis: 8,
      rejected: 5,
      totalQuotedValue: 450000
    },
    yearly: {
      executed: 280,
      approved: 180,
      underAnalysis: 95,
      rejected: 65,
      totalQuotedValue: 5200000
    }
  };

  // Get mock BOM items from actual product data
  const getMockBomItems = (): BOMItem[] => {
    const level1Products = productDataService.getLevel1Products();
    return level1Products.slice(0, 2).map((product, index) => ({
      id: `${index + 1}`,
      product,
      quantity: index === 0 ? 2 : 1,
      enabled: true
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400">Manage products, users, and system configuration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 bg-gray-800">
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
            value="quote-approval" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Quote Approval
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
          <ProductManagement />
        </TabsContent>

        <TabsContent value="quote-fields" className="mt-6">
          <QuoteFieldConfiguration user={user} />
        </TabsContent>

        <TabsContent value="quote-approval" className="mt-6">
          <QuoteApprovalDashboard user={user} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement user={user} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <QuoteAnalyticsDashboard analytics={mockAnalytics} isAdmin={true} />
        </TabsContent>

        <TabsContent value="margins" className="mt-6">
          <MarginDashboard bomItems={getMockBomItems()} user={user} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/types/auth";
import { BOMItem, Level1Product } from "@/types/product";
import { ProductManagement } from "./ProductManagement";
import UserManagementEnhanced from "./UserManagementEnhanced";
import QuoteFieldConfiguration from "./QuoteFieldConfiguration";
import AdminSettings from "./AdminSettings";
import MarginDashboard from "./MarginDashboard";
import QuoteAnalyticsDashboard from "../dashboard/QuoteAnalyticsDashboard";
import QuoteApprovalDashboard from "./QuoteApprovalDashboard";
import { ChassisTypeManager } from "./ChassisTypeManager";
import PartNumberConfigManager from "./PartNumberConfigManager";
import PermissionsOverview from "./PermissionsOverview";
import { productDataService } from "@/services/productDataService";
import { 
  Package, 
  Users, 
  Settings, 
  BarChart3, 
  TrendingUp,
  FileText,
  CheckCircle,
  Grid3X3,
  Shield,
  Wrench
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

  // Get mock BOM items from actual product data - use sync method for mock data
  const getMockBomItems = (): BOMItem[] => {
    const level1Products = productDataService.getLevel1ProductsSync();
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage products, users, and system configuration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-gray-800 flex overflow-x-auto whitespace-nowrap h-auto">
          <TabsTrigger 
            value="products" 
            className="shrink-0 text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Package className="hidden md:inline-block h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger 
            value="quote-fields" 
            className="shrink-0 text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <FileText className="hidden md:inline-block h-4 w-4 mr-2" />
            Quote Fields
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="shrink-0 text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Users className="hidden md:inline-block h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="shrink-0 text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <BarChart3 className="hidden md:inline-block h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="approval" 
            className="shrink-0 text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <CheckCircle className="hidden md:inline-block h-4 w-4 mr-2" />
            Approval
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="shrink-0 text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Settings className="hidden md:inline-block h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="quote-fields" className="mt-6">
          <QuoteFieldConfiguration user={user} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagementEnhanced user={user} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="margins">Margins</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <QuoteAnalyticsDashboard analytics={mockAnalytics} isAdmin={true} />
              </TabsContent>
              
              <TabsContent value="margins">
                <MarginDashboard bomItems={getMockBomItems()} user={user} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <QuoteApprovalDashboard user={user} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;

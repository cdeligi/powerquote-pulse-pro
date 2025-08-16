
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
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage products, users, and system configuration</p>
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
            value="chassis" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Chassis
          </TabsTrigger>
          <TabsTrigger 
            value="bom" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Wrench className="h-4 w-4 mr-2" />
            BOM
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="permissions" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Shield className="h-4 w-4 mr-2" />
            Permissions
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

        <TabsContent value="chassis" className="mt-6">
          <ChassisTypeManager />
        </TabsContent>

        <TabsContent value="bom" className="mt-6">
          <div className="space-y-6">
            <Tabs defaultValue="part-numbers" className="w-full">
              <TabsList>
                <TabsTrigger value="part-numbers">Part Numbers</TabsTrigger>
                <TabsTrigger value="quote-fields">Quote Fields</TabsTrigger>
              </TabsList>
              <TabsContent value="part-numbers" className="mt-6">
                <PartNumberConfigManager />
              </TabsContent>
              <TabsContent value="quote-fields" className="mt-6">
                <QuoteFieldConfiguration user={user} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagementEnhanced user={user} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsOverview />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="margins">Margins</TabsTrigger>
                <TabsTrigger value="approval">Approval</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="mt-6">
                <AdminSettings />
              </TabsContent>
              <TabsContent value="analytics" className="mt-6">
                <QuoteAnalyticsDashboard analytics={mockAnalytics} isAdmin={true} />
              </TabsContent>
              <TabsContent value="margins" className="mt-6">
                <MarginDashboard bomItems={getMockBomItems()} user={user} />
              </TabsContent>
              <TabsContent value="approval" className="mt-6">
                <QuoteApprovalDashboard user={user} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;

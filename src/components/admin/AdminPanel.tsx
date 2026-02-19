import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/types/auth";
import { ProductManagement } from "./ProductManagement";
import UserManagementEnhanced from "./UserManagementEnhanced";
import QuoteFieldConfiguration from "./QuoteFieldConfiguration";
import AdminSettings from "./AdminSettings";
import QuoteApprovalDashboard from "./QuoteApprovalDashboard";
import AdminKpiDashboard from "./kpi/AdminKpiDashboard";
import { 
  Package, 
  Users, 
  Settings, 
  BarChart3,
  FileText,
  CheckCircle,
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage products, users, and system configuration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-gray-800 flex overflow-x-auto whitespace-nowrap h-auto p-1 gap-1">
          <TabsTrigger 
            value="products" 
            className="shrink-0 min-w-max text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Package className="hidden md:inline-block h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger 
            value="quote-fields" 
            className="shrink-0 min-w-max text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <FileText className="hidden md:inline-block h-4 w-4 mr-2" />
            Quote Fields
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="shrink-0 min-w-max text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Users className="hidden md:inline-block h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="kpi" 
            className="shrink-0 min-w-max text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <BarChart3 className="hidden md:inline-block h-4 w-4 mr-2" />
            KPI
          </TabsTrigger>
          <TabsTrigger 
            value="approval" 
            className="shrink-0 min-w-max text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <CheckCircle className="hidden md:inline-block h-4 w-4 mr-2" />
            Approval
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="shrink-0 min-w-max text-xs md:text-sm px-3 text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
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

        <TabsContent value="kpi" className="mt-6">
          <AdminKpiDashboard user={user} />
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

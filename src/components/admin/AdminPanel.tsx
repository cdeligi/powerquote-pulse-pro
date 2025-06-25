
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  Package,
  ClipboardCheck
} from "lucide-react";
import { User } from "@/types/auth";
import UserManagement from "./UserManagement";
import ProductManagement from "./ProductManagement";
import AdminSettings from "./AdminSettings";
import MarginDashboard from "./MarginDashboard";
import RealQuoteApprovalDashboard from "./RealQuoteApprovalDashboard";
import QuoteFieldConfiguration from "./QuoteFieldConfiguration";

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState("quotes");

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-400">System administration and management</p>
          </div>
          <Badge variant="outline" className="text-red-400 border-red-600">
            Administrator
          </Badge>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-gray-800 rounded-none">
                <TabsTrigger 
                  value="quotes" 
                  className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
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
                  value="analytics" 
                  className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="quotes" className="mt-0">
                  <RealQuoteApprovalDashboard user={user} />
                </TabsContent>

                <TabsContent value="users" className="mt-0">
                  <UserManagement user={user} />
                </TabsContent>

                <TabsContent value="products" className="mt-0">
                  <ProductManagement user={user} />
                </TabsContent>

                <TabsContent value="quote-fields" className="mt-0">
                  <QuoteFieldConfiguration user={user} />
                </TabsContent>

                <TabsContent value="analytics" className="mt-0">
                  <MarginDashboard bomItems={[]} user={user} />
                </TabsContent>

                <TabsContent value="settings" className="mt-0">
                  <AdminSettings />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;

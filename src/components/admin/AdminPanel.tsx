
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Package, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  DollarSign,
  Plus
} from "lucide-react";

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  // Mock data for demonstration
  const pendingApprovals = [
    {
      id: 'Q-2024-001',
      customer: 'ABC Power Company',
      salesperson: 'Sarah Johnson',
      value: 45250,
      discountRequested: 10,
      requestedAt: '2024-01-15',
      justification: 'Long-term customer with high volume potential'
    },
    {
      id: 'Q-2024-006',
      customer: 'Northern Grid Co',
      salesperson: 'Mike Chen',
      value: 89400,
      discountRequested: 15,
      requestedAt: '2024-01-16',
      justification: 'Competitive bid situation, need to match competitor pricing'
    }
  ];

  const recentActivity = [
    {
      id: '1',
      action: 'Quote Q-2024-002 approved',
      user: 'Jennifer Martinez',
      timestamp: '2024-01-16 10:30 AM'
    },
    {
      id: '2',
      action: 'Product catalog updated',
      user: 'Jennifer Martinez',
      timestamp: '2024-01-16 09:15 AM'
    },
    {
      id: '3',
      action: 'Quote Q-2024-005 rejected',
      user: 'Jennifer Martinez',
      timestamp: '2024-01-15 02:45 PM'
    }
  ];

  const handleApproveDiscount = (quoteId: string) => {
    console.log(`Approving discount for quote ${quoteId}`);
    // In real implementation, this would update the quote status
  };

  const handleRejectDiscount = (quoteId: string) => {
    console.log(`Rejecting discount for quote ${quoteId}`);
    // In real implementation, this would update the quote status
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">System administration and approval management</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Settings className="mr-2 h-4 w-4" />
            System Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingApprovals.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">47</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Active Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">23</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$2.4M</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="approvals" className="text-white data-[state=active]:bg-red-600">
            Discount Approvals
          </TabsTrigger>
          <TabsTrigger value="products" className="text-white data-[state=active]:bg-red-600">
            Product Catalog
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-white data-[state=active]:bg-red-600">
            Recent Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Pending Discount Approvals</CardTitle>
              <CardDescription className="text-gray-400">
                Review and approve discount requests from sales team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="p-4 bg-gray-800 rounded-lg border border-yellow-600/20"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-white font-medium">{approval.id}</span>
                          <Badge className="bg-yellow-600 text-white">
                            {approval.discountRequested}% discount
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm">{approval.customer}</p>
                        <p className="text-gray-400 text-sm">
                          Requested by: {approval.salesperson}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">
                          ${approval.value.toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-sm">{approval.requestedAt}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-1">Justification:</p>
                      <p className="text-white text-sm bg-gray-700 p-2 rounded">
                        {approval.justification}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApproveDiscount(approval.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectDiscount(approval.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Product Catalog Management</CardTitle>
              <CardDescription className="text-gray-400">
                Manage products, pricing, and inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Product catalog management interface</p>
                <p className="text-gray-500 text-sm mt-2">
                  This would include CRUD operations for chassis, cards, and pricing
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
              <CardDescription className="text-gray-400">
                System audit trail and user activity log
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg"
                  >
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-white text-sm">{activity.action}</p>
                      <p className="text-gray-400 text-xs">by {activity.user}</p>
                    </div>
                    <span className="text-gray-400 text-xs">{activity.timestamp}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;

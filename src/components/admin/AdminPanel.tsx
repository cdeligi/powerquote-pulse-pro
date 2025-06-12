
import { useState } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  Package, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  DollarSign,
  Plus,
  Edit
} from "lucide-react";

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    type: '',
    price: '',
    description: '',
    slots: '',
    compatibleChassis: ''
  });

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

  const products = [
    { id: 1, name: 'LTX Chassis', type: 'chassis', price: 12500, slots: 14 },
    { id: 2, name: 'MTX Chassis', type: 'chassis', price: 8500, slots: 7 },
    { id: 3, name: 'STX Chassis', type: 'chassis', price: 5500, slots: 4 },
    { id: 4, name: 'Relay Card - 8 Channel', type: 'relay', price: 2500, slots: 1 },
    { id: 5, name: 'Analog Input Card - 8 Channel', type: 'analog', price: 3200, slots: 1 }
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

  const handleRejectWithCounter = (quoteId: string, counterOffer: number) => {
    console.log(`Counter-offering ${counterOffer}% discount for quote ${quoteId}`);
    // In real implementation, this would create a counter-proposal
  };

  const handleAddProduct = () => {
    console.log("Adding new product:", newProduct);
    // In real implementation, this would add to the database
    setIsAddProductOpen(false);
    setNewProduct({
      name: '',
      type: '',
      price: '',
      description: '',
      slots: '',
      compatibleChassis: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">System administration and approval management</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-name" className="text-white">Product Name</Label>
                  <Input
                    id="product-name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="product-type" className="text-white">Product Type</Label>
                  <Select value={newProduct.type} onValueChange={(value) => setNewProduct(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="chassis">Chassis</SelectItem>
                      <SelectItem value="relay">Relay Card</SelectItem>
                      <SelectItem value="analog">Analog Card</SelectItem>
                      <SelectItem value="fiber">Fiber Card</SelectItem>
                      <SelectItem value="display">Display Module</SelectItem>
                      <SelectItem value="bushing">Bushing Module</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="product-price" className="text-white">Price ($)</Label>
                  <Input
                    id="product-price"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter price"
                  />
                </div>
                <div>
                  <Label htmlFor="product-description" className="text-white">Description</Label>
                  <Textarea
                    id="product-description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter product description"
                  />
                </div>
                <Button onClick={handleAddProduct} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  Add Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
            <div className="text-2xl font-bold text-white">{products.length}</div>
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
                  <ApprovalCard 
                    key={approval.id}
                    approval={approval}
                    onApprove={handleApproveDiscount}
                    onRejectWithCounter={handleRejectWithCounter}
                  />
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
              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{product.name}</p>
                      <p className="text-gray-400 text-sm">{product.type} • ${product.price.toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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

// Separate component for approval cards to make the main component cleaner
const ApprovalCard = ({ approval, onApprove, onRejectWithCounter }: {
  approval: any;
  onApprove: (id: string) => void;
  onRejectWithCounter: (id: string, counter: number) => void;
}) => {
  const [counterOffer, setCounterOffer] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-yellow-600/20">
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
      
      {showCounterForm ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="counter-offer" className="text-white text-sm">Counter Offer (%)</Label>
            <Input
              id="counter-offer"
              type="number"
              value={counterOffer}
              onChange={(e) => setCounterOffer(e.target.value)}
              placeholder="e.g., 5"
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => {
                onRejectWithCounter(approval.id, Number(counterOffer));
                setShowCounterForm(false);
                setCounterOffer('');
              }}
            >
              Send Counter Offer
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCounterForm(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex space-x-2">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(approval.id)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => setShowCounterForm(true)}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Counter Offer
          </Button>
          <Button
            variant="destructive"
            onClick={() => console.log('Full reject', approval.id)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

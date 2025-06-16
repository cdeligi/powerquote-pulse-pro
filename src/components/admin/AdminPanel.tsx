
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
import ToggleSwitch from "@/components/ui/toggle-switch";
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
  Edit,
  FileText,
  Upload,
  Download,
  MessageSquare,
  TrendingUp,
  Filter
} from "lucide-react";
import UserManagement from "./UserManagement";
import QuoteApprovalCard from "./QuoteApprovalCard";
import { BOMItem } from "@/types/product";
import { QuoteStatus, getStatusDisplayName, getStatusColor } from "@/utils/quotePipeline";

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('approvals');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  
  const [termsAndConditions, setTermsAndConditions] = useState(`
1. Payment Terms: Net 30 days from invoice date
2. Delivery: FOB shipping point
3. Warranty: 2 years parts and labor
4. Technical Support: 24/7 phone and email support
5. Returns: Prior authorization required
6. Force Majeure: Standard force majeure clause applies
7. Governing Law: Laws of the state of New York
8. Dispute Resolution: Binding arbitration
  `.trim());
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    type: '',
    price: '',
    cost: '',
    description: '',
    slots: '',
    compatibleChassis: '',
    productInfoUrl: '',
    enabled: true
  });

  // Enhanced mock data with quote pipeline statuses
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: 'Q-2024-001',
      customer: 'ABC Power Company',
      oracleCustomerId: 'ORC-12345',
      salesperson: 'Sarah Johnson',
      value: 45250,
      discountRequested: 10,
      requestedAt: '2024-01-15',
      justification: 'Long-term customer with high volume potential. Competitor pricing requires us to match their 10% discount to secure this $45K order.',
      priority: 'High' as const,
      isRepInvolved: true,
      shippingTerms: 'Ex-Works',
      paymentTerms: '30',
      quoteCurrency: 'USD' as const,
      status: 'pending' as QuoteStatus,
      bomItems: [
        {
          id: '1',
          product: {
            id: 'ltx-001',
            name: 'LTX Chassis',
            type: 'LTX',
            height: '7U',
            slots: 14,
            price: 12500,
            cost: 7500,
            description: 'High-capacity chassis for large installations',
            partNumber: 'QTMS-LTX-001',
            enabled: true
          },
          quantity: 2,
          enabled: true
        },
        {
          id: '2',
          product: {
            id: 'rel-008',
            name: 'Relay Card - 8 Channel',
            type: 'relay',
            description: 'High-performance relay card',
            price: 2500,
            cost: 1500,
            slotRequirement: 1,
            compatibleChassis: ['ltx-001'],
            specifications: { channels: 8, voltage: '250V' },
            partNumber: 'QTMS-REL-008',
            enabled: true
          },
          quantity: 8,
          slot: 1,
          enabled: true
        }
      ] as BOMItem[]
    },
    {
      id: 'Q-2024-006',
      customer: 'Northern Grid Co',
      oracleCustomerId: 'ORC-67890',
      salesperson: 'Mike Chen',
      value: 89400,
      discountRequested: 15,
      requestedAt: '2024-01-16',
      justification: 'Competitive bid situation against Schneider Electric. Customer has committed to 3-year maintenance contract if we can match 15% discount.',
      priority: 'Urgent' as const,
      isRepInvolved: false,
      shippingTerms: 'CIF',
      paymentTerms: '60',
      quoteCurrency: 'USD' as const,
      status: 'counter_pending' as QuoteStatus,
      counterOfferHistory: [
        {
          discountOffered: 10,
          offeredAt: '2024-01-17',
          status: 'pending' as const
        }
      ],
      bomItems: [
        {
          id: '3',
          product: {
            id: 'mtx-001',
            name: 'MTX Chassis',
            type: 'MTX',
            height: '4U',
            slots: 7,
            price: 8500,
            cost: 5100,
            description: 'Medium-capacity chassis',
            partNumber: 'QTMS-MTX-001',
            enabled: true
          },
          quantity: 4,
          enabled: true
        },
        {
          id: '4',
          product: {
            id: 'ana-008',
            name: 'Analog Input Card - 8 Channel',
            type: 'analog',
            description: 'High-precision analog input card',
            price: 3200,
            cost: 1920,
            slotRequirement: 1,
            compatibleChassis: ['mtx-001'],
            specifications: { channels: 8, resolution: '16-bit' },
            partNumber: 'QTMS-ANA-008',
            enabled: true
          },
          quantity: 12,
          slot: 1,
          enabled: true
        }
      ] as BOMItem[]
    },
    {
      id: 'Q-2024-007',
      customer: 'Metro Utilities',
      oracleCustomerId: 'ORC-54321',
      salesperson: 'Lisa Park',
      value: 32750,
      discountRequested: 0,
      requestedAt: '2024-01-18',
      justification: 'Standard pricing request - no discount needed',
      priority: 'Medium' as const,
      isRepInvolved: true,
      shippingTerms: 'DDP',
      paymentTerms: '30',
      quoteCurrency: 'EURO' as const,
      status: 'counter_accepted' as QuoteStatus,
      counterOfferHistory: [
        {
          discountOffered: 5,
          offeredAt: '2024-01-19',
          status: 'accepted' as const
        }
      ],
      bomItems: [
        {
          id: '5',
          product: {
            id: 'stx-001',
            name: 'STX Chassis',
            type: 'STX',
            height: '2U',
            slots: 4,
            price: 5500,
            cost: 3300,
            description: 'Compact chassis for small installations',
            partNumber: 'QTMS-STX-001',
            enabled: true
          },
          quantity: 3,
          enabled: true
        }
      ] as BOMItem[]
    }
  ]);

  const products = [
    { id: 1, name: 'LTX Chassis', sku: 'QTMS-LTX-001', type: 'chassis', price: 12500, cost: 7500, slots: 14, enabled: true },
    { id: 2, name: 'MTX Chassis', sku: 'QTMS-MTX-001', type: 'chassis', price: 8500, cost: 5100, slots: 7, enabled: true },
    { id: 3, name: 'STX Chassis', sku: 'QTMS-STX-001', type: 'chassis', price: 5500, cost: 3300, slots: 4, enabled: true },
    { id: 4, name: 'Relay Card - 8 Channel', sku: 'QTMS-REL-008', type: 'relay', price: 2500, cost: 1500, slots: 1, enabled: true },
    { id: 5, name: 'Analog Input Card - 8 Channel', sku: 'QTMS-ANA-008', type: 'analog', price: 3200, cost: 1920, slots: 1, enabled: true }
  ];

  const [productList, setProductList] = useState(products);

  const recentActivity = [
    {
      id: '1',
      action: 'Quote Q-2024-002 approved',
      user: 'Jennifer Martinez',
      timestamp: '2024-01-16 10:30 AM'
    },
    {
      id: '2',
      action: 'Counter offer sent for Q-2024-006',
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

  const handleApproveQuote = (quoteId: string, approvedDiscount: number, updatedTerms: any) => {
    console.log(`Approving quote ${quoteId} with ${approvedDiscount}% discount`, updatedTerms);
    setPendingApprovals(prev => prev.map(q => 
      q.id === quoteId ? { ...q, status: 'approved' as QuoteStatus, ...updatedTerms } : q
    ));
  };

  const handleRejectQuote = (quoteId: string, reason: string) => {
    console.log(`Rejecting quote ${quoteId} with reason: ${reason}`);
    setPendingApprovals(prev => prev.map(q => 
      q.id === quoteId ? { ...q, status: 'rejected' as QuoteStatus } : q
    ));
  };

  const handleCounterOffer = (quoteId: string, counterDiscount: number, updatedTerms: any) => {
    console.log(`Counter-offering ${counterDiscount}% discount for quote ${quoteId}`, updatedTerms);
    setPendingApprovals(prev => prev.map(q => 
      q.id === quoteId ? { 
        ...q, 
        status: 'counter_pending' as QuoteStatus,
        counterOfferHistory: [
          ...(q.counterOfferHistory || []),
          {
            discountOffered: counterDiscount,
            offeredAt: new Date().toISOString(),
            status: 'pending' as const
          }
        ],
        ...updatedTerms
      } : q
    ));
  };

  const handleUpdateTerms = (quoteId: string, updatedTerms: any) => {
    console.log(`Updating terms for quote ${quoteId}`, updatedTerms);
    setPendingApprovals(prev => prev.map(q => 
      q.id === quoteId ? { ...q, ...updatedTerms } : q
    ));
  };

  const handleAddProduct = () => {
    const product = {
      id: productList.length + 1,
      name: newProduct.name,
      sku: newProduct.sku,
      type: newProduct.type,
      price: Number(newProduct.price),
      cost: Number(newProduct.cost) || 0,
      slots: Number(newProduct.slots) || 1,
      enabled: newProduct.enabled
    };
    
    setProductList(prev => [...prev, product]);
    console.log("Adding new product:", product);
    
    setIsAddProductOpen(false);
    setNewProduct({
      name: '',
      sku: '',
      type: '',
      price: '',
      cost: '',
      description: '',
      slots: '',
      compatibleChassis: '',
      productInfoUrl: '',
      enabled: true
    });
  };

  const toggleProductEnabled = (productId: number, enabled: boolean) => {
    setProductList(prev => 
      prev.map(product => 
        product.id === productId ? { ...product, enabled } : product
      )
    );
  };

  const handleSaveTerms = () => {
    console.log("Saving Terms & Conditions:", termsAndConditions);
    alert("Terms & Conditions saved successfully!");
  };

  const exportProductCatalog = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "ID,Name,SKU,Type,Price,Cost,Margin%,Slots,Enabled\n" +
      productList.map(p => {
        const margin = p.cost ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : '0';
        return `${p.id},${p.name},${p.sku},${p.type},${p.price},${p.cost || 0},${margin},${p.slots},${p.enabled}`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_catalog_with_costs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateMargin = (price: number, cost: number) => {
    if (!cost || price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  // Filter quotes based on status
  const filteredQuotes = statusFilter === 'all' 
    ? pendingApprovals 
    : pendingApprovals.filter(q => q.status === statusFilter);

  // Calculate pipeline statistics
  const pipelineStats = {
    pending: pendingApprovals.filter(q => q.status === 'pending').length,
    counterPending: pendingApprovals.filter(q => q.status === 'counter_pending').length,
    counterAccepted: pendingApprovals.filter(q => q.status === 'counter_accepted').length,
    approved: pendingApprovals.filter(q => q.status === 'approved').length,
    rejected: pendingApprovals.filter(q => q.status === 'rejected').length
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
            <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="product-sku" className="text-white">SKU</Label>
                    <Input
                      id="product-sku"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Enter SKU"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
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
                    <Label htmlFor="product-cost" className="text-white">Cost ($)</Label>
                    <Input
                      id="product-cost"
                      type="number"
                      value={newProduct.cost}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, cost: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Enter cost"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="product-info-url" className="text-white">Product Info URL</Label>
                  <Input
                    id="product-info-url"
                    value={newProduct.productInfoUrl}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, productInfoUrl: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="https://www.qualitrolcorp.com/products/..."
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
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="product-enabled" className="text-white">Enabled</Label>
                  <ToggleSwitch
                    checked={newProduct.enabled}
                    onCheckedChange={(enabled) => setNewProduct(prev => ({ ...prev, enabled }))}
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

      {/* Enhanced Quick Stats with Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pipelineStats.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Counter Pending
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pipelineStats.counterPending}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Counter Accepted
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pipelineStats.counterAccepted}</div>
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
            <div className="text-2xl font-bold text-white">{productList.filter(p => p.enabled).length}</div>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-gray-800">
          <TabsTrigger value="approvals" className="text-white data-[state=active]:bg-red-600">
            Quote Pipeline
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="text-white data-[state=active]:bg-red-600">
            Pipeline Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
            User Management
          </TabsTrigger>
          <TabsTrigger value="products" className="text-white data-[state=active]:bg-red-600">
            Product Catalog
          </TabsTrigger>
          <TabsTrigger value="terms" className="text-white data-[state=active]:bg-red-600">
            Terms & Conditions
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-white data-[state=active]:bg-red-600">
            Recent Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">Quote Pipeline Management</CardTitle>
                  <CardDescription className="text-gray-400">
                    Comprehensive quote analysis with BOM details, cost breakdown, margin impact, and pipeline status
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="status-filter" className="text-white text-sm">Filter by Status:</Label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Quotes</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="counter_pending">Counter Offer Pending</SelectItem>
                      <SelectItem value="counter_accepted">Counter Accepted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredQuotes.map((quote) => (
                  <QuoteApprovalCard
                    key={quote.id}
                    quote={quote}
                    onApprove={handleApproveQuote}
                    onReject={handleRejectQuote}
                    onCounterOffer={handleCounterOffer}
                    onUpdateTerms={handleUpdateTerms}
                  />
                ))}
                {filteredQuotes.length === 0 && (
                  <div className="text-center py-8">
                    <Filter className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                    <p className="text-gray-400">No quotes match the selected filter</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Pipeline Overview</CardTitle>
              <CardDescription className="text-gray-400">
                Visual overview of all quotes in the approval pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingApprovals.map((quote) => (
                  <Card key={quote.id} className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-white text-sm">{quote.id}</CardTitle>
                        <Badge className={`${getStatusColor(quote.status)} text-white text-xs`}>
                          {getStatusDisplayName(quote.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-300">
                          <strong>Customer:</strong> {quote.customer}
                        </p>
                        <p className="text-gray-300">
                          <strong>Value:</strong> {quote.quoteCurrency} {quote.value.toLocaleString()}
                        </p>
                        <p className="text-gray-300">
                          <strong>Discount:</strong> {quote.discountRequested}%
                        </p>
                        <p className="text-gray-300">
                          <strong>Sales:</strong> {quote.salesperson}
                        </p>
                        {quote.counterOfferHistory && quote.counterOfferHistory.length > 0 && (
                          <div className="pt-2 border-t border-gray-600">
                            <p className="text-blue-400 text-xs">
                              Last Counter: {quote.counterOfferHistory[quote.counterOfferHistory.length - 1].discountOffered}%
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement user={user} />
        </TabsContent>

        <TabsContent value="products">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">Product Catalog Management</CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage products, pricing, costs, and inventory
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportProductCatalog}
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productList.map((product) => {
                  const margin = calculateMargin(product.price, product.cost || 0);
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <ToggleSwitch
                          checked={product.enabled}
                          onCheckedChange={(enabled) => toggleProductEnabled(product.id, enabled)}
                          size="sm"
                        />
                        <div>
                          <p className={`font-medium ${product.enabled ? 'text-white' : 'text-gray-500'}`}>
                            {product.name}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {product.sku} • {product.type} • ${product.price.toLocaleString()} • Cost: ${(product.cost || 0).toLocaleString()} • Margin: {margin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Terms & Conditions</CardTitle>
              <CardDescription className="text-gray-400">
                Manage the terms and conditions that appear on finalized quotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="terms-content" className="text-white">Terms & Conditions Content</Label>
                  <Textarea
                    id="terms-content"
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                    rows={15}
                    placeholder="Enter terms and conditions text..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    Preview
                  </Button>
                  <Button
                    onClick={handleSaveTerms}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Save Terms
                  </Button>
                </div>
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

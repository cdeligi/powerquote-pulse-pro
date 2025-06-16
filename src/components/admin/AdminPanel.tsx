import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Settings,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package
} from "lucide-react";
import QuoteApprovalCard from "./QuoteApprovalCard";
import UserManagement from "./UserManagement";
import MarginDashboard from "./MarginDashboard";
import AdminSettings from "./AdminSettings";
import ProductManagement from "./ProductManagement";
import QuoteAnalyticsDashboard from "../dashboard/QuoteAnalyticsDashboard";
import { BOMItem } from "@/types/product";
import { calculateQuoteAnalytics, QuoteData } from "@/utils/quoteAnalytics";
import { QuoteStatus } from "@/utils/quotePipeline";
import { User } from "@/types/auth";

interface QuoteApprovalData {
  id: string;
  customer: string;
  oracleCustomerId: string;
  salesperson: string;
  value: number;
  discountRequested: number;
  requestedAt: string;
  justification: string;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  isRepInvolved: boolean;
  shippingTerms: string;
  paymentTerms: string;
  quoteCurrency: 'USD' | 'EURO' | 'GBP' | 'CAD';
  bomItems: BOMItem[];
  sfdcOpportunity: string;
  status: QuoteStatus;
  counterOfferValue?: number;
  counterOfferTerms?: {
    shippingTerms?: string;
    paymentTerms?: string;
    quoteCurrency?: 'USD' | 'EURO' | 'GBP' | 'CAD';
  };
  adminNotes?: string;
  counterOfferHistory?: Array<{
    value: number;
    terms: any;
    timestamp: string;
    adminNotes: string;
  }>;
}

interface AdminPanelProps {
  user: User;
}

const AdminPanel = ({ user }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data for pending approvals
  const mockQuoteRequests: QuoteApprovalData[] = [
    {
      id: "QR-2024-001",
      customer: "Pacific Gas & Electric",
      oracleCustomerId: "ORG-789012",
      salesperson: "John Smith",
      value: 125000,
      discountRequested: 12,
      requestedAt: "2024-01-15T10:30:00Z",
      justification: "High-volume customer with strategic relationship potential",
      priority: 'High',
      isRepInvolved: true,
      shippingTerms: 'FOB Origin',
      paymentTerms: '30 days',
      quoteCurrency: 'USD',
      sfdcOpportunity: 'SF-001234',
      bomItems: [],
      status: 'pending'
    },
    {
      id: "QR-2024-002", 
      customer: "ConEd Solutions",
      oracleCustomerId: "ORG-345678",
      salesperson: "Sarah Johnson",
      value: 87500,
      discountRequested: 8,
      requestedAt: "2024-01-14T14:20:00Z",
      justification: "Competitive pricing needed to secure multi-year contract",
      priority: 'Medium',
      isRepInvolved: false,
      shippingTerms: 'CIF',
      paymentTerms: '45 days',
      quoteCurrency: 'USD',
      sfdcOpportunity: 'SF-005678',
      bomItems: [],
      status: 'pending'
    },
    {
      id: "QR-2024-003",
      customer: "Hydro-Québec",
      oracleCustomerId: "ORG-901234",
      salesperson: "Mike Wilson",
      value: 156000,
      discountRequested: 15,
      requestedAt: "2024-01-13T09:15:00Z",
      justification: "Government utility requiring competitive pricing for public tender",
      priority: 'Urgent',
      isRepInvolved: true,
      shippingTerms: 'DDP',
      paymentTerms: '60 days',
      quoteCurrency: 'CAD',
      sfdcOpportunity: 'SF-009012',
      bomItems: [],
      status: 'pending'
    },
    {
      id: "QR-2024-004",
      customer: "EDF Energy",
      oracleCustomerId: "ORG-567890",
      salesperson: "Emma Davis",
      value: 203000,
      discountRequested: 10,
      requestedAt: "2024-01-12T16:45:00Z",
      justification: "Strategic European expansion opportunity",
      priority: 'High',
      isRepInvolved: true,
      shippingTerms: 'CFR',
      paymentTerms: '30 days',
      quoteCurrency: 'EURO',
      sfdcOpportunity: 'SF-003456',
      bomItems: [],
      status: 'pending'
    },
    {
      id: "QR-2024-005",
      customer: "National Grid",
      oracleCustomerId: "ORG-123456",
      salesperson: "Tom Brown",
      value: 94000,
      discountRequested: 6,
      requestedAt: "2024-01-11T11:30:00Z",
      justification: "Long-term partnership maintenance",
      priority: 'Medium',
      isRepInvolved: false,
      shippingTerms: 'Ex-Works',
      paymentTerms: '30 days',
      quoteCurrency: 'GBP',
      sfdcOpportunity: 'SF-007890',
      bomItems: [],
      status: 'pending'
    }
  ];

  // Mock analytics data
  const mockQuoteData: QuoteData[] = [
    { id: 'Q-001', status: 'finalized', total: 125000, createdAt: '2024-01-15' },
    { id: 'Q-002', status: 'approved', total: 87500, createdAt: '2024-01-14' },
    { id: 'Q-003', status: 'pending_approval', total: 156000, createdAt: '2024-01-13' },
    { id: 'Q-004', status: 'rejected', total: 203000, createdAt: '2024-01-12' },
    { id: 'Q-005', status: 'finalized', total: 94000, createdAt: '2024-01-11' },
    { id: 'Q-006', status: 'approved', total: 176000, createdAt: '2023-12-20' },
    { id: 'Q-007', status: 'finalized', total: 298000, createdAt: '2023-12-15' },
    { id: 'Q-008', status: 'rejected', total: 145000, createdAt: '2023-12-10' },
  ];

  const analytics = calculateQuoteAnalytics(mockQuoteData);

  const handleApprove = (quoteId: string, approvalData: any) => {
    console.log('Approving quote:', quoteId, approvalData);
    // Handle approval logic
  };

  const handleReject = (quoteId: string, reason: string) => {
    console.log('Rejecting quote:', quoteId, 'Reason:', reason);
    // Handle rejection logic
  };

  const handleCounterOffer = (quoteId: string, counterOfferData: any) => {
    console.log('Sending counter offer for quote:', quoteId, counterOfferData);
    // Handle counter offer logic
  };

  // Calculate overview metrics
  const totalPendingValue = mockQuoteRequests.reduce((sum, quote) => sum + quote.value, 0);
  const averageQuoteValue = totalPendingValue / mockQuoteRequests.length;
  const urgentQuotes = mockQuoteRequests.filter(q => q.priority === 'Urgent').length;

  // Mock BOM items for MarginDashboard
  const mockBOMItems: BOMItem[] = [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">
            {user.role === 'admin' ? 'System Administration' : 'Sales Management'} Control Panel
          </p>
        </div>
        <Badge variant="outline" className="border-red-600 text-red-400">
          {user.role === 'admin' ? 'System Admin' : 'Sales Manager'}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800 mb-6">
            <TabsTrigger 
              value="overview" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="approvals" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Quote Approvals
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4 mr-2" />
              Product Management
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              User Management
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Pending Approvals</CardTitle>
                  <FileText className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{mockQuoteRequests.length}</div>
                  <p className="text-xs text-gray-400">
                    {urgentQuotes} urgent
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Quoted Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">${totalPendingValue.toLocaleString()}</div>
                  <p className="text-xs text-gray-400">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Avg Quote Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">${Math.round(averageQuoteValue).toLocaleString()}</div>
                  <p className="text-xs text-gray-400">
                    Current pipeline
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">24</div>
                  <p className="text-xs text-gray-400">
                    3 online now
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Quote Activity</CardTitle>
                <CardDescription className="text-gray-400">
                  Latest quote submissions and status changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockQuoteRequests.slice(0, 3).map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          quote.priority === 'Urgent' ? 'bg-red-500' :
                          quote.priority === 'High' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`} />
                        <div>
                          <p className="text-white font-medium">{quote.customer}</p>
                          <p className="text-gray-400 text-sm">{quote.salesperson} • ${quote.value.toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${
                          quote.priority === 'Urgent' ? 'border-red-600 text-red-400' :
                          quote.priority === 'High' ? 'border-orange-600 text-orange-400' :
                          'border-blue-600 text-blue-400'
                        }`}
                      >
                        {quote.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quote Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Quote Approval Queue</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="border-red-600 text-red-400">
                  {mockQuoteRequests.length} Pending
                </Badge>
              </div>
            </div>

            <div className="grid gap-6">
              {mockQuoteRequests.map((quote) => (
                <QuoteApprovalCard
                  key={quote.id}
                  quote={quote}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onCounterOffer={handleCounterOffer}
                />
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <QuoteAnalyticsDashboard analytics={analytics} isAdmin={true} />
            <MarginDashboard bomItems={mockBOMItems} user={user} />
          </TabsContent>

          {/* NEW: Product Management Tab */}
          <TabsContent value="products" className="space-y-6">
            <ProductManagement user={user} />
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement user={user} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;

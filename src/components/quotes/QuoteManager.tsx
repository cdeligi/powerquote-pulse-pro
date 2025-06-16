import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileText, Eye, Download, ExternalLink, Settings } from "lucide-react";
import { useState } from "react";
import QuoteRequestModal from "./QuoteRequestModal";
import { Quote, BOMItem } from "@/types/product";

interface QuoteManagerProps {
  user: User;
}

const QuoteManager = ({ user }: QuoteManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Mock quotes data with new fields
  const quotes = [
    {
      id: 'Q-2024-001',
      customer: 'ABC Power Company',
      oracleCustomerId: 'ORD-12345',
      value: 45250,
      status: 'pending_approval',
      priority: 'High',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
      items: 5,
      discountRequested: 10,
      pdfUrl: '/quotes/Q-2024-001.pdf'
    },
    {
      id: 'Q-2024-002',
      customer: 'Delta Electric',
      oracleCustomerId: 'ORD-67890',
      value: 78900,
      status: 'approved',
      priority: 'Medium',
      createdAt: '2024-01-14',
      updatedAt: '2024-01-16',
      items: 8,
      discountRequested: 5,
      pdfUrl: '/quotes/Q-2024-002.pdf'
    },
    {
      id: 'Q-2024-003',
      customer: 'Phoenix Utilities',
      oracleCustomerId: 'ORD-11111',
      value: 32100,
      status: 'draft',
      priority: 'Low',
      createdAt: '2024-01-13',
      updatedAt: '2024-01-13',
      items: 3,
      discountRequested: 0,
      pdfUrl: null
    },
    {
      id: 'Q-2024-004',
      customer: 'Meridian Power',
      oracleCustomerId: 'ORD-22222',
      value: 156800,
      status: 'finalized',
      priority: 'High',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12',
      items: 12,
      discountRequested: 15,
      pdfUrl: '/quotes/Q-2024-004.pdf'
    },
    {
      id: 'Q-2024-005',
      customer: 'Apex Energy',
      oracleCustomerId: 'ORD-33333',
      value: 24500,
      status: 'rejected',
      priority: 'Medium',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-09',
      items: 2,
      discountRequested: 25,
      pdfUrl: '/quotes/Q-2024-005.pdf'
    }
  ];

  // Mock BOM items for the selected quote
  const mockBOMItems: BOMItem[] = [
    {
      id: 'bom-1',
      product: {
        id: '1',
        name: 'QTMS Base Unit',
        type: 'QTMS',
        description: 'Qualitrol Transformer Monitoring System',
        price: 12000,
        enabled: true,
        hasQuantitySelection: true
      },
      quantity: 2,
      enabled: true,
      partNumber: 'QTMS-001'
    },
    {
      id: 'bom-2',
      product: {
        id: '201',
        name: 'Relay Card',
        type: 'relay',
        description: '8-Channel Relay Card',
        price: 450,
        slotRequirement: 1,
        compatibleChassis: ['101', '102', '103'],
        specifications: { channels: 8, voltage: '24VDC', current: '2A' },
        enabled: true,
        hasQuantitySelection: false,
        partNumber: 'RELAY-8-001'
      },
      quantity: 4,
      enabled: true,
      partNumber: 'RELAY-8-001',
      slot: 1
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-600', text: 'Draft' },
      pending_approval: { color: 'bg-yellow-600', text: 'Pending Approval' },
      approved: { color: 'bg-green-600', text: 'Approved' },
      rejected: { color: 'bg-red-600', text: 'Rejected' },
      finalized: { color: 'bg-blue-600', text: 'Finalized' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      High: { color: 'bg-red-600 border-red-600', text: 'High' },
      Medium: { color: 'bg-yellow-600 border-yellow-600', text: 'Medium' },
      Low: { color: 'bg-green-600 border-green-600', text: 'Low' }
    };
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.Medium;
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.oracleCustomerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || quote.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const canSeePrices = user.role !== 'level1';

  const handleViewQuote = (quote: any) => {
    // Convert mock quote to proper Quote type
    const properQuote: Quote = {
      id: quote.id,
      userId: 'user-123',
      items: mockBOMItems,
      subtotal: quote.value,
      discount: quote.discountRequested,
      total: quote.value * (1 - quote.discountRequested / 100),
      status: quote.status as Quote['status'],
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      customerName: quote.customer,
      oracleCustomerId: quote.oracleCustomerId,
      priority: quote.priority as Quote['priority'],
      isRepInvolved: false,
      shippingTerms: 'FCA',
      paymentTerms: '30',
      quoteCurrency: 'USD'
    };
    
    setSelectedQuote(properQuote);
    setIsQuoteModalOpen(true);
  };

  const handleApproveQuote = (quoteId: string) => {
    console.log(`Approving quote: ${quoteId}`);
    // In a real app, this would make an API call
    alert(`Quote ${quoteId} has been approved!`);
    setIsQuoteModalOpen(false);
  };

  const handleRejectQuote = (quoteId: string, reason: string) => {
    console.log(`Rejecting quote: ${quoteId} with reason: ${reason}`);
    // In a real app, this would make an API call
    alert(`Quote ${quoteId} has been rejected. Reason: ${reason}`);
    setIsQuoteModalOpen(false);
  };

  const handleCounterOffer = (quoteId: string, discountPercentage: number) => {
    console.log(`Counter offer for quote: ${quoteId} with ${discountPercentage}% discount`);
    // In a real app, this would make an API call
    alert(`Counter offer sent for quote ${quoteId} with ${discountPercentage}% discount`);
    setIsQuoteModalOpen(false);
  };

  const handleDownloadQuote = (quote: any) => {
    if (quote.pdfUrl) {
      console.log(`Downloading quote PDF: ${quote.pdfUrl}`);
      // In a real implementation, this would trigger a download
      alert(`Downloading quote ${quote.id} PDF. In production, this would download: ${quote.pdfUrl}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quote Manager</h1>
          <p className="text-gray-400">Manage and track your quotes</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <FileText className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['High', 'Medium', 'Low'].map(priority => {
          const count = quotes.filter(q => q.priority === priority && q.status !== 'finalized' && q.status !== 'rejected').length;
          const badge = getPriorityBadge(priority);
          return (
            <Card key={priority} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">{priority} Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{count}</div>
                <Badge className={`${badge.color} text-white mt-2`}>
                  In Progress
                </Badge>
              </CardContent>
            </Card>
          );
        })}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {canSeePrices ? `$${quotes.filter(q => q.status !== 'rejected').reduce((sum, q) => sum + q.value, 0).toLocaleString()}` : '—'}
            </div>
            <Badge className="bg-blue-600 text-white mt-2">
              Active Value
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer, quote ID, or Oracle ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quotes in Progress ({filteredQuotes.length})</CardTitle>
          <CardDescription className="text-gray-400">
            Your quote history and current requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredQuotes.map((quote) => {
              const statusBadge = getStatusBadge(quote.status);
              const priorityBadge = getPriorityBadge(quote.priority);
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">{quote.id}</span>
                        <Badge className={`${statusBadge.color} text-white`}>
                          {statusBadge.text}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{quote.customer}</p>
                      <p className="text-gray-500 text-xs">Oracle: {quote.oracleCustomerId}</p>
                    </div>
                    
                    <div>
                      <p className="text-white font-medium">
                        {canSeePrices ? `$${quote.value.toLocaleString()}` : '—'}
                      </p>
                      <p className="text-gray-400 text-sm">{quote.items} items</p>
                    </div>
                    
                    <div>
                      <Badge className={`${priorityBadge.color} text-white mb-1`}>
                        {priorityBadge.text}
                      </Badge>
                      {quote.discountRequested > 0 && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400 block w-fit">
                          {quote.discountRequested}% discount
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-white">Created: {quote.createdAt}</p>
                      <p className="text-gray-400 text-sm">Updated: {quote.updatedAt}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                      onClick={() => handleViewQuote(quote)}
                      title="View Quote Details"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    {(quote.status === 'finalized' || quote.status === 'approved') && quote.pdfUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                        onClick={() => handleDownloadQuote(quote)}
                        title="Download Quote PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quote Request Modal */}
      <QuoteRequestModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quote={selectedQuote}
        bomItems={mockBOMItems}
        user={user}
        onApprove={handleApproveQuote}
        onReject={handleRejectQuote}
        onCounterOffer={handleCounterOffer}
      />
    </div>
  );
};

export default QuoteManager;


import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileText, Eye, Download, ExternalLink, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuotes } from "@/hooks/useQuotes";
import { toast } from "@/hooks/use-toast";

interface QuoteManagerProps {
  user: User;
}

const QuoteManager = ({ user }: QuoteManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low' | 'Draft'>('All');
  const { quotes, loading, error, fetchQuotes } = useQuotes();

  useEffect(() => {
    fetchQuotes();
  }, []);

  // Filter and process quotes
  const processedQuotes = quotes.map(quote => ({
    id: quote.id,
    customer: quote.customer_name || 'Unnamed Customer',
    oracleCustomerId: quote.oracle_customer_id || 'N/A',
    value: quote.original_quote_value || 0,
    status: quote.status,
    priority: quote.priority,
    createdAt: new Date(quote.created_at).toLocaleDateString(),
    updatedAt: new Date(quote.updated_at).toLocaleDateString(),
    items: 0, // This would need to be calculated from BOM items
    discountRequested: quote.requested_discount || 0,
    pdfUrl: quote.status === 'draft' ? null : `/quotes/${quote.id}.pdf`
  }));

  // Remove the mock data array
  const mockQuotes = [
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

  const filteredQuotes = processedQuotes.filter(quote => {
    const matchesSearch = quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.oracleCustomerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || 
                           (priorityFilter === 'Draft' && quote.status === 'draft') ||
                           (priorityFilter !== 'Draft' && quote.priority === priorityFilter);
    return matchesSearch && matchesPriority;
  });

  const canSeePrices = user.role !== 'LEVEL_1';

  const handleViewQuote = (quote: any) => {
    if (quote.pdfUrl) {
      // In a real implementation, this would open the actual PDF
      console.log(`Opening quote PDF: ${quote.pdfUrl}`);
      // For demo purposes, we'll show an alert
      alert(`Opening quote ${quote.id} PDF in new window. In production, this would open: ${quote.pdfUrl}`);
      // window.open(quote.pdfUrl, '_blank');
    } else {
      alert('PDF not yet generated for this quote.');
    }
  };

  const handleDownloadQuote = (quote: any) => {
    if (quote.pdfUrl) {
      console.log(`Downloading quote PDF: ${quote.pdfUrl}`);
      // In a real implementation, this would trigger a download
      alert(`Downloading quote ${quote.id} PDF. In production, this would download: ${quote.pdfUrl}`);
    }
  };

  const handleEditQuote = (quote: any) => {
    if (quote.status === 'draft') {
      // Redirect to BOM builder to continue editing
      window.location.href = '/#configure';
    } else {
      toast({
        title: "Info",
        description: "Only draft quotes can be edited. Submitted quotes require admin approval to modify."
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white">Loading quotes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">Error loading quotes: {error}</div>
      </div>
    );
  }

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['High', 'Medium', 'Low'].map(priority => {
          const count = processedQuotes.filter(q => q.priority === priority && q.status !== 'approved' && q.status !== 'rejected').length;
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
            <CardTitle className="text-white text-sm">Draft Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {processedQuotes.filter(q => q.status === 'draft').length}
            </div>
            <Badge className="bg-gray-600 text-white mt-2">
              In Progress
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {canSeePrices ? `$${processedQuotes.filter(q => q.status !== 'rejected').reduce((sum, q) => sum + q.value, 0).toLocaleString()}` : '—'}
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
              <option value="All">All Quotes</option>
              <option value="Draft">Draft Quotes</option>
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
                    {quote.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-400 hover:text-orange-300 hover:bg-gray-700"
                        onClick={() => handleEditQuote(quote)}
                        title="Continue Editing"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                      onClick={() => handleViewQuote(quote)}
                      title="View Quote PDF"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(quote.status === 'approved') && quote.pdfUrl && (
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
    </div>
  );
};

export default QuoteManager;

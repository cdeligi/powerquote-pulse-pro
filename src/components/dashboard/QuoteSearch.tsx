
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Copy, Filter } from 'lucide-react';
import { Quote } from '@/types/product';

interface QuoteSearchProps {
  onViewQuote: (quoteId: string) => void;
  onDownloadQuote: (quoteId: string) => void;
  onCloneQuote: (quoteId: string) => void;
}

const QuoteSearch = ({ onViewQuote, onDownloadQuote, onCloneQuote }: QuoteSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchBy, setSearchBy] = useState('customer');

  // Mock data - replace with actual data from your backend
  const mockQuotes: Quote[] = [
    {
      id: 'Q-2024-001',
      userId: 'user1',
      items: [],
      subtotal: 25000,
      discount: 0,
      total: 25000,
      status: 'approved',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-16T14:30:00Z',
      customerName: 'ABC Electric Co.',
      oracleCustomerId: 'ORG-12345',
      priority: 'High',
      isRepInvolved: true,
      shippingTerms: 'DDP',
      paymentTerms: '30',
      quoteCurrency: 'USD'
    },
    {
      id: 'Q-2024-002',
      userId: 'user2',
      items: [],
      subtotal: 18500,
      discount: 5,
      total: 17575,
      status: 'pending_approval',
      createdAt: '2024-01-18T09:15:00Z',
      updatedAt: '2024-01-18T09:15:00Z',
      customerName: 'XYZ Power Systems',
      oracleCustomerId: 'ORG-67890',
      priority: 'Medium',
      isRepInvolved: false,
      shippingTerms: 'Ex-Works',
      paymentTerms: '60',
      quoteCurrency: 'USD'
    },
    {
      id: 'Q-2024-003',
      userId: 'user1',
      items: [],
      subtotal: 32000,
      discount: 10,
      total: 28800,
      status: 'rejected',
      createdAt: '2024-01-20T16:45:00Z',
      updatedAt: '2024-01-21T11:20:00Z',
      customerName: 'Power Grid Solutions',
      oracleCustomerId: 'ORG-11111',
      priority: 'Low',
      rejectionReason: 'Price too high for current budget',
      isRepInvolved: true,
      shippingTerms: 'CFR',
      paymentTerms: '90',
      quoteCurrency: 'EURO'
    }
  ];

  const filteredQuotes = mockQuotes.filter(quote => {
    const matchesSearch = searchBy === 'customer' 
      ? quote.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      : searchBy === 'oracle'
      ? quote.oracleCustomerId?.toLowerCase().includes(searchTerm.toLowerCase())
      : quote.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || quote.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-600';
      case 'pending_approval': return 'bg-yellow-600';
      case 'rejected': return 'bg-red-600';
      case 'draft': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Quote Search & Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Select value={searchBy} onValueChange={setSearchBy}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Search by..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="customer" className="text-white hover:bg-gray-700">Customer Name</SelectItem>
                  <SelectItem value="oracle" className="text-white hover:bg-gray-700">Oracle ID</SelectItem>
                  <SelectItem value="quote" className="text-white hover:bg-gray-700">Quote ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                placeholder={`Search by ${searchBy}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">All Status</SelectItem>
                  <SelectItem value="draft" className="text-white hover:bg-gray-700">Draft</SelectItem>
                  <SelectItem value="pending_approval" className="text-white hover:bg-gray-700">Pending</SelectItem>
                  <SelectItem value="approved" className="text-white hover:bg-gray-700">Approved</SelectItem>
                  <SelectItem value="rejected" className="text-white hover:bg-gray-700">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">All Priority</SelectItem>
                  <SelectItem value="High" className="text-white hover:bg-gray-700">High</SelectItem>
                  <SelectItem value="Medium" className="text-white hover:bg-gray-700">Medium</SelectItem>
                  <SelectItem value="Low" className="text-white hover:bg-gray-700">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No quotes found matching your criteria.</p>
              </div>
            ) : (
              filteredQuotes.map((quote) => (
                <Card key={quote.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">{quote.id}</h3>
                        <p className="text-gray-400">{quote.customerName}</p>
                        <p className="text-gray-500 text-sm">Oracle ID: {quote.oracleCustomerId}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getStatusColor(quote.status)}>
                            {quote.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className={`text-sm font-medium ${getPriorityColor(quote.priority)}`}>
                            {quote.priority}
                          </span>
                        </div>
                        <p className="text-white font-bold text-xl">
                          ${quote.total.toLocaleString()} {quote.quoteCurrency}
                        </p>
                        {quote.discount > 0 && (
                          <p className="text-green-400 text-sm">
                            {quote.discount}% discount applied
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <p className="text-white">{new Date(quote.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Updated:</span>
                        <p className="text-white">{new Date(quote.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Shipping:</span>
                        <p className="text-white">{quote.shippingTerms}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Payment:</span>
                        <p className="text-white">{quote.paymentTerms} days</p>
                      </div>
                    </div>

                    {quote.rejectionReason && (
                      <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded">
                        <p className="text-red-400 text-sm">
                          <strong>Rejection Reason:</strong> {quote.rejectionReason}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => onViewQuote(quote.id)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      {quote.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-400 hover:bg-green-900/20"
                          onClick={() => onDownloadQuote(quote.id)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                        onClick={() => onCloneQuote(quote.id)}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Clone
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteSearch;

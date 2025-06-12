
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileText, Eye, Download } from "lucide-react";
import { useState } from "react";

interface QuoteManagerProps {
  user: User;
}

const QuoteManager = ({ user }: QuoteManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock quotes data
  const quotes = [
    {
      id: 'Q-2024-001',
      customer: 'ABC Power Company',
      value: 45250,
      status: 'pending_approval',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
      items: 5,
      discountRequested: 10
    },
    {
      id: 'Q-2024-002',
      customer: 'Delta Electric',
      value: 78900,
      status: 'approved',
      createdAt: '2024-01-14',
      updatedAt: '2024-01-16',
      items: 8,
      discountRequested: 5
    },
    {
      id: 'Q-2024-003',
      customer: 'Phoenix Utilities',
      value: 32100,
      status: 'draft',
      createdAt: '2024-01-13',
      updatedAt: '2024-01-13',
      items: 3,
      discountRequested: 0
    },
    {
      id: 'Q-2024-004',
      customer: 'Meridian Power',
      value: 156800,
      status: 'finalized',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12',
      items: 12,
      discountRequested: 15
    },
    {
      id: 'Q-2024-005',
      customer: 'Apex Energy',
      value: 24500,
      status: 'rejected',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-09',
      items: 2,
      discountRequested: 25
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

  const filteredQuotes = quotes.filter(quote =>
    quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canSeePrices = user.role !== 'level1';

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
                placeholder="Search by customer or quote ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quotes ({filteredQuotes.length})</CardTitle>
          <CardDescription className="text-gray-400">
            Your quote history and current requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredQuotes.map((quote) => {
              const statusBadge = getStatusBadge(quote.status);
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">{quote.id}</span>
                        <Badge className={`${statusBadge.color} text-white`}>
                          {statusBadge.text}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{quote.customer}</p>
                    </div>
                    
                    <div>
                      <p className="text-white font-medium">
                        {canSeePrices ? `$${quote.value.toLocaleString()}` : '—'}
                      </p>
                      <p className="text-gray-400 text-sm">{quote.items} items</p>
                    </div>
                    
                    <div>
                      <p className="text-white">Created: {quote.createdAt}</p>
                      <p className="text-gray-400 text-sm">Updated: {quote.updatedAt}</p>
                    </div>
                    
                    <div>
                      {quote.discountRequested > 0 && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                          {quote.discountRequested}% discount
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {quote.status === 'finalized' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
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

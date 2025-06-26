
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle } from "lucide-react";
import { Quote } from "@/types/quote";

interface QuoteTableProps {
  quotes: Quote[];
  loading: boolean;
  onQuoteSelect: (quote: Quote) => void;
}

const QuoteTable = ({ quotes, loading, onQuoteSelect }: QuoteTableProps) => {
  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="text-white text-center">Loading quotes...</div>
        </CardContent>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="text-gray-400 text-center">No quotes found.</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'approved':
        return 'bg-green-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'draft':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Quotes ({quotes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-medium">{quote.id}</h4>
                <p className="text-gray-400 text-sm">{quote.customerName}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(quote.status)}>
                  {quote.status.replace('_', ' ')}
                </Badge>
                {quote.total < 50000 && (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-400">Total:</span>
                <span className="text-white ml-2">${quote.total.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Priority:</span>
                <span className="text-white ml-2">{quote.priority}</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuoteSelect(quote)}
              className="w-full border-blue-600 text-blue-400 hover:bg-blue-900/20"
            >
              <FileText className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default QuoteTable;

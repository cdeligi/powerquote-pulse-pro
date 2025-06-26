
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Quote } from "@/types/quote";

interface QuoteTableProps {
  quotes: Quote[];
  loading: boolean;
  onQuoteSelect: (quote: Quote) => void;
}

const QuoteTable = ({ quotes, loading, onQuoteSelect }: QuoteTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      case 'pending_approval':
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

  const getPriorityColor = (priority: Quote['priority']) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-500 text-white';
      case 'High':
        return 'bg-orange-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-white';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Quotes ({quotes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotes.map((quote) => {
          const expanded = expandedId === quote.id;
          return (
            <div
              key={quote.id}
              className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-white font-medium">{quote.id}</h4>
                  <p className="text-gray-400 text-sm">{quote.customer_name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-white font-medium">
                    {quote.currency} {quote.discounted_value.toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedId(expanded ? null : quote.id)}
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {expanded && (
                <>
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge className={getPriorityColor(quote.priority)}>
                      {quote.priority}
                    </Badge>
                    {quote.discounted_margin < 25 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-400">Oracle ID:</span>
                      <span className="text-white ml-2">{quote.oracle_customer_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">BOM Items:</span>
                      <span className="text-white ml-2">{quote.bom_items?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Original Value:</span>
                      <span className="text-white ml-2">{quote.currency} {quote.original_quote_value.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Margin:</span>
                      <span className="text-white ml-2">{quote.discounted_margin.toFixed(1)}%</span>
                    </div>
                  </div>

                  {quote.discount_justification && (
                    <div className="mb-3">
                      <p className="text-gray-400 text-xs mb-1">Discount Justification:</p>
                      <p className="text-gray-300 text-sm bg-gray-700 p-2 rounded">{quote.discount_justification}</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuoteSelect(quote)}
                    className="w-full border-blue-600 text-blue-400 hover:bg-blue-900/20"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    View Details & BOM
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default QuoteTable;

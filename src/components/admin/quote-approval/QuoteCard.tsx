
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Quote } from "@/hooks/useQuotes";

interface QuoteCardProps {
  quote: Quote;
  onReviewClick: (quote: Quote) => void;
  onQuickApprove: (quoteId: string) => void;
}

export const QuoteCard = ({ quote, onReviewClick, onQuickApprove }: QuoteCardProps) => {
  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending_approval': return 'border-yellow-500 text-yellow-400';
      case 'under-review': return 'border-blue-500 text-blue-400';
      case 'approved': return 'border-green-500 text-green-400';
      case 'rejected': return 'border-red-500 text-red-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const getPriorityColor = (priority: Quote['priority']) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-600';
      case 'High': return 'bg-orange-600';
      case 'Medium': return 'bg-yellow-600';
      case 'Low': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <Card className="hover:border-red-500 transition-colors">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              {quote.id} - {quote.customer_name}
              <Badge 
                variant="outline" 
                className={`ml-3 text-xs ${getPriorityColor(quote.priority)} border-none text-white`}
              >
                {quote.priority}
              </Badge>
              <Badge 
                variant="outline" 
                className={`ml-2 text-xs ${getStatusColor(quote.status)}`}
              >
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('-', ' ')}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">
              <div className="flex items-center space-x-4">
                <span>Oracle: {quote.oracle_customer_id}</span>
                <span>SFDC: {quote.sfdc_opportunity}</span>
                <span>Submitted by: {quote.submitted_by_name}</span>
              </div>
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {quote.currency} {quote.original_quote_value.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {quote.requested_discount}% discount • {quote.discounted_margin.toFixed(1)}% margin
            </div>
            {quote.discounted_margin < 25 && (
              <div className="flex items-center text-yellow-400 text-xs mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low margin warning
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground">Original Value</p>
            <p className="text-foreground font-medium">{quote.currency} {quote.original_quote_value.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">After Discount</p>
            <p className="text-foreground font-medium">{quote.currency} {quote.discounted_value.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cost</p>
            <p className="text-orange-400 font-medium">{quote.currency} {quote.total_cost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gross Profit</p>
            <p className="text-green-400 font-medium">{quote.currency} {quote.gross_profit.toLocaleString()}</p>
          </div>
        </div>
        
        {quote.discount_justification && (
          <div className="mb-4">
            <p className="text-muted-foreground text-xs mb-1">Discount Justification:</p>
            <p className="text-foreground text-sm bg-muted p-2 rounded">{quote.discount_justification}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReviewClick(quote)}
            className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
          >
            <FileText className="h-4 w-4 mr-1" />
            Review Details & BOM
          </Button>
          {quote.status === 'pending_approval' && (
            <Button
              size="sm"
              onClick={() => onQuickApprove(quote.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Quick Approve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

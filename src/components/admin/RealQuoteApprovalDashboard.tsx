
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Calendar,
  FileText,
  AlertTriangle,
  Percent,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { User as UserType } from "@/types/auth";
import { useQuoteData, useMarginSettings, useQuoteActions, QuoteWithBOM } from "@/hooks/useQuoteData";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface RealQuoteApprovalDashboardProps {
  user: UserType;
}

const RealQuoteApprovalDashboard = ({ user }: RealQuoteApprovalDashboardProps) => {
  const { data: quotes, isLoading: quotesLoading } = useQuoteData();
  const { data: marginSettings } = useMarginSettings();
  const { approveQuote, rejectQuote, counterOffer } = useQuoteActions();

  const [selectedQuote, setSelectedQuote] = useState<QuoteWithBOM | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'counter'>('approve');
  const [notes, setNotes] = useState('');
  const [counterDiscountPercentage, setCounterDiscountPercentage] = useState(0);
  const [activeTab, setActiveTab] = useState('pending');

  if (quotesLoading) {
    return <LoadingSpinner />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-500 text-yellow-400';
      case 'under_review': return 'border-blue-500 text-blue-400';
      case 'approved': return 'border-green-500 text-green-400';
      case 'rejected': return 'border-red-500 text-red-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-600';
      case 'High': return 'bg-orange-600';
      case 'Medium': return 'bg-yellow-600';
      case 'Low': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getMarginColor = (margin: number) => {
    const thresholds = marginSettings?.margin_thresholds || { low: 15, medium: 25, high: 35 };
    if (margin < thresholds.low) return 'text-red-400';
    if (margin < thresholds.medium) return 'text-yellow-400';
    return 'text-green-400';
  };

  const isLowMargin = (margin: number) => {
    const thresholds = marginSettings?.margin_thresholds || { low: 15, medium: 25, high: 35 };
    return margin < thresholds.low;
  };

  const getFilteredQuotes = () => {
    if (!quotes) return [];
    switch (activeTab) {
      case 'pending': return quotes.filter(q => q.status === 'pending');
      case 'under_review': return quotes.filter(q => q.status === 'under_review');
      case 'approved': return quotes.filter(q => q.status === 'approved');
      case 'rejected': return quotes.filter(q => q.status === 'rejected');
      default: return quotes;
    }
  };

  const handleAction = async () => {
    if (!selectedQuote) return;

    try {
      switch (actionType) {
        case 'approve':
          await approveQuote.mutateAsync({
            quoteId: selectedQuote.id,
            notes,
            discount: selectedQuote.requested_discount
          });
          break;
        case 'reject':
          if (!notes.trim()) return;
          await rejectQuote.mutateAsync({
            quoteId: selectedQuote.id,
            reason: notes
          });
          break;
        case 'counter':
          if (counterDiscountPercentage <= 0) return;
          await counterOffer.mutateAsync({
            quoteId: selectedQuote.id,
            discountPercentage: counterDiscountPercentage,
            notes
          });
          break;
      }
      setDialogOpen(false);
      setNotes('');
      setCounterDiscountPercentage(0);
    } catch (error) {
      console.error('Error processing quote action:', error);
    }
  };

  const openDialog = (quote: QuoteWithBOM, action: 'approve' | 'reject' | 'counter') => {
    setSelectedQuote(quote);
    setActionType(action);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Quote Approval Dashboard</h2>
          <p className="text-gray-400">Review and approve submitted quotes with detailed BOM analysis</p>
        </div>
        <div className="flex space-x-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Pending Approval</span>
                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                  {quotes?.filter(q => q.status === 'pending').length || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="pending" className="text-white data-[state=active]:bg-red-600">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({quotes?.filter(q => q.status === 'pending').length || 0})
          </TabsTrigger>
          <TabsTrigger value="under_review" className="text-white data-[state=active]:bg-red-600">
            <FileText className="h-4 w-4 mr-2" />
            Under Review ({quotes?.filter(q => q.status === 'under_review').length || 0})
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-white data-[state=active]:bg-red-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved ({quotes?.filter(q => q.status === 'approved').length || 0})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-white data-[state=active]:bg-red-600">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({quotes?.filter(q => q.status === 'rejected').length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {getFilteredQuotes().map((quote) => (
              <Card key={quote.id} className="bg-gray-900 border-gray-800 hover:border-red-500 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white flex items-center">
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
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-2">
                        <div className="flex items-center space-x-4">
                          <span>Oracle: {quote.oracle_customer_id}</span>
                          <span>SFDC: {quote.sfdc_opportunity}</span>
                          <span>Items: {quote.bom_items.length}</span>
                          {quote.submitted_by_name && (
                            <span>By: {quote.submitted_by_name}</span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        ${quote.original_quote_value.toLocaleString()} {quote.currency}
                      </div>
                      <div className="text-sm text-gray-400">
                        {quote.requested_discount}% discount • {quote.discounted_margin.toFixed(1)}% margin
                      </div>
                      {isLowMargin(quote.discounted_margin) && (
                        <div className="flex items-center text-red-400 text-xs mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low margin warning
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* BOM Items Summary */}
                  <div className="mb-4">
                    <h4 className="text-white font-medium mb-2">Bill of Materials ({quote.bom_items.length} items)</h4>
                    <div className="bg-gray-800 rounded p-3 max-h-40 overflow-y-auto">
                      {quote.bom_items.map((item, index) => (
                        <div key={item.id} className="flex justify-between items-center py-1 text-sm">
                          <div>
                            <span className="text-white">{item.name}</span>
                            {item.part_number && (
                              <span className="text-gray-400 ml-2">({item.part_number})</span>
                            )}
                          </div>
                          <div className="flex space-x-4 text-right">
                            <span className="text-gray-400">Qty: {item.quantity}</span>
                            <span className="text-white">${item.unit_price.toLocaleString()}</span>
                            <span className="text-orange-400">${item.unit_cost.toLocaleString()}</span>
                            <span className={getMarginColor(item.margin)}>{item.margin.toFixed(1)}%</span>
                            <span className="text-white font-medium">${item.total_price.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400">Total Cost</p>
                      <p className="text-orange-400 font-medium">${quote.total_cost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Original Margin</p>
                      <p className={`font-medium ${getMarginColor(quote.original_margin)}`}>
                        {quote.original_margin.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Discounted Value</p>
                      <p className="text-white font-medium">${quote.discounted_value.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Gross Profit</p>
                      <p className="text-green-400 font-medium">${quote.gross_profit.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Quote Fields */}
                  {quote.quote_fields && Object.keys(quote.quote_fields).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-white font-medium mb-2">Quote Details</h4>
                      <div className="bg-gray-800 p-3 rounded text-sm">
                        {Object.entries(quote.quote_fields).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-1">
                            <span className="text-gray-400">{key}:</span>
                            <span className="text-white">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Counter Offers History */}
                  {quote.counter_offers && quote.counter_offers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-white font-medium mb-2">Previous Counter Offers</h4>
                      <div className="space-y-2">
                        {quote.counter_offers.map((offer: any, index: number) => (
                          <div key={index} className="bg-blue-900/20 border border-blue-600 rounded p-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-400">{offer.discount}% discount offered</span>
                              <span className="text-gray-400">{new Date(offer.created_at).toLocaleDateString()}</span>
                            </div>
                            {offer.notes && (
                              <p className="text-gray-300 mt-1">{offer.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(quote, 'approve')}
                      className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {(quote.status === 'pending' || quote.status === 'under_review') && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openDialog(quote, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(quote, 'counter')}
                          className="border-orange-600 text-orange-400 hover:bg-orange-900/20"
                        >
                          <Percent className="h-4 w-4 mr-1" />
                          Counter Offer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(quote, 'reject')}
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {getFilteredQuotes().length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No quotes found in this category.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === 'approve' && 'Approve Quote'}
              {actionType === 'reject' && 'Reject Quote'}
              {actionType === 'counter' && 'Counter Offer'}
              {selectedQuote && ` - ${selectedQuote.id}`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4">
              {actionType === 'counter' && (
                <div>
                  <Label className="text-white">Counter Discount Percentage</Label>
                  <Input
                    type="number"
                    value={counterDiscountPercentage}
                    onChange={(e) => setCounterDiscountPercentage(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                    placeholder="Enter discount percentage"
                    min="0"
                    max="50"
                  />
                  {counterDiscountPercentage > 0 && (
                    <div className="mt-2 p-3 bg-gray-800 rounded">
                      <p className="text-sm text-gray-400">New Quote Value:</p>
                      <p className="text-white font-bold">
                        ${(selectedQuote.original_quote_value * (1 - counterDiscountPercentage / 100)).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <Label htmlFor="action-notes" className="text-white">
                  {actionType === 'approve' && 'Approval Notes (Optional)'}
                  {actionType === 'reject' && 'Rejection Reason (Required)'}
                  {actionType === 'counter' && 'Counter Offer Notes (Optional)'}
                </Label>
                <Textarea
                  id="action-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                  placeholder={
                    actionType === 'reject' 
                      ? "Please provide a reason for rejecting this quote..."
                      : "Add any additional notes..."
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={actionType === 'reject' && !notes.trim()}
                  className={
                    actionType === 'approve' ? "bg-green-600 hover:bg-green-700" :
                    actionType === 'reject' ? "bg-red-600 hover:bg-red-700" :
                    "bg-orange-600 hover:bg-orange-700"
                  }
                >
                  {actionType === 'approve' && <CheckCircle className="h-4 w-4 mr-1" />}
                  {actionType === 'reject' && <XCircle className="h-4 w-4 mr-1" />}
                  {actionType === 'counter' && <Percent className="h-4 w-4 mr-1" />}
                  {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                  {actionType === 'counter' && ' Offer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RealQuoteApprovalDashboard;

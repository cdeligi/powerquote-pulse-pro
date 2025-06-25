
import { useState, useEffect } from "react";
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
  TrendingUp,
  Package
} from "lucide-react";
import { User as UserType } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BOMItem } from "@/types/product";

interface QuoteData {
  id: string;
  customer_name: string;
  oracle_customer_id: string;
  sfdc_opportunity: string;
  submitted_by_name: string;
  submitted_by_email: string;
  created_at: string;
  status: string;
  original_quote_value: number;
  discounted_value: number;
  requested_discount: number;
  discount_justification: string;
  original_margin: number;
  discounted_margin: number;
  total_cost: number;
  gross_profit: number;
  priority: string;
  is_rep_involved: boolean;
  shipping_terms: string;
  payment_terms: string;
  currency: string;
  quote_fields: any;
  counter_offers: any[];
  approved_discount: number;
}

interface BOMItemData {
  id: string;
  quote_id: string;
  product_id: string;
  name: string;
  description: string;
  part_number: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  total_cost: number;
  margin: number;
}

interface MarginThreshold {
  id: string;
  threshold_name: string;
  minimum_margin_percent: number;
  warning_message: string;
  requires_approval: boolean;
}

interface QuoteApprovalDashboardProps {
  user: UserType;
}

const QuoteApprovalDashboard = ({ user }: QuoteApprovalDashboardProps) => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [bomItems, setBomItems] = useState<Record<string, BOMItemData[]>>({});
  const [marginThresholds, setMarginThresholds] = useState<MarginThreshold[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [counterDiscountPercentage, setCounterDiscountPercentage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
    fetchMarginThreshresholds();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotes(quotesData || []);

      // Fetch BOM items for each quote
      const bomItemsMap: Record<string, BOMItemData[]> = {};
      for (const quote of quotesData || []) {
        const { data: bomData, error: bomError } = await supabase
          .from('bom_items')
          .select('*')
          .eq('quote_id', quote.id);

        if (!bomError && bomData) {
          bomItemsMap[quote.id] = bomData;
        }
      }
      setBomItems(bomItemsMap);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quotes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarginThreshresholds = async () => {
    try {
      const { data, error } = await supabase
        .from('margin_thresholds')
        .select('*')
        .order('minimum_margin_percent', { ascending: false });

      if (!error && data) {
        setMarginThresholds(data);
      }
    } catch (error) {
      console.error('Error fetching margin thresholds:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-500 text-yellow-400';
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

  const getMarginWarning = (margin: number) => {
    const threshold = marginThresholds.find(t => margin < t.minimum_margin_percent);
    return threshold;
  };

  const getFilteredQuotes = () => {
    switch (activeTab) {
      case 'pending': return quotes.filter(q => q.status === 'pending');
      case 'approved': return quotes.filter(q => q.status === 'approved');
      case 'rejected': return quotes.filter(q => q.status === 'rejected');
      default: return quotes;
    }
  };

  const handleApprove = async (quote: QuoteData) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          approval_notes: approvalNotes,
          approved_discount: quote.requested_discount
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: "Quote Approved",
        description: `Quote ${quote.id} has been approved successfully.`
      });
      
      setDialogOpen(false);
      setApprovalNotes('');
      fetchQuotes();
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: "Error",
        description: "Failed to approve quote",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (quote: QuoteData) => {
    if (!approvalNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: approvalNotes
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: "Quote Rejected",
        description: `Quote ${quote.id} has been rejected.`,
        variant: "destructive"
      });
      
      setDialogOpen(false);
      setApprovalNotes('');
      fetchQuotes();
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        title: "Error",
        description: "Failed to reject quote",
        variant: "destructive"
      });
    }
  };

  const handleCounterOffer = async (quote: QuoteData) => {
    if (!counterDiscountPercentage) return;

    const counterDiscount = Number(counterDiscountPercentage);
    const newValue = quote.original_quote_value * (1 - counterDiscount / 100);
    const newMargin = ((newValue - quote.total_cost) / newValue) * 100;

    try {
      const counterOffers = [...(quote.counter_offers || []), {
        discountOffered: counterDiscount,
        offeredAt: new Date().toISOString(),
        status: 'pending'
      }];

      const { error } = await supabase
        .from('quotes')
        .update({
          counter_offers: counterOffers,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          approval_notes: approvalNotes
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: "Counter Offer Sent",
        description: `Counter offer of ${counterDiscount}% discount sent for quote ${quote.id}.`
      });
      
      setDialogOpen(false);
      setApprovalNotes('');
      setCounterDiscountPercentage('');
      fetchQuotes();
    } catch (error) {
      console.error('Error sending counter offer:', error);
      toast({
        title: "Error",
        description: "Failed to send counter offer",
        variant: "destructive"
      });
    }
  };

  const openQuoteDialog = (quote: QuoteData) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading quotes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Quote Approval Dashboard</h2>
          <p className="text-gray-400">Review and approve submitted quotes from sales team</p>
        </div>
        <div className="flex space-x-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Pending Approval</span>
                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                  {quotes.filter(q => q.status === 'pending').length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger 
            value="pending" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4 mr-2" />
            Pending ({quotes.filter(q => q.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved ({quotes.filter(q => q.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger 
            value="rejected" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({quotes.filter(q => q.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {getFilteredQuotes().map((quote) => {
              const quoteBomItems = bomItems[quote.id] || [];
              const marginWarning = getMarginWarning(quote.discounted_margin);
              
              return (
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
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </Badge>
                          {marginWarning && (
                            <Badge variant="outline" className="ml-2 text-xs border-red-500 text-red-400">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {marginWarning.threshold_name}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-2">
                          <div className="flex items-center space-x-4">
                            <span>Oracle: {quote.oracle_customer_id}</span>
                            <span>SFDC: {quote.sfdc_opportunity}</span>
                            <span>Items: {quoteBomItems.length}</span>
                            <span>Submitted by: {quote.submitted_by_name}</span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          ${quote.original_quote_value.toLocaleString()}
                        </div>
                        {quote.requested_discount > 0 && (
                          <div className="text-lg font-bold text-orange-400">
                            ${quote.discounted_value.toLocaleString()} 
                            <span className="text-sm text-gray-400 ml-2">
                              (-{quote.requested_discount}%)
                            </span>
                          </div>
                        )}
                        <div className="text-sm text-gray-400">
                          Original: {quote.original_margin.toFixed(1)}% margin • 
                          Final: {quote.discounted_margin.toFixed(1)}% margin
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-400">Total Cost</p>
                        <p className="text-orange-400 font-medium">${quote.total_cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Gross Profit</p>
                        <p className="text-green-400 font-medium">${quote.gross_profit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Requested Discount</p>
                        <p className="text-white font-medium">{quote.requested_discount}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Final Margin</p>
                        <p className={`font-medium ${quote.discounted_margin < 25 ? 'text-red-400' : 'text-green-400'}`}>
                          {quote.discounted_margin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    {quote.discount_justification && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs mb-1">Discount Justification:</p>
                        <p className="text-gray-300 text-sm bg-gray-800 p-2 rounded">{quote.discount_justification}</p>
                      </div>
                    )}

                    {/* Counter Offer History */}
                    {quote.counter_offers && quote.counter_offers.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs mb-2">Counter Offer History:</p>
                        <div className="flex space-x-2">
                          {quote.counter_offers.map((offer: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs border-blue-500 text-blue-400">
                              {offer.discountOffered}% - {offer.status}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQuoteDialog(quote)}
                        className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Review Details
                      </Button>
                      {quote.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(quote)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(quote)}
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
              );
            })}
          </div>

          {getFilteredQuotes().length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No quotes found in this category.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quote Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Quote Details - {selectedQuote?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6">
              {/* Customer & Quote Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-gray-400">Customer Name</Label>
                      <p className="text-white font-medium">{selectedQuote.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Oracle Customer ID</Label>
                      <p className="text-white font-medium">{selectedQuote.oracle_customer_id}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">SFDC Opportunity</Label>
                      <p className="text-white font-medium">{selectedQuote.sfdc_opportunity}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Rep Involved</Label>
                      <p className="text-white font-medium">{selectedQuote.is_rep_involved ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Submitted By</Label>
                      <p className="text-white font-medium">{selectedQuote.submitted_by_name}</p>
                      <p className="text-gray-400 text-sm">{selectedQuote.submitted_by_email}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Terms & Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-gray-400">Currency</Label>
                      <p className="text-white font-medium">{selectedQuote.currency}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Shipping Terms</Label>
                      <p className="text-white font-medium">{selectedQuote.shipping_terms}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Payment Terms</Label>
                      <p className="text-white font-medium">{selectedQuote.payment_terms} days</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Priority</Label>
                      <Badge className={`${getPriorityColor(selectedQuote.priority)} text-white`}>
                        {selectedQuote.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Analysis */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Financial Analysis & Margin Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-700 rounded">
                      <p className="text-gray-400 text-sm">Original Value</p>
                      <p className="text-white text-xl font-bold">${selectedQuote.original_quote_value.toLocaleString()}</p>
                      <p className="text-green-400 text-sm">{selectedQuote.original_margin.toFixed(1)}% margin</p>
                    </div>
                    <div className="text-center p-4 bg-gray-700 rounded">
                      <p className="text-gray-400 text-sm">After Discount</p>
                      <p className="text-orange-400 text-xl font-bold">${selectedQuote.discounted_value.toLocaleString()}</p>
                      <p className={`text-sm ${selectedQuote.discounted_margin < 25 ? 'text-red-400' : 'text-green-400'}`}>
                        {selectedQuote.discounted_margin.toFixed(1)}% margin
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-700 rounded">
                      <p className="text-gray-400 text-sm">Total Cost</p>
                      <p className="text-orange-400 text-xl font-bold">${selectedQuote.total_cost.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-700 rounded">
                      <p className="text-gray-400 text-sm">Gross Profit</p>
                      <p className="text-green-400 text-xl font-bold">${selectedQuote.gross_profit.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {getMarginWarning(selectedQuote.discounted_margin) && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-600/20 rounded flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-sm">
                        {getMarginWarning(selectedQuote.discounted_margin)?.warning_message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BOM Details */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Bill of Materials Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-400 pb-2">Item</th>
                          <th className="text-center text-gray-400 pb-2">Part Number</th>
                          <th className="text-center text-gray-400 pb-2">Qty</th>
                          <th className="text-right text-gray-400 pb-2">Unit Price</th>
                          <th className="text-right text-gray-400 pb-2">Unit Cost</th>
                          <th className="text-right text-gray-400 pb-2">Margin %</th>
                          <th className="text-right text-gray-400 pb-2">Total Price</th>
                          <th className="text-right text-gray-400 pb-2">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(bomItems[selectedQuote.id] || []).map((item, index) => (
                          <tr key={index} className="border-b border-gray-800">
                            <td className="py-3 text-white">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-400">{item.description}</p>
                              </div>
                            </td>
                            <td className="py-3 text-white font-mono text-sm text-center">{item.part_number}</td>
                            <td className="py-3 text-white text-center">{item.quantity}</td>
                            <td className="py-3 text-white text-right">${item.unit_price.toLocaleString()}</td>
                            <td className="py-3 text-orange-400 text-right">${item.unit_cost.toLocaleString()}</td>
                            <td className={`py-3 text-right font-medium ${item.margin < 25 ? 'text-red-400' : 'text-green-400'}`}>
                              {item.margin.toFixed(1)}%
                            </td>
                            <td className="py-3 text-white text-right font-bold">${item.total_price.toLocaleString()}</td>
                            <td className="py-3 text-orange-400 text-right font-bold">${item.total_cost.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Quote Fields */}
              {selectedQuote.quote_fields && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Additional Quote Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {Object.entries(selectedQuote.quote_fields).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="text-white">{String(value) || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Section */}
              {selectedQuote.status === 'pending' && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Approval Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="approval-notes" className="text-white">Notes</Label>
                      <Textarea
                        id="approval-notes"
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white mt-2"
                        placeholder="Add notes for approval/rejection..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="counter-discount" className="text-white">Counter Offer Discount (%)</Label>
                        <Input
                          id="counter-discount"
                          type="number"
                          value={counterDiscountPercentage}
                          onChange={(e) => setCounterDiscountPercentage(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white mt-2"
                          placeholder="e.g., 5"
                          min="0"
                          max="50"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        className="border-gray-600 text-gray-300"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => handleReject(selectedQuote)}
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      {counterDiscountPercentage && (
                        <Button
                          onClick={() => handleCounterOffer(selectedQuote)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Counter Offer ({counterDiscountPercentage}%)
                        </Button>
                      )}
                      <Button
                        onClick={() => handleApprove(selectedQuote)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteApprovalDashboard;

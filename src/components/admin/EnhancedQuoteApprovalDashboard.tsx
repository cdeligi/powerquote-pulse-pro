
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Edit3,
  History,
  Calculator,
  Loader2
} from "lucide-react";
import { User as UserType } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuotes, Quote, BOMItemWithDetails } from "@/hooks/useQuotes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface EnhancedQuoteApprovalDashboardProps {
  user: UserType;
}

const EnhancedQuoteApprovalDashboard = ({ user }: EnhancedQuoteApprovalDashboardProps) => {
  const { quotes, loading, fetchBOMItems, updateQuoteStatus, updateBOMItemPrice } = useQuotes();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [bomItems, setBomItems] = useState<BOMItemWithDetails[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedDiscount, setApprovedDiscount] = useState('');
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [priceEditReason, setPriceEditReason] = useState('');
  const [loadingBom, setLoadingBom] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'border-yellow-500 text-yellow-400';
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

  const getFilteredQuotes = () => {
    switch (activeTab) {
      case 'pending': return quotes.filter(q => q.status === 'pending');
      case 'under-review': return quotes.filter(q => q.status === 'under-review');
      case 'approved': return quotes.filter(q => q.status === 'approved');
      case 'rejected': return quotes.filter(q => q.status === 'rejected');
      default: return quotes;
    }
  };

  const calculateUpdatedTotals = () => {
    if (!bomItems.length) return null;

    const originalTotal = bomItems.reduce((sum, item) => sum + item.total_price, 0);
    const updatedTotal = bomItems.reduce((sum, item) => {
      const editPrice = editingPrices[item.id];
      const price = editPrice ? parseFloat(editPrice) : item.unit_price;
      return sum + (price * item.quantity);
    }, 0);
    const totalCost = bomItems.reduce((sum, item) => sum + item.total_cost, 0);
    const updatedMargin = updatedTotal > 0 ? ((updatedTotal - totalCost) / updatedTotal) * 100 : 0;
    const profit = updatedTotal - totalCost;

    return {
      originalTotal,
      updatedTotal,
      totalCost,
      updatedMargin,
      profit,
      hasChanges: Math.abs(originalTotal - updatedTotal) > 0.01
    };
  };

  const handleApprove = async () => {
    if (!selectedQuote) return;
    
    try {
      await updateQuoteStatus(
        selectedQuote.id,
        'approved',
        parseFloat(approvedDiscount) || selectedQuote.requested_discount,
        approvalNotes
      );
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to approve quote:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedQuote || !rejectionReason.trim()) return;
    
    try {
      await updateQuoteStatus(
        selectedQuote.id,
        'rejected',
        undefined,
        undefined,
        rejectionReason
      );
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to reject quote:', error);
    }
  };

  const handlePriceUpdate = async (bomItemId: string) => {
    const newPrice = editingPrices[bomItemId];
    if (!newPrice || !priceEditReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both new price and reason for change",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateBOMItemPrice(bomItemId, parseFloat(newPrice), priceEditReason);
      
      // Update local state
      setBomItems(prev => prev.map(item => 
        item.id === bomItemId 
          ? { 
              ...item, 
              unit_price: parseFloat(newPrice),
              total_price: parseFloat(newPrice) * item.quantity,
              approved_unit_price: parseFloat(newPrice)
            }
          : item
      ));
      
      // Clear editing state
      setEditingPrices(prev => {
        const newState = { ...prev };
        delete newState[bomItemId];
        return newState;
      });
      setPriceEditReason('');
    } catch (error) {
      console.error('Failed to update price:', error);
    }
  };

  const openQuoteDialog = async (quote: Quote) => {
    setSelectedQuote(quote);
    setApprovedDiscount(quote.requested_discount.toString());
    setLoadingBom(true);
    setDialogOpen(true);
    
    try {
      const items = await fetchBOMItems(quote.id);
      setBomItems(items);
    } catch (error) {
      console.error('Failed to load BOM items:', error);
    } finally {
      setLoadingBom(false);
    }
  };

  const resetForm = () => {
    setApprovalNotes('');
    setRejectionReason('');
    setApprovedDiscount('');
    setEditingPrices({});
    setPriceEditReason('');
    setBomItems([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading quotes...</span>
      </div>
    );
  }

  const totals = calculateUpdatedTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Enhanced Quote Approval Dashboard</h2>
          <p className="text-gray-400">Review submitted quotes with detailed BOM analysis and price control</p>
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
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger 
            value="pending" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4 mr-2" />
            Pending ({quotes.filter(q => q.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger 
            value="under-review" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Under Review ({quotes.filter(q => q.status === 'under-review').length})
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
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-2">
                        <div className="flex items-center space-x-4">
                          <span>Oracle: {quote.oracle_customer_id}</span>
                          <span>SFDC: {quote.sfdc_opportunity}</span>
                          <span>Submitted by: {quote.submitted_by_name}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {quote.currency} {quote.original_quote_value.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">
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
                      <p className="text-gray-400">Original Value</p>
                      <p className="text-white font-medium">{quote.currency} {quote.original_quote_value.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">After Discount</p>
                      <p className="text-white font-medium">{quote.currency} {quote.discounted_value.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Total Cost</p>
                      <p className="text-orange-400 font-medium">{quote.currency} {quote.total_cost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Gross Profit</p>
                      <p className="text-green-400 font-medium">{quote.currency} {quote.gross_profit.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {quote.discount_justification && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-1">Discount Justification:</p>
                      <p className="text-gray-300 text-sm bg-gray-800 p-2 rounded">{quote.discount_justification}</p>
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
                      Review Details & BOM
                    </Button>
                    {quote.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateQuoteStatus(quote.id, 'approved', quote.requested_discount)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Quick Approve
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

      {/* Enhanced Quote Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Enhanced Quote Review - {selectedQuote?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6">
              {/* Quote Information */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Quote Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-400">Customer</Label>
                      <p className="text-white font-medium">{selectedQuote.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Oracle ID</Label>
                      <p className="text-white font-medium">{selectedQuote.oracle_customer_id}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">SFDC Opportunity</Label>
                      <p className="text-white font-medium">{selectedQuote.sfdc_opportunity}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Payment Terms</Label>
                      <p className="text-white font-medium">{selectedQuote.payment_terms}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Shipping Terms</Label>
                      <p className="text-white font-medium">{selectedQuote.shipping_terms}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Currency</Label>
                      <p className="text-white font-medium">{selectedQuote.currency}</p>
                    </div>
                  </div>
                  
                  {selectedQuote.quote_fields && Object.keys(selectedQuote.quote_fields).length > 0 && (
                    <div className="mt-4">
                      <Label className="text-gray-400">Additional Fields</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(selectedQuote.quote_fields).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-gray-400">{key}:</span>
                            <span className="text-white ml-2">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BOM Items with Price Editing */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Calculator className="mr-2 h-5 w-5" />
                    Bill of Materials & Cost Analysis
                    {totals?.hasChanges && (
                      <Badge className="ml-2 bg-orange-600">
                        Prices Modified
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingBom ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-white mr-2" />
                      <span className="text-white">Loading BOM items...</span>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-700 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-600">
                              <TableHead className="text-gray-300">Product</TableHead>
                              <TableHead className="text-gray-300 text-center">Qty</TableHead>
                              <TableHead className="text-gray-300 text-right">List Price</TableHead>
                              <TableHead className="text-gray-300 text-right">Current Price</TableHead>
                              <TableHead className="text-gray-300 text-right">Unit Cost</TableHead>
                              <TableHead className="text-gray-300 text-right">Total Revenue</TableHead>
                              <TableHead className="text-gray-300 text-right">Total Cost</TableHead>
                              <TableHead className="text-gray-300 text-right">Margin %</TableHead>
                              <TableHead className="text-gray-300 text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bomItems.map((item) => {
                              const isEditing = editingPrices[item.id] !== undefined;
                              const currentPrice = isEditing ? parseFloat(editingPrices[item.id]) : item.unit_price;
                              const totalRevenue = currentPrice * item.quantity;
                              const margin = currentPrice > 0 && item.unit_cost > 0 ? ((currentPrice - item.unit_cost) / currentPrice) * 100 : 0;
                              const hasHistory = item.price_adjustment_history && item.price_adjustment_history.length > 0;
                              
                              return (
                                <TableRow key={item.id} className="border-gray-600">
                                  <TableCell className="text-white">
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      {item.part_number && (
                                        <p className="text-gray-400 text-xs">PN: {item.part_number}</p>
                                      )}
                                      {item.product_type !== 'standard' && (
                                        <Badge variant="outline" className="text-xs text-blue-400 border-blue-400 mt-1">
                                          {item.product_type.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-white text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-gray-400 text-right">
                                    {selectedQuote.currency} {item.original_unit_price.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={editingPrices[item.id]}
                                        onChange={(e) => setEditingPrices(prev => ({
                                          ...prev,
                                          [item.id]: e.target.value
                                        }))}
                                        className="bg-gray-700 border-gray-600 text-white w-24 text-right"
                                        step="0.01"
                                      />
                                    ) : (
                                      <span className={`text-white ${item.unit_price !== item.original_unit_price ? 'font-bold text-green-400' : ''}`}>
                                        {selectedQuote.currency} {item.unit_price.toLocaleString()}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-orange-400 text-right">
                                    {selectedQuote.currency} {item.unit_cost.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-white text-right">
                                    {selectedQuote.currency} {totalRevenue.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-orange-400 text-right">
                                    {selectedQuote.currency} {item.total_cost.toLocaleString()}
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    margin >= 40 ? 'text-green-400' :
                                    margin >= 25 ? 'text-yellow-400' : 'text-red-400'
                                  }`}>
                                    {margin.toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                      {isEditing ? (
                                        <>
                                          <Button
                                            size="sm"
                                            onClick={() => handlePriceUpdate(item.id)}
                                            className="bg-green-600 hover:bg-green-700 h-6 px-2 text-xs"
                                            disabled={!priceEditReason.trim()}
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingPrices(prev => {
                                              const newState = { ...prev };
                                              delete newState[item.id];
                                              return newState;
                                            })}
                                            className="h-6 px-2 text-xs text-gray-400"
                                          >
                                            Cancel
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingPrices(prev => ({
                                            ...prev,
                                            [item.id]: item.unit_price.toString()
                                          }))}
                                          className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                      )}
                                      {hasHistory && (
                                        <Badge variant="outline" className="text-xs text-purple-400 border-purple-400">
                                          <History className="h-2 w-2 mr-1" />
                                          {item.price_adjustment_history.length}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Price Edit Reason */}
                      {Object.keys(editingPrices).length > 0 && (
                        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/20 rounded">
                          <Label htmlFor="price-reason" className="text-white">Reason for Price Adjustment</Label>
                          <Textarea
                            id="price-reason"
                            value={priceEditReason}
                            onChange={(e) => setPriceEditReason(e.target.value)}
                            placeholder="Enter reason for price changes..."
                            className="bg-gray-700 border-gray-600 text-white mt-2"
                            rows={2}
                          />
                        </div>
                      )}

                      {/* Updated Totals */}
                      {totals && (
                        <div className="mt-4 p-4 bg-gray-700 rounded">
                          <h4 className="text-white font-medium mb-3 flex items-center">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Project Financial Summary
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Original Revenue</p>
                              <p className="text-white font-semibold">
                                {selectedQuote.currency} {totals.originalTotal.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Current Revenue</p>
                              <p className={`font-semibold ${totals.hasChanges ? 'text-green-400' : 'text-white'}`}>
                                {selectedQuote.currency} {totals.updatedTotal.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total Cost</p>
                              <p className="text-orange-400 font-semibold">
                                {selectedQuote.currency} {totals.totalCost.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Project Margin</p>
                              <p className={`font-semibold ${
                                totals.updatedMargin >= 40 ? 'text-green-400' :
                                totals.updatedMargin >= 25 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {totals.updatedMargin.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Gross Profit</p>
                              <p className="text-green-400 font-semibold">
                                {selectedQuote.currency} {totals.profit.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          {/* Standard vs Requested Margin Comparison */}
                          <div className="mt-4 pt-4 border-t border-gray-600">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Standard Margin</p>
                                <p className="text-blue-400 font-semibold">{selectedQuote.original_margin.toFixed(1)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Requested Margin</p>
                                <p className="text-yellow-400 font-semibold">{selectedQuote.discounted_margin.toFixed(1)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Current Margin</p>
                                <p className={`font-semibold ${
                                  totals.updatedMargin >= 40 ? 'text-green-400' :
                                  totals.updatedMargin >= 25 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {totals.updatedMargin.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Approval Actions */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Approval Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="approved-discount" className="text-white">Approved Discount (%)</Label>
                      <Input
                        id="approved-discount"
                        type="number"
                        value={approvedDiscount}
                        onChange={(e) => setApprovedDiscount(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white mt-2"
                        min="0"
                        max="50"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Quote Status</Label>
                      <div className="mt-2">
                        <Badge className={getStatusColor(selectedQuote.status)}>
                          {selectedQuote.status.charAt(0).toUpperCase() + selectedQuote.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="approval-notes" className="text-white">Approval Notes</Label>
                    <Textarea
                      id="approval-notes"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-2"
                      placeholder="Add notes for approval..."
                      rows={3}
                    />
                  </div>

                  <div className="mb-4">
                    <Label htmlFor="rejection-reason" className="text-white">Rejection Reason (if rejecting)</Label>
                    <Textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-2"
                      placeholder="Provide detailed reason for rejection..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="border-gray-600 text-gray-300"
                    >
                      Close
                    </Button>
                    {selectedQuote.status === 'pending' && (
                      <>
                        <Button
                          onClick={handleReject}
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                          disabled={!rejectionReason.trim()}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject Quote
                        </Button>
                        <Button
                          onClick={handleApprove}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve Quote
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedQuoteApprovalDashboard;


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, MessageSquare, DollarSign, Edit3, Save, X } from "lucide-react";
import { useState } from "react";
import { Quote, BOMItemWithDetails } from "@/types/quote";
import { User } from "@/types/auth";

interface QuoteDetailsProps {
  quote: Quote;
  onApprove: (notes?: string, updatedBOMItems?: any[]) => void;
  onReject: (notes?: string) => void;
  onCounterOffer: (notes?: string) => void;
  isLoading: boolean;
  user: User | null;
}

const QuoteDetails = ({ 
  quote, 
  onApprove, 
  onReject, 
  onCounterOffer, 
  isLoading,
  user 
}: QuoteDetailsProps) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [bomItems, setBomItems] = useState<BOMItemWithDetails[]>(
    (quote.bom_items || []).map(item => ({
      ...item,
      id: item.id || Math.random().toString(),
      name: item.name || item.product?.name || 'Unknown Item',
      description: item.description || item.product?.description || '',
      part_number: item.part_number || item.partNumber || '',
      unit_price: item.unit_price || item.product?.price || 0,
      unit_cost: item.unit_cost || item.product?.cost || 0,
      total_price: item.total_price || (item.product?.price || 0) * item.quantity,
      margin: item.margin || 0,
      quantity: item.quantity || 1,
      product: item.product
    }))
  );

  const handleApprove = () => {
    onApprove(approvalNotes, bomItems);
    setApprovalNotes('');
    setSelectedAction(null);
  };

  const handleReject = () => {
    onReject(rejectionReason);
    setRejectionReason('');
    setSelectedAction(null);
  };

  const handlePriceEdit = (itemId: string, newPrice: string) => {
    setEditingPrices(prev => ({ ...prev, [itemId]: newPrice }));
  };

  const handlePriceUpdate = (itemId: string) => {
    const newPrice = parseFloat(editingPrices[itemId] || '0');
    setBomItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = {
          ...item,
          unit_price: newPrice,
          total_price: newPrice * item.quantity,
          margin: newPrice > 0 ? ((newPrice - item.unit_cost) / newPrice) * 100 : 0
        };
        return updatedItem;
      }
      return item;
    }));
    
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handlePriceEditCancel = (itemId: string) => {
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const calculateTotals = () => {
    const totalRevenue = bomItems.reduce((sum, item) => sum + item.total_price, 0);
    const totalCost = bomItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
    const grossProfit = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    return { totalRevenue, totalCost, grossProfit, marginPercentage };
  };

  const totals = calculateTotals();

  const getStatusBadge = () => {
    switch (quote.status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-600 text-white">Pending Approval</Badge>;
      case 'draft':
        return <Badge className="bg-gray-600 text-white">Draft</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Quote Details - {quote.id}
            <div className="flex items-center space-x-2">
              {getStatusBadge()}
              <Badge className={`${
                quote.priority === 'Urgent' ? 'bg-red-500' :
                quote.priority === 'High' ? 'bg-orange-500' :
                quote.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
              } text-white`}>
                {quote.priority}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-400">Customer</Label>
              <p className="text-white font-medium">{quote.customer_name}</p>
            </div>
            <div>
              <Label className="text-gray-400">Oracle Customer ID</Label>
              <p className="text-white font-medium">{quote.oracle_customer_id}</p>
            </div>
            <div>
              <Label className="text-gray-400">SFDC Opportunity</Label>
              <p className="text-white font-medium">{quote.sfdc_opportunity}</p>
            </div>
            <div>
              <Label className="text-gray-400">Rep Involved</Label>
              <p className="text-white font-medium">{quote.is_rep_involved ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <Label className="text-gray-400">Payment Terms</Label>
              <p className="text-white font-medium">{quote.payment_terms}</p>
            </div>
            <div>
              <Label className="text-gray-400">Shipping Terms</Label>
              <p className="text-white font-medium">{quote.shipping_terms}</p>
            </div>
          </div>

          {quote.discount_justification && (
            <div>
              <Label className="text-gray-400">Discount Justification</Label>
              <p className="text-gray-300 bg-gray-800 p-3 rounded mt-1">{quote.discount_justification}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Fields */}
      {quote.quote_fields && Object.keys(quote.quote_fields).length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Additional Quote Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(quote.quote_fields).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-4">
                <Label className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</Label>
                <p className="text-white">{String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Project Financial Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Original Value</p>
              <p className="text-white text-xl font-bold">{quote.currency} {quote.original_quote_value.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Current Total</p>
              <p className="text-white text-xl font-bold">{quote.currency} {totals.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Cost</p>
              <p className="text-orange-400 text-xl font-bold">{quote.currency} {totals.totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Margin</p>
              <p className={`text-xl font-bold ${
                totals.marginPercentage >= 25 ? 'text-green-400' : 
                totals.marginPercentage >= 15 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {totals.marginPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-800 rounded">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Gross Profit:</span>
              <span className="text-green-400 text-lg font-bold">
                {quote.currency} {totals.grossProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Items with Editing */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            BOM Items ({bomItems.length}) - Real-time Price Editing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bomItems.length > 0 ? (
            <div className="space-y-4">
              {bomItems.map((item) => (
                <div key={item.id} className="p-4 bg-gray-800 rounded border border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{item.name}</h4>
                      {item.description && (
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      )}
                      {item.part_number && (
                        <Badge variant="outline" className="text-xs text-green-400 border-green-400 mt-1">
                          P/N: {item.part_number}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePriceEdit(item.id, item.unit_price.toString())}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      title="Edit unit price"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Quantity:</span>
                      <div className="text-white font-medium">{item.quantity}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Unit Price:</span>
                      {editingPrices[item.id] ? (
                        <div className="flex items-center space-x-1 mt-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={editingPrices[item.id]}
                            onChange={(e) => handlePriceEdit(item.id, e.target.value)}
                            className="w-24 h-6 text-xs bg-gray-700 border-gray-600 text-white"
                          />
                          <Button
                            size="sm"
                            onClick={() => handlePriceUpdate(item.id)}
                            className="h-5 w-5 p-0 bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePriceEditCancel(item.id)}
                            className="h-5 w-5 p-0 text-gray-400 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-white font-medium">
                          ${item.unit_price.toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Unit Cost:</span>
                      <div className="text-orange-400 font-medium">${item.unit_cost.toLocaleString()}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Total Price:</span>
                      <div className="text-white font-medium">${item.total_price.toLocaleString()}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Margin:</span>
                      <div className={`font-medium ${
                        item.margin >= 25 ? 'text-green-400' : 
                        item.margin >= 15 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {item.margin.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-4">
              No BOM items found for this quote.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Actions */}
      {quote.status === 'pending_approval' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Approval Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setSelectedAction('approve')}
                variant={selectedAction === 'approve' ? 'default' : 'outline'}
                className={`${
                  selectedAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
                }`}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Quote
              </Button>
              
              <Button
                onClick={() => setSelectedAction('reject')}
                variant={selectedAction === 'reject' ? 'default' : 'outline'}
                className={`${
                  selectedAction === 'reject' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
                }`}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Quote
              </Button>
            </div>

            {selectedAction === 'approve' && (
              <div className="space-y-3 p-4 bg-green-900/20 border border-green-600 rounded-lg">
                <Label htmlFor="approval-notes" className="text-white">
                  Approval Notes (Optional)
                </Label>
                <Textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about the approval..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleApprove}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Approval'}
                  </Button>
                  <Button
                    onClick={() => setSelectedAction(null)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {selectedAction === 'reject' && (
              <div className="space-y-3 p-4 bg-red-900/20 border border-red-600 rounded-lg">
                <Label htmlFor="rejection-reason" className="text-white">
                  Rejection Reason *
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this quote is being rejected..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  required
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleReject}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isLoading || !rejectionReason.trim()}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Rejection'}
                  </Button>
                  <Button
                    onClick={() => setSelectedAction(null)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Information for Non-Pending Quotes */}
      {quote.status !== 'pending_approval' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-gray-400">
                This quote has been <span className="text-white font-medium">{quote.status.replace('_', ' ')}</span>
                {quote.reviewed_at && (
                  <span> on {new Date(quote.reviewed_at).toLocaleDateString()}</span>
                )}
              </p>
              {quote.approval_notes && (
                <div>
                  <Label className="text-gray-400">Approval Notes:</Label>
                  <p className="text-gray-300 bg-gray-800 p-2 rounded mt-1">{quote.approval_notes}</p>
                </div>
              )}
              {quote.rejection_reason && (
                <div>
                  <Label className="text-gray-400">Rejection Reason:</Label>
                  <p className="text-gray-300 bg-gray-800 p-2 rounded mt-1">{quote.rejection_reason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteDetails;

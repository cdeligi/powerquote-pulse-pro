
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, MessageSquare, DollarSign } from "lucide-react";
import { useState } from "react";
import { Quote } from "@/types/quote";
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
  const [counterOfferNotes, setCounterOfferNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'counter' | null>(null);

  const handleApprove = () => {
    onApprove(approvalNotes);
    setApprovalNotes('');
    setSelectedAction(null);
  };

  const handleReject = () => {
    onReject(rejectionReason);
    setRejectionReason('');
    setSelectedAction(null);
  };

  const handleCounterOffer = () => {
    onCounterOffer(counterOfferNotes);
    setCounterOfferNotes('');
    setSelectedAction(null);
  };

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
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Quote Details - {quote.id}
            {getStatusBadge()}
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
              <Label className="text-gray-400">Priority</Label>
              <p className="text-white font-medium">{quote.priority}</p>
            </div>
            <div>
              <Label className="text-gray-400">Original Value</Label>
              <p className="text-white font-medium">{quote.currency} {quote.original_quote_value.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-gray-400">After Discount</Label>
              <p className="text-white font-medium">{quote.currency} {quote.discounted_value.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-gray-400">Requested Discount</Label>
              <p className="text-white font-medium">{quote.requested_discount}%</p>
            </div>
            <div>
              <Label className="text-gray-400">Margin</Label>
              <p className={`font-medium ${quote.discounted_margin < 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                {quote.discounted_margin.toFixed(1)}%
              </p>
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

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            BOM Items ({quote.bom_items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quote.bom_items && quote.bom_items.length > 0 ? (
            <div className="space-y-3">
              {quote.bom_items.map((item, index) => (
                <div key={item.id || index} className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                      {item.part_number && (
                        <p className="text-gray-500 text-xs">Part#: {item.part_number}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-white font-medium">Qty: {item.quantity}</p>
                      <p className="text-white">${item.unit_price.toLocaleString()} each</p>
                      <p className="text-green-400 font-medium">${item.total_price.toLocaleString()} total</p>
                      <p className="text-gray-400 text-sm">{item.margin.toFixed(1)}% margin</p>
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

      {quote.status === 'pending_approval' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Approval Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
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
                Approve
              </Button>
              
              <Button
                onClick={() => setSelectedAction('counter')}
                variant={selectedAction === 'counter' ? 'default' : 'outline'}
                className={`${
                  selectedAction === 'counter' 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white'
                }`}
                disabled={isLoading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Counter Offer
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
                Reject
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

            {selectedAction === 'counter' && (
              <div className="space-y-3 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                <Label htmlFor="counter-notes" className="text-white">
                  Counter Offer Notes *
                </Label>
                <Textarea
                  id="counter-notes"
                  value={counterOfferNotes}
                  onChange={(e) => setCounterOfferNotes(e.target.value)}
                  placeholder="Explain the counter offer terms and adjustments..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  required
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCounterOffer}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    disabled={isLoading || !counterOfferNotes.trim()}
                  >
                    {isLoading ? 'Processing...' : 'Send Counter Offer'}
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

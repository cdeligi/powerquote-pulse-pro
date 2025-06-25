
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
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
      {/* Quote Information */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Quote Details - {quote.id}
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-400">Customer</Label>
              <p className="text-white font-medium">{quote.customerName}</p>
            </div>
            <div>
              <Label className="text-gray-400">Oracle Customer ID</Label>
              <p className="text-white font-medium">{quote.oracleCustomerId}</p>
            </div>
            <div>
              <Label className="text-gray-400">SFDC Opportunity</Label>
              <p className="text-white font-medium">{quote.sfdcOpportunity}</p>
            </div>
            <div>
              <Label className="text-gray-400">Priority</Label>
              <p className="text-white font-medium">{quote.priority}</p>
            </div>
            <div>
              <Label className="text-gray-400">Total</Label>
              <p className="text-white font-medium">${quote.total.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-gray-400">Currency</Label>
              <p className="text-white font-medium">{quote.quoteCurrency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Items */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">BOM Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quote.items.map((item, index) => (
              <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-gray-400 text-sm">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">Qty: {item.quantity}</p>
                    <p className="text-white">${item.unitPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval Actions */}
      {quote.status === 'pending_approval' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Approval Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action Selection Buttons */}
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

            {/* Action-specific Forms */}
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
    </div>
  );
};

export default QuoteDetails;

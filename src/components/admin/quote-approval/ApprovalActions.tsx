
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface ApprovalActionsProps {
  quoteId: string;
  currentStatus: string;
  onApprove: (notes: string) => void;
  onReject: (reason: string) => void;
  onCounterOffer: (notes: string) => void;
  isLoading: boolean;
}

const ApprovalActions = ({
  quoteId,
  currentStatus,
  onApprove,
  onReject,
  onCounterOffer,
  isLoading
}: ApprovalActionsProps) => {
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
    switch (currentStatus) {
      case 'approved':
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      case 'counter_offered':
        return <Badge className="bg-yellow-600 text-white">Counter Offered</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Pending Review</Badge>;
    }
  };

  if (currentStatus !== 'pending') {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Quote Status
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">
            This quote has already been {currentStatus.replace('_', ' ')}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
};

export default ApprovalActions;

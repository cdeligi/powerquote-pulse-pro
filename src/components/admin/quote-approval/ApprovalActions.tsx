
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Quote } from '@/hooks/useQuotes';

interface ApprovalActionsProps {
  quote: Partial<Quote>;
  approvedDiscount: string;
  approvalNotes: string;
  rejectionReason: string;
  onApprovedDiscountChange: (discount: string) => void;
  onApprovalNotesChange: (notes: string) => void;
  onRejectionReasonChange: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

const ApprovalActions = ({
  quote,
  approvedDiscount,
  approvalNotes,
  rejectionReason,
  onApprovedDiscountChange,
  onApprovalNotesChange,
  onRejectionReasonChange,
  onApprove,
  onReject,
  onClose
}: ApprovalActionsProps) => {
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'counter' | null>(null);

  const handleApprove = () => {
    onApprove();
    setSelectedAction(null);
  };

  const handleReject = () => {
    onReject();
    setSelectedAction(null);
  };

  const getStatusBadge = () => {
    switch (quote?.status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-600 text-white">Pending Approval</Badge>;
      case 'under-review':
        return <Badge className="bg-blue-600 text-white">Under Review</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Unknown</Badge>;
    }
  };

  if (quote?.status !== 'pending_approval') {
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
            This quote has already been {quote?.status?.replace('_', ' ')}.
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
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setSelectedAction('approve')}
            variant={selectedAction === 'approve' ? 'default' : 'outline'}
            className={`${
              selectedAction === 'approve' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          
          <Button
            onClick={() => setSelectedAction('reject')}
            variant={selectedAction === 'reject' ? 'default' : 'outline'}
            className={`${
              selectedAction === 'reject' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
            }`}
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
              onChange={(e) => onApprovalNotesChange(e.target.value)}
              placeholder="Add any notes about the approval..."
              className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Confirm Approval
              </Button>
              <Button
                onClick={() => setSelectedAction(null)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
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
              onChange={(e) => onRejectionReasonChange(e.target.value)}
              placeholder="Explain why this quote is being rejected..."
              className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
              required
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleReject}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
              <Button
                onClick={() => setSelectedAction(null)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
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

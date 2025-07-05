
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinanceApproval } from '@/hooks/useFinanceApproval';
import { CheckCircle, XCircle, MessageSquare, AlertTriangle, Shield } from 'lucide-react';
import { Quote } from '@/hooks/useQuotes';
import { User } from '@/types/auth';

interface ApprovalActionsProps {
  quote: Partial<Quote>;
  user: User;
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
  user,
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
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const { checkFinanceApprovalRequired } = useFinanceApproval();

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

  // Check if finance approval is required
  const financeApproval = quote?.discounted_margin ? 
    checkFinanceApprovalRequired(quote.discounted_margin, user.role) : null;

  const canApprove = !financeApproval?.required || user.role === 'finance';

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
          {quote?.approval_notes && (
            <div className="mt-3 p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
              <p className="text-green-400 text-sm font-medium">Approval Notes:</p>
              <p className="text-green-300 text-sm mt-1">{quote.approval_notes}</p>
            </div>
          )}
          {quote?.rejection_reason && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
              <p className="text-red-400 text-sm font-medium">Rejection Reason:</p>
              <p className="text-red-300 text-sm mt-1">{quote.rejection_reason}</p>
            </div>
          )}
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
        {/* Finance Approval Warning */}
        {financeApproval?.required && (
          <div className="bg-orange-900/20 border border-orange-600/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-5 w-5 text-orange-400" />
              <span className="text-orange-400 font-medium">Finance Approval Required</span>
            </div>
            <p className="text-orange-300 text-sm">
              {financeApproval.reason}
            </p>
            <p className="text-orange-200 text-xs mt-1">
              Only Finance role users can approve this quote.
            </p>
          </div>
        )}

        {/* Margin Information */}
        {quote?.discounted_margin && (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Current Margin:</span>
              <Badge className={`${
                quote.discounted_margin >= 30 ? 'bg-green-600' :
                quote.discounted_margin >= 20 ? 'bg-yellow-600' :
                'bg-red-600'
              } text-white`}>
                {quote.discounted_margin.toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setSelectedAction('approve')}
            variant={selectedAction === 'approve' ? 'default' : 'outline'}
            disabled={!canApprove}
            className={`${
              selectedAction === 'approve' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : canApprove
                  ? 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
                  : 'border-gray-600 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
            {!canApprove && <Shield className="h-3 w-3 ml-1" />}
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

        {selectedAction === 'approve' && canApprove && (
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

        {/* User Role Information */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Your role: <span className="text-white capitalize">{user.role}</span></p>
          <p>• {user.role === 'finance' ? '✓' : user.role === 'admin' ? '△' : '✗'} Can approve quotes</p>
          <p>• {user.role === 'finance' ? '✓' : '✗'} Can approve low-margin quotes</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalActions;

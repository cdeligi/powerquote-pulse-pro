
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";
import { Quote } from "@/hooks/useQuotes";

interface ApprovalActionsProps {
  quote: Quote;
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

export const ApprovalActions = ({ 
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
  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'border-yellow-500 text-yellow-400';
      case 'under-review': return 'border-blue-500 text-blue-400';
      case 'approved': return 'border-green-500 text-green-400';
      case 'rejected': return 'border-red-500 text-red-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  return (
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
              onChange={(e) => onApprovedDiscountChange(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-2"
              min="0"
              max="50"
            />
          </div>
          <div>
            <Label className="text-white">Quote Status</Label>
            <div className="mt-2">
              <Badge className={getStatusColor(quote.status)}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <Label htmlFor="approval-notes" className="text-white">Approval Notes</Label>
          <Textarea
            id="approval-notes"
            value={approvalNotes}
            onChange={(e) => onApprovalNotesChange(e.target.value)}
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
            onChange={(e) => onRejectionReasonChange(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white mt-2"
            placeholder="Provide detailed reason for rejection..."
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300"
          >
            Close
          </Button>
          {quote.status === 'pending' && (
            <>
              <Button
                onClick={onReject}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/20"
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject Quote
              </Button>
              <Button
                onClick={onApprove}
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
  );
};


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { Quote, BOMItemWithDetails } from "@/hooks/useQuotes";
import { QuoteInformation } from "./QuoteInformation";
import { BOMAnalysis } from "./BOMAnalysis";
import { ApprovalActions } from "./ApprovalActions";

interface QuoteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  bomItems: BOMItemWithDetails[];
  loadingBom: boolean;
  editingPrices: Record<string, string>;
  priceEditReason: string;
  approvedDiscount: string;
  approvalNotes: string;
  rejectionReason: string;
  onPriceEdit: (itemId: string, price: string) => void;
  onPriceEditCancel: (itemId: string) => void;
  onPriceUpdate: (itemId: string) => void;
  onPriceEditReasonChange: (reason: string) => void;
  onApprovedDiscountChange: (discount: string) => void;
  onApprovalNotesChange: (notes: string) => void;
  onRejectionReasonChange: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

export const QuoteDetailsDialog = ({
  open,
  onOpenChange,
  quote,
  bomItems,
  loadingBom,
  editingPrices,
  priceEditReason,
  approvedDiscount,
  approvalNotes,
  rejectionReason,
  onPriceEdit,
  onPriceEditCancel,
  onPriceUpdate,
  onPriceEditReasonChange,
  onApprovedDiscountChange,
  onApprovalNotesChange,
  onRejectionReasonChange,
  onApprove,
  onReject
}: QuoteDetailsDialogProps) => {
  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Enhanced Quote Review - {quote.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <QuoteInformation quote={quote} />
          
          <BOMAnalysis
            quote={quote}
            bomItems={bomItems}
            loadingBom={loadingBom}
            editingPrices={editingPrices}
            priceEditReason={priceEditReason}
            onPriceEdit={onPriceEdit}
            onPriceEditCancel={onPriceEditCancel}
            onPriceUpdate={onPriceUpdate}
            onPriceEditReasonChange={onPriceEditReasonChange}
          />

          <ApprovalActions
            quote={quote}
            approvedDiscount={approvedDiscount}
            approvalNotes={approvalNotes}
            rejectionReason={rejectionReason}
            onApprovedDiscountChange={onApprovedDiscountChange}
            onApprovalNotesChange={onApprovalNotesChange}
            onRejectionReasonChange={onRejectionReasonChange}
            onApprove={onApprove}
            onReject={onReject}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

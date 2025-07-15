
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import type { Quote } from "@/hooks/useQuotes";
import { BOMItemWithDetails } from "@/hooks/useQuotes";
import { QuoteInformation } from "./QuoteInformation";
import BOMAnalysis from "./BOMAnalysis";
import ApprovalActions from "./ApprovalActions";

interface QuoteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Partial<Quote> | null;
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

  // Type guard to check if quote has required properties for full Quote
  const hasRequiredQuoteProperties = (q: Partial<Quote>): q is Quote => {
    return !!(q.id && q.customer_name && q.oracle_customer_id && q.sfdc_opportunity && 
             q.user_id && q.status && q.priority && q.payment_terms && q.shipping_terms &&
             q.created_at && q.updated_at && typeof q.original_quote_value === 'number' &&
             typeof q.total_cost === 'number' && typeof q.original_margin === 'number' &&
             typeof q.requested_discount === 'number' && typeof q.discounted_value === 'number' &&
             typeof q.discounted_margin === 'number' && typeof q.gross_profit === 'number' &&
             typeof q.is_rep_involved === 'boolean' && q.currency);
  };

  const isFullQuote = hasRequiredQuoteProperties(quote);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Enhanced Quote Review - {quote.id || 'Unknown'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {isFullQuote && (
            <QuoteInformation quote={quote} />
          )}
          
          {isFullQuote && (
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
          )}

          {isFullQuote && (
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
          )}

          {!isFullQuote && (
            <div className="bg-gray-800 border-gray-700 rounded-md p-4 text-gray-400 text-center">
              Quote data is incomplete. Please ensure all required fields are available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

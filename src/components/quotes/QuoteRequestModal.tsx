
import { useState } from 'react';
import { Quote, BOMItem } from '@/types/product';
import { User } from '@/types/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import QuoteRequestView from './QuoteRequestView';

interface QuoteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  bomItems: BOMItem[];
  user: User;
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string, reason: string) => void;
  onCounterOffer: (quoteId: string, discountPercentage: number) => void;
}

const QuoteRequestModal = ({
  isOpen,
  onClose,
  quote,
  bomItems,
  user,
  onApprove,
  onReject,
  onCounterOffer
}: QuoteRequestModalProps) => {
  if (!quote) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Quote Request Details</DialogTitle>
        </DialogHeader>
        <QuoteRequestView
          quote={quote}
          bomItems={bomItems}
          onApprove={onApprove}
          onReject={onReject}
          onCounterOffer={onCounterOffer}
        />
      </DialogContent>
    </Dialog>
  );
};

export default QuoteRequestModal;

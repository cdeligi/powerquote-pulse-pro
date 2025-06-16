
export type QuoteStatus = 
  | 'pending'
  | 'approved' 
  | 'rejected'
  | 'counter_offered'
  | 'counter_pending'
  | 'counter_accepted'
  | 'counter_rejected'
  | 'finalized';

export interface QuotePipelineData {
  id: string;
  status: QuoteStatus;
  lastUpdated: string;
  counterOfferHistory: CounterOffer[];
  adminNotes: string[];
}

export interface CounterOffer {
  id: string;
  discountOffered: number;
  offeredAt: string;
  offeredBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  customerResponse?: string;
  respondedAt?: string;
}

export const getStatusDisplayName = (status: QuoteStatus): string => {
  const statusMap: Record<QuoteStatus, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    counter_offered: 'Counter Offer Sent',
    counter_pending: 'Awaiting Counter Response',
    counter_accepted: 'Counter Offer Accepted',
    counter_rejected: 'Counter Offer Rejected',
    finalized: 'Finalized'
  };
  return statusMap[status];
};

export const getStatusColor = (status: QuoteStatus): string => {
  const colorMap: Record<QuoteStatus, string> = {
    pending: 'bg-yellow-600',
    approved: 'bg-green-600',
    rejected: 'bg-red-600',
    counter_offered: 'bg-orange-600',
    counter_pending: 'bg-blue-600',
    counter_accepted: 'bg-emerald-600',
    counter_rejected: 'bg-rose-600',
    finalized: 'bg-purple-600'
  };
  return colorMap[status];
};

export const canEditQuote = (status: QuoteStatus): boolean => {
  return ['pending', 'counter_pending', 'counter_rejected'].includes(status);
};

export const requiresAdminAction = (status: QuoteStatus): boolean => {
  return ['pending', 'counter_accepted'].includes(status);
};

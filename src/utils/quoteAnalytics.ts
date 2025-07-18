
export interface QuoteAnalytics {
  monthly: {
    executed: number;
    approved: number;
    rejected: number;
    underAnalysis: number;
    totalQuotedValue: number;
  };
  yearly: {
    executed: number;
    approved: number;
    rejected: number;
    underAnalysis: number;
    totalQuotedValue: number;
  };
}

export interface QuoteData {
  id: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'finalized';
  total: number;
  createdAt: string;
}

export const calculateQuoteAnalytics = (quotes: QuoteData[]): QuoteAnalytics => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyQuotes = quotes.filter(quote => {
    const quoteDate = new Date(quote.createdAt);
    return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
  });

  const yearlyQuotes = quotes.filter(quote => {
    const quoteDate = new Date(quote.createdAt);
    return quoteDate.getFullYear() === currentYear;
  });

  const calculateStats = (quoteSet: QuoteData[]) => ({
    executed: quoteSet.filter(q => q.status === 'finalized').length,
    approved: quoteSet.filter(q => q.status === 'approved').length,
    rejected: quoteSet.filter(q => q.status === 'rejected').length,
    underAnalysis: quoteSet.filter(q => ['draft', 'pending_approval'].includes(q.status)).length,
    totalQuotedValue: quoteSet.reduce((sum, q) => sum + q.total, 0)
  });

  return {
    monthly: calculateStats(monthlyQuotes),
    yearly: calculateStats(yearlyQuotes)
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

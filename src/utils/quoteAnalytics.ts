
export interface MonthlyData {
  month: string;
  quotes: number;
  value: number;
  cost: number;
}

export interface QuoteAnalytics {
  monthly: {
    executed: number;
    approved: number;
    rejected: number;
    underAnalysis: number;
    totalQuotedValue: number;
    avgMargin: number;
    totalGrossProfit: number;
  };
  yearly: {
    executed: number;
    approved: number;
    rejected: number;
    underAnalysis: number;
    totalQuotedValue: number;
    avgMargin: number;
    totalGrossProfit: number;
  };
  monthlyBreakdown: MonthlyData[];
}

export interface QuoteData {
  id: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'finalized';
  total: number;
  createdAt: string;
  margin: number;
  grossProfit: number;
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
    totalQuotedValue: quoteSet.reduce((sum, q) => sum + q.total, 0),
    avgMargin: quoteSet.length > 0 ? quoteSet.reduce((sum, q) => sum + q.margin, 0) / quoteSet.length : 0,
    totalGrossProfit: quoteSet.reduce((sum, q) => sum + q.grossProfit, 0)
  });

  // Generate monthly breakdown for the last 12 months
  const monthlyBreakdown: MonthlyData[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format
    
    const monthQuotes = quotes.filter(quote => {
      const quoteDate = new Date(quote.createdAt);
      return quoteDate.getFullYear() === date.getFullYear() && 
             quoteDate.getMonth() === date.getMonth();
    });

    monthlyBreakdown.push({
      month: monthStr,
      quotes: monthQuotes.length,
      value: monthQuotes.reduce((sum, q) => sum + q.total, 0),
      cost: monthQuotes.reduce((sum, q) => sum + (q.total - q.grossProfit), 0)
    });
  }

  return {
    monthly: calculateStats(monthlyQuotes),
    yearly: calculateStats(yearlyQuotes),
    monthlyBreakdown
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


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

export interface FiscalYearAnalytics {
  fiscalYear: string;
  totalQuotes: number;
  quotesApproved: number;
  quotesRejected: number;
  quotesInProgress: number;
  totalPipelineValue: number;
}

export interface QuoteData {
  id: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'finalized';
  total: number;
  createdAt: string;
}

// Fiscal year starts October 1st
// FY2025 = Oct 1, 2024 - Sep 30, 2025
export const getFiscalYear = (date: Date): string => {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  
  // If month is October (9) or later, it's the next fiscal year
  if (month >= 9) {
    return `FY${year + 1}`;
  }
  return `FY${year}`;
};

export const getFiscalYearRange = (fiscalYear: string): { start: Date; end: Date } => {
  const year = parseInt(fiscalYear.replace('FY', ''), 10);
  return {
    start: new Date(year - 1, 9, 1), // October 1 of previous calendar year
    end: new Date(year, 8, 30, 23, 59, 59, 999) // September 30 of fiscal year
  };
};

export const getAvailableFiscalYears = (quotes: { created_at: string }[]): string[] => {
  if (!quotes.length) {
    return [getFiscalYear(new Date())];
  }

  const fiscalYears = new Set<string>();
  quotes.forEach(quote => {
    const date = new Date(quote.created_at);
    fiscalYears.add(getFiscalYear(date));
  });

  // Always include current fiscal year
  fiscalYears.add(getFiscalYear(new Date()));

  // Sort descending (most recent first)
  return Array.from(fiscalYears).sort((a, b) => {
    const yearA = parseInt(a.replace('FY', ''), 10);
    const yearB = parseInt(b.replace('FY', ''), 10);
    return yearB - yearA;
  });
};

export const calculateFiscalYearAnalytics = (
  quotes: { 
    id: string; 
    status: string; 
    created_at: string;
    original_quote_value?: number;
    discounted_value?: number;
  }[],
  fiscalYear: string
): FiscalYearAnalytics => {
  const { start, end } = getFiscalYearRange(fiscalYear);
  
  const fiscalYearQuotes = quotes.filter(quote => {
    const quoteDate = new Date(quote.created_at);
    return quoteDate >= start && quoteDate <= end;
  });

  const inProgressStatuses = ['draft', 'pending_approval'];

  return {
    fiscalYear,
    totalQuotes: fiscalYearQuotes.length,
    quotesApproved: fiscalYearQuotes.filter(q => q.status === 'approved' || q.status === 'finalized').length,
    quotesRejected: fiscalYearQuotes.filter(q => q.status === 'rejected').length,
    quotesInProgress: fiscalYearQuotes.filter(q => inProgressStatuses.includes(q.status)).length,
    totalPipelineValue: fiscalYearQuotes
      .filter(q => q.status !== 'rejected')
      .reduce((sum, q) => sum + (q.discounted_value || q.original_quote_value || 0), 0)
  };
};

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

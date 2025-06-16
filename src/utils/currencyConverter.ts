
interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyConversionResult {
  convertedAmount: number;
  exchangeRate: number;
  fromCurrency: string;
  toCurrency: string;
}

// Mock exchange rates - in production, this would fetch from a real API
const mockExchangeRates: ExchangeRates = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  CAD: 1.35,
  EURO: 0.85 // Support both EUR and EURO formats
};

export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): CurrencyConversionResult => {
  const fromRate = mockExchangeRates[fromCurrency] || 1;
  const toRate = mockExchangeRates[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  const exchangeRate = toRate / fromRate;
  
  return {
    convertedAmount,
    exchangeRate,
    fromCurrency,
    toCurrency
  };
};

export const getSupportedCurrencies = () => {
  return Object.keys(mockExchangeRates).filter(curr => curr !== 'EURO');
};

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  // In production, this would fetch from a real API like:
  // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  // const data = await response.json();
  // return data.rates;
  
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockExchangeRates), 100);
  });
};

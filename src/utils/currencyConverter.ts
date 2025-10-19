
interface ExchangeRates {
  [key: string]: number;
  USD: number;
  EUR: number;
  GBP: number;
  CAD: number;
  BRL: number;
}

interface CurrencyConversionResult {
  convertedAmount: number;
  exchangeRate: number;
  fromCurrency: string;
  toCurrency: string;
}

interface ExchangeRateCache {
  rates: ExchangeRates;
  fetchedAt: string;
  expiresAt: string;
}

// Fallback rates in case API is unavailable
const fallbackRates: ExchangeRates = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  CAD: 1.35,
  BRL: 4.95,
};

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get cached exchange rates from localStorage
 */
export const getCachedRates = (): ExchangeRates | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache: ExchangeRateCache = JSON.parse(cached);
    const now = new Date().getTime();
    const expiresAt = new Date(cache.expiresAt).getTime();

    if (now > expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return cache.rates;
  } catch (error) {
    console.error('Error reading cached rates:', error);
    return null;
  }
};

/**
 * Store exchange rates in localStorage with expiry
 */
const cacheRates = (rates: ExchangeRates): void => {
  try {
    const cache: ExchangeRateCache = {
      rates,
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CACHE_DURATION_MS).toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching rates:', error);
  }
};

/**
 * Fetch live exchange rates from Supabase edge function
 */
export const fetchLiveExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('fetch-exchange-rates');

    if (error) throw error;

    if (data?.success && data?.rates) {
      cacheRates(data.rates);
      return data.rates;
    }

    throw new Error('Invalid response from exchange rate API');
  } catch (error) {
    console.error('Error fetching live rates:', error);
    
    // Try to use cached rates
    const cached = getCachedRates();
    if (cached) {
      console.log('Using cached rates due to API error');
      return cached;
    }

    // Last resort: use fallback rates
    console.log('Using fallback rates');
    return fallbackRates;
  }
};

/**
 * Convert currency using cached rates (synchronous, fast)
 */
export const convertCurrencySync = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): CurrencyConversionResult => {
  const normalizedFrom = fromCurrency === 'EURO' ? 'EUR' : fromCurrency;
  const normalizedTo = toCurrency === 'EURO' ? 'EUR' : toCurrency;
  
  const fromRate = rates[normalizedFrom] || 1;
  const toRate = rates[normalizedTo] || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  const exchangeRate = toRate / fromRate;
  
  return {
    convertedAmount,
    exchangeRate,
    fromCurrency: normalizedFrom,
    toCurrency: normalizedTo,
  };
};

/**
 * Convert currency with automatic rate fetching (async)
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<CurrencyConversionResult> => {
  // Try cached rates first
  let rates = getCachedRates();
  
  // If no cache, fetch live rates
  if (!rates) {
    rates = await fetchLiveExchangeRates();
  }
  
  return convertCurrencySync(amount, fromCurrency, toCurrency, rates);
};

/**
 * Get list of supported currencies
 */
export const getSupportedCurrencies = () => {
  return ['USD', 'EUR', 'GBP', 'CAD', 'BRL'];
};

/**
 * Legacy function name for backward compatibility
 */
export const fetchExchangeRates = fetchLiveExchangeRates;

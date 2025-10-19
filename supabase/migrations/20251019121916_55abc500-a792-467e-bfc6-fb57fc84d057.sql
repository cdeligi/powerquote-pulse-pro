-- Add exchange_rate_metadata column to quotes table for storing currency conversion details
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS exchange_rate_metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN quotes.exchange_rate_metadata IS 
'Exchange rate metadata: { "currency": "GBP", "rate": 0.73, "fetchedAt": "2025-10-19T21:00:00Z", "convertedFrom": "USD" }';
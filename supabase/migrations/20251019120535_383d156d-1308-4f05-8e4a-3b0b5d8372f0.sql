-- Create exchange_rates table for caching API responses
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  rates JSONB NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by fetch time
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at ON exchange_rates(fetched_at DESC);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read exchange rates
CREATE POLICY "Allow authenticated users to read exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert exchange rates
CREATE POLICY "Allow service role to insert exchange rates"
  ON exchange_rates FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Update quote_fields to include BRL
UPDATE quote_fields 
SET options = '["USD", "EUR", "GBP", "CAD", "BRL"]'::jsonb
WHERE id = 'quote-currency' AND type = 'select';
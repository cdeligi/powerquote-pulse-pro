-- Phase 1: Enhance quotes table schema to support universal quote viewing
-- Add missing status values and required fields for quote persistence

-- First, check if we need to update the status constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'in_process', 'under-review'));

-- Add draft_bom field to persist complete BOM state for all quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS draft_bom JSONB DEFAULT '{}';

-- Add metadata fields for quote workflow
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS source_quote_id TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT '1.0.0';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS display_number SERIAL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_source_id ON quotes(source_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Create function to prevent editing of non-draft quotes
CREATE OR REPLACE FUNCTION prevent_non_draft_quote_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow all operations on draft quotes
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;
  
  -- For non-draft quotes, prevent changes to critical fields
  IF OLD.status != 'draft' AND (
    NEW.draft_bom IS DISTINCT FROM OLD.draft_bom OR
    NEW.quote_fields IS DISTINCT FROM OLD.quote_fields OR
    NEW.original_quote_value IS DISTINCT FROM OLD.original_quote_value
  ) THEN
    RAISE EXCEPTION 'Cannot modify BOM or quote fields for non-draft quotes. Use clone functionality instead.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce quote immutability
DROP TRIGGER IF EXISTS prevent_non_draft_edits ON quotes;
CREATE TRIGGER prevent_non_draft_edits
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_non_draft_quote_edits();

-- Create function for safe quote cloning
CREATE OR REPLACE FUNCTION clone_quote(source_quote_id TEXT, new_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  source_quote RECORD;
  new_quote_id TEXT;
  current_app_version TEXT := '1.0.0';
BEGIN
  -- Get source quote
  SELECT * INTO source_quote FROM quotes WHERE id = source_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source quote % not found', source_quote_id;
  END IF;
  
  -- Generate new quote ID for draft
  SELECT generate_quote_id(
    (SELECT email FROM profiles WHERE id = new_user_id),
    true -- is_draft
  ) INTO new_quote_id;
  
  -- Create cloned quote as draft
  INSERT INTO quotes (
    id, user_id, customer_name, oracle_customer_id, sfdc_opportunity,
    priority, shipping_terms, payment_terms, currency, is_rep_involved,
    status, quote_fields, draft_bom, source_quote_id, app_version,
    original_quote_value, discounted_value, total_cost, requested_discount,
    original_margin, discounted_margin, gross_profit,
    submitted_by_email, submitted_by_name
  ) VALUES (
    new_quote_id, new_user_id, source_quote.customer_name, source_quote.oracle_customer_id,
    source_quote.sfdc_opportunity, source_quote.priority, source_quote.shipping_terms,
    source_quote.payment_terms, source_quote.currency, source_quote.is_rep_involved,
    'draft', source_quote.quote_fields, source_quote.draft_bom, source_quote_id, current_app_version,
    source_quote.original_quote_value, source_quote.discounted_value,
    source_quote.total_cost, source_quote.requested_discount, source_quote.original_margin,
    source_quote.discounted_margin, source_quote.gross_profit,
    (SELECT email FROM profiles WHERE id = new_user_id),
    (SELECT COALESCE(first_name || ' ' || last_name, email) FROM profiles WHERE id = new_user_id)
  );
  
  -- Clone BOM items
  INSERT INTO bom_items (
    quote_id, product_id, name, description, part_number, quantity,
    unit_price, unit_cost, total_price, total_cost, margin,
    product_type, configuration_data
  )
  SELECT 
    new_quote_id, product_id, name, description, part_number, quantity,
    unit_price, unit_cost, total_price, total_cost, margin,
    product_type, configuration_data
  FROM bom_items 
  WHERE quote_id = source_quote_id;
  
  -- Clone Level 4 configurations if they exist
  INSERT INTO bom_level4_values (bom_item_id, level4_config_id, entries)
  SELECT 
    new_bom.id, l4v.level4_config_id, l4v.entries
  FROM bom_level4_values l4v
  JOIN bom_items old_bom ON old_bom.id = l4v.bom_item_id
  JOIN bom_items new_bom ON new_bom.quote_id = new_quote_id 
    AND new_bom.product_id = old_bom.product_id
    AND new_bom.part_number = old_bom.part_number
  WHERE old_bom.quote_id = source_quote_id;
  
  RETURN new_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
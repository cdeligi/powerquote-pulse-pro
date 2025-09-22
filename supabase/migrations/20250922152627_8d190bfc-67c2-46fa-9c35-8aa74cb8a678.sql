-- Add quote ID settings to app_settings table (if not exists)
INSERT INTO public.app_settings (key, value, description) 
VALUES 
  ('quote_id_prefix', '"QLT"', 'Prefix for quote ID generation (e.g., QLT, QTE, QR)'),
  ('quote_id_counter', '1', 'Current counter for quote ID generation')
ON CONFLICT (key) DO NOTHING;

-- Add draft status to quotes if not already present
DO $$ 
BEGIN
    -- Try to update an existing quote with draft status to check if enum supports it
    -- If it fails, we'll need to recreate the enum
    BEGIN
        UPDATE quotes SET status = 'draft' WHERE FALSE; -- This won't update anything but will test the enum
    EXCEPTION WHEN invalid_text_representation THEN
        -- The enum doesn't support 'draft', so we need to add it
        ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'draft';
    END;
END $$;

-- Create function to generate next quote ID
CREATE OR REPLACE FUNCTION public.generate_quote_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefix_setting text;
    counter_setting integer;
    new_counter integer;
    quote_id text;
BEGIN
    -- Get current settings
    SELECT value::text FROM app_settings WHERE key = 'quote_id_prefix' INTO prefix_setting;
    SELECT value::integer FROM app_settings WHERE key = 'quote_id_counter' INTO counter_setting;
    
    -- Remove quotes from prefix if present
    prefix_setting := TRIM('"' FROM prefix_setting);
    
    -- Default values if settings don't exist
    IF prefix_setting IS NULL THEN prefix_setting := 'QLT'; END IF;
    IF counter_setting IS NULL THEN counter_setting := 1; END IF;
    
    -- Generate the new ID
    quote_id := prefix_setting || '-' || counter_setting;
    
    -- Increment counter for next time
    new_counter := counter_setting + 1;
    
    -- Update the counter in settings
    UPDATE app_settings 
    SET value = new_counter::text, updated_at = now()
    WHERE key = 'quote_id_counter';
    
    RETURN quote_id;
END;
$$;
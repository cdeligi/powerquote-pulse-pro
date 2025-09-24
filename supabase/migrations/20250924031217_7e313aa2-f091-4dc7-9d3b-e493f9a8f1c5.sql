-- Update generate_quote_id function to handle drafts and use admin settings
CREATE OR REPLACE FUNCTION public.generate_quote_id(is_draft boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    IF is_draft THEN
        quote_id := prefix_setting || '-' || counter_setting || '-Draft';
    ELSE
        quote_id := prefix_setting || '-' || counter_setting;
    END IF;
    
    -- Increment counter for next time
    new_counter := counter_setting + 1;
    
    -- Update the counter in settings
    UPDATE app_settings 
    SET value = new_counter::text, updated_at = now()
    WHERE key = 'quote_id_counter';
    
    -- If no row was updated, insert the counter setting
    IF NOT FOUND THEN
        INSERT INTO app_settings (key, value, description) 
        VALUES ('quote_id_counter', new_counter::text, 'Auto-incrementing counter for quote IDs');
    END IF;
    
    RETURN quote_id;
END;
$function$;

-- Add foreign key relationship for quote_shares
ALTER TABLE quote_shares 
ADD CONSTRAINT quote_shares_shared_with_fkey 
FOREIGN KEY (shared_with) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add function to convert draft quote ID to final quote ID
CREATE OR REPLACE FUNCTION public.finalize_draft_quote_id(draft_quote_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Remove '-Draft' suffix from the quote ID
    RETURN REPLACE(draft_quote_id, '-Draft', '');
END;
$function$;
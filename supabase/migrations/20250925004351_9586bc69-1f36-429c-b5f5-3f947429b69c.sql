-- Fix the generate_quote_id function to properly handle JSONB extraction
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
    -- Get current settings from JSONB values using proper extraction
    SELECT value #>> '{}' FROM app_settings WHERE key = 'quote_id_prefix' INTO prefix_setting;
    
    -- For counter, try to get as integer, handling both string and number formats
    BEGIN
        SELECT (value #>> '{}')::integer FROM app_settings WHERE key = 'quote_id_counter' INTO counter_setting;
    EXCEPTION WHEN OTHERS THEN
        -- If conversion fails, default to 1
        counter_setting := 1;
    END;
    
    -- Default values if settings don't exist or are null
    IF prefix_setting IS NULL OR prefix_setting = '' THEN 
        prefix_setting := 'QLT'; 
    END IF;
    IF counter_setting IS NULL THEN 
        counter_setting := 1; 
    END IF;
    
    -- Generate the new ID
    IF is_draft THEN
        quote_id := prefix_setting || '-' || counter_setting || '-Draft';
    ELSE
        quote_id := prefix_setting || '-' || counter_setting;
    END IF;
    
    -- Increment counter for next time
    new_counter := counter_setting + 1;
    
    -- Update the counter in settings (store as JSON string)
    UPDATE app_settings 
    SET value = to_jsonb(new_counter::text), updated_at = now()
    WHERE key = 'quote_id_counter';
    
    -- If no row was updated, insert the counter setting
    IF NOT FOUND THEN
        INSERT INTO app_settings (key, value, description) 
        VALUES ('quote_id_counter', to_jsonb(new_counter::text), 'Auto-incrementing counter for quote IDs');
    END IF;
    
    RETURN quote_id;
END;
$function$;

-- Test the fixed function
SELECT generate_quote_id(true) as draft_id;
SELECT generate_quote_id(false) as final_id;
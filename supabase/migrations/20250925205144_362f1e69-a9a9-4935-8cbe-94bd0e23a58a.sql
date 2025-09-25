-- Step 1: Fix RLS policies for user_quote_counters
-- First, add proper RLS policies to allow users to manage their own counters
CREATE POLICY "Users can manage their own quote counters"
ON public.user_quote_counters
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all quote counters"
ON public.user_quote_counters
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Step 2: Complete database cleanup - delete all existing quotes and related data
DELETE FROM public.bom_level4_values;
DELETE FROM public.bom_items;
DELETE FROM public.quote_shares;
DELETE FROM public.admin_notifications;
DELETE FROM public.quotes;

-- Reset all user quote counters
DELETE FROM public.user_quote_counters;

-- Step 3: Improve the generate_quote_id function with better error handling
CREATE OR REPLACE FUNCTION public.generate_quote_id(user_email text, is_draft boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefix_setting text;
    user_counter integer;
    quote_id text;
    email_prefix text;
    user_uuid uuid;
    max_attempts integer := 10;
    attempt_count integer := 0;
BEGIN
    -- Get the user UUID from email
    SELECT id INTO user_uuid FROM public.profiles WHERE email = user_email LIMIT 1;
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User not found for email: %', user_email;
    END IF;
    
    -- Extract email prefix (username part before @)
    email_prefix := split_part(user_email, '@', 1);
    
    -- Get quote prefix setting with better error handling
    SELECT value #>> '{}' FROM app_settings WHERE key = 'quote_id_prefix' INTO prefix_setting;
    
    -- Default prefix if not set
    IF prefix_setting IS NULL OR prefix_setting = '' THEN 
        prefix_setting := 'QLT'; 
    END IF;
    
    -- Get or create user's counter record with retry logic
    LOOP
        -- Try to get existing counter
        SELECT current_counter INTO user_counter 
        FROM public.user_quote_counters 
        WHERE user_id = user_uuid;
        
        -- If no counter exists, create one
        IF user_counter IS NULL THEN
            BEGIN
                INSERT INTO public.user_quote_counters (user_id, current_counter, last_finalized_counter)
                VALUES (user_uuid, 1, 0);
                user_counter := 1;
                EXIT; -- Exit the loop on successful insert
            EXCEPTION WHEN unique_violation THEN
                -- Another process created the record, try again
                attempt_count := attempt_count + 1;
                IF attempt_count >= max_attempts THEN
                    RAISE EXCEPTION 'Failed to create user counter after % attempts', max_attempts;
                END IF;
                CONTINUE;
            END;
        ELSE
            EXIT; -- Counter found, exit loop
        END IF;
    END LOOP;
    
    -- Generate the quote ID with consistent format
    IF is_draft THEN
        quote_id := email_prefix || '-' || prefix_setting || '-' || user_counter::text || '-Draft';
    ELSE
        quote_id := email_prefix || '-' || prefix_setting || '-' || user_counter::text;
        
        -- Only increment counter for finalized quotes
        UPDATE public.user_quote_counters 
        SET 
            current_counter = current_counter + 1,
            last_finalized_counter = current_counter,
            updated_at = now()
        WHERE user_id = user_uuid;
    END IF;
    
    -- Log the quote ID generation for debugging
    RAISE NOTICE 'Generated quote ID: % for user: % (draft: %)', quote_id, user_email, is_draft;
    
    RETURN quote_id;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error and re-raise with more context
    RAISE EXCEPTION 'Error generating quote ID for user %: % (SQLSTATE: %)', user_email, SQLERRM, SQLSTATE;
END;
$$;
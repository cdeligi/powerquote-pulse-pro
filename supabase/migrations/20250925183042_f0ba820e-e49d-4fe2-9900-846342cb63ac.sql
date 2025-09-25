-- Create user_quote_counters table for per-user quote numbering
CREATE TABLE public.user_quote_counters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_counter integer NOT NULL DEFAULT 1,
  last_finalized_counter integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_quote_counters
ALTER TABLE public.user_quote_counters ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_quote_counters
CREATE POLICY "Users can view their own counter"
ON public.user_quote_counters
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own counter"
ON public.user_quote_counters
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all counters"
ON public.user_quote_counters
FOR SELECT
USING (is_admin());

-- Add updated_at trigger
CREATE TRIGGER update_user_quote_counters_updated_at
BEFORE UPDATE ON public.user_quote_counters
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Drop the old generate_quote_id functions
DROP FUNCTION IF EXISTS public.generate_quote_id(text, boolean);
DROP FUNCTION IF EXISTS public.generate_quote_id(boolean);
DROP FUNCTION IF EXISTS public.generate_quote_id();

-- Create new user-specific generate_quote_id function
CREATE OR REPLACE FUNCTION public.generate_quote_id(user_email text, is_draft boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    prefix_setting text;
    user_counter integer;
    quote_id text;
    email_prefix text;
    user_uuid uuid;
BEGIN
    -- Get the user UUID from email
    SELECT id INTO user_uuid FROM public.profiles WHERE email = user_email LIMIT 1;
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User not found for email: %', user_email;
    END IF;
    
    -- Extract email prefix (username part before @)
    email_prefix := split_part(user_email, '@', 1);
    
    -- Get quote prefix setting
    SELECT value #>> '{}' FROM app_settings WHERE key = 'quote_id_prefix' INTO prefix_setting;
    
    -- Default prefix if not set
    IF prefix_setting IS NULL OR prefix_setting = '' THEN 
        prefix_setting := 'QLT'; 
    END IF;
    
    -- Get or create user's counter record
    SELECT current_counter INTO user_counter 
    FROM public.user_quote_counters 
    WHERE user_id = user_uuid;
    
    -- If no counter exists, create one
    IF user_counter IS NULL THEN
        INSERT INTO public.user_quote_counters (user_id, current_counter, last_finalized_counter)
        VALUES (user_uuid, 1, 0);
        user_counter := 1;
    END IF;
    
    -- Generate the quote ID
    IF is_draft THEN
        quote_id := email_prefix || '-' || prefix_setting || '-' || user_counter || '-Draft';
    ELSE
        quote_id := email_prefix || '-' || prefix_setting || '-' || user_counter;
        
        -- Only increment counter for finalized quotes
        UPDATE public.user_quote_counters 
        SET 
            current_counter = current_counter + 1,
            last_finalized_counter = current_counter,
            updated_at = now()
        WHERE user_id = user_uuid;
    END IF;
    
    RETURN quote_id;
END;
$function$;
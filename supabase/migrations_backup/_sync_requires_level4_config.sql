-- Function to sync the boolean column from the JSONB field
CREATE OR REPLACE FUNCTION public.sync_requires_level4_config_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if specifications is a valid JSONB object and contains the key
    IF NEW.specifications IS NOT NULL AND NEW.specifications ? 'requires_level4_config' THEN
        -- Coalesce to handle a null JSON value and cast to boolean. Defaults to false if cast fails.
        NEW.requires_level4_config := COALESCE((NEW.specifications ->> 'requires_level4_config')::boolean, false);
    ELSE
        -- Default to false if the key doesn't exist or specifications is null
        NEW.requires_level4_config := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on insert or update
CREATE TRIGGER trigger_sync_requires_level4_config
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_requires_level4_config_column();

-- Backfill existing Level 3 products to ensure consistency
UPDATE public.products
SET requires_level4_config = COALESCE((specifications ->> 'requires_level4_config')::boolean, false)
WHERE product_level = 3;

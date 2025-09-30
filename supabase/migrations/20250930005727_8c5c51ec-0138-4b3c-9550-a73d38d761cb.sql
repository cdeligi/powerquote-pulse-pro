-- =====================================================
-- PHASE 3: Data Integrity Improvements
-- =====================================================

-- Create a helper function to repair draft_bom entries with zero prices
CREATE OR REPLACE FUNCTION public.repair_draft_bom_prices()
RETURNS TABLE (
  quote_id text,
  items_repaired integer,
  items_with_issues integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
  item_record RECORD;
  product_data RECORD;
  repaired_count integer;
  issue_count integer;
  new_draft_bom jsonb;
  items_array jsonb;
BEGIN
  -- Loop through all draft quotes
  FOR quote_record IN 
    SELECT id, draft_bom 
    FROM public.quotes 
    WHERE status = 'draft' 
      AND draft_bom IS NOT NULL 
      AND draft_bom->>'items' IS NOT NULL
  LOOP
    repaired_count := 0;
    issue_count := 0;
    items_array := '[]'::jsonb;
    
    -- Process each item in the draft_bom
    FOR item_record IN 
      SELECT * FROM jsonb_array_elements(quote_record.draft_bom->'items')
    LOOP
      -- Check if item has zero price or cost
      IF (item_record.value->>'unit_price')::numeric = 0 
         OR (item_record.value->>'unit_cost')::numeric = 0 
         OR (item_record.value->'configuration_data'->>'price')::numeric = 0
         OR (item_record.value->'configuration_data'->>'cost')::numeric = 0
      THEN
        issue_count := issue_count + 1;
        
        -- Try to fetch correct price from products table
        BEGIN
          SELECT price, cost INTO product_data
          FROM public.products
          WHERE id = item_record.value->>'product_id'
          LIMIT 1;
          
          IF FOUND AND product_data.price > 0 THEN
            -- Update the item with correct prices
            item_record.value := jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    item_record.value,
                    '{unit_price}',
                    to_jsonb(product_data.price)
                  ),
                  '{unit_cost}',
                  to_jsonb(COALESCE(product_data.cost, 0))
                ),
                '{configuration_data,price}',
                to_jsonb(product_data.price)
              ),
              '{configuration_data,cost}',
              to_jsonb(COALESCE(product_data.cost, 0))
            );
            
            -- Recalculate totals
            item_record.value := jsonb_set(
              jsonb_set(
                item_record.value,
                '{total_price}',
                to_jsonb(product_data.price * (item_record.value->>'quantity')::numeric)
              ),
              '{total_cost}',
              to_jsonb(COALESCE(product_data.cost, 0) * (item_record.value->>'quantity')::numeric)
            );
            
            repaired_count := repaired_count + 1;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- If product not found or error, keep original item
          NULL;
        END;
      END IF;
      
      -- Add item to new array
      items_array := items_array || item_record.value;
    END LOOP;
    
    -- Update the quote if any items were repaired
    IF repaired_count > 0 THEN
      new_draft_bom := jsonb_set(
        quote_record.draft_bom,
        '{items}',
        items_array
      );
      
      UPDATE public.quotes
      SET draft_bom = new_draft_bom,
          updated_at = now()
      WHERE id = quote_record.id;
    END IF;
    
    -- Return summary for this quote
    IF issue_count > 0 THEN
      RETURN QUERY SELECT quote_record.id, repaired_count, issue_count;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.repair_draft_bom_prices() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.repair_draft_bom_prices() IS 
'Repairs draft_bom entries with zero prices by fetching correct prices from products table. Returns summary of quotes that had issues and how many items were repaired.';
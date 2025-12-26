-- Add authorization checks to SECURITY DEFINER functions

-- Fix clone_quote: Add ownership verification
CREATE OR REPLACE FUNCTION public.clone_quote(source_quote_id text, new_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  source_quote RECORD;
  new_quote_id TEXT;
  current_app_version TEXT := '1.0.0';
BEGIN
  -- Authorization check: User must own the quote or be an admin
  IF NOT EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = source_quote_id
    AND (
      q.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You can only clone your own quotes';
  END IF;

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
$function$;

-- Fix repair_draft_bom_prices: Restrict to admin only
CREATE OR REPLACE FUNCTION public.repair_draft_bom_prices()
 RETURNS TABLE(quote_id text, items_repaired integer, items_with_issues integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
  item_record RECORD;
  product_data RECORD;
  repaired_count integer;
  issue_count integer;
  new_draft_bom jsonb;
  items_array jsonb;
BEGIN
  -- Authorization check: Only admins can run this repair function
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can execute repair_draft_bom_prices';
  END IF;

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
$function$;
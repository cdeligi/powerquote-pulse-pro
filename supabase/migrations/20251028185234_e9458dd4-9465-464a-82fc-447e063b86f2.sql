-- Fix the prevent_non_draft_quote_edits trigger to allow approval workflow
CREATE OR REPLACE FUNCTION public.prevent_non_draft_quote_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow all operations on draft quotes
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;
  
  -- Allow status transitions for approval workflow
  -- (pending_approval -> approved/rejected)
  IF OLD.status = 'pending_approval' AND 
     NEW.status IN ('approved', 'rejected') THEN
    -- Only protect draft_bom and quote_fields during approval
    IF NEW.draft_bom IS DISTINCT FROM OLD.draft_bom OR
       NEW.quote_fields IS DISTINCT FROM OLD.quote_fields THEN
      RAISE EXCEPTION 'Cannot modify BOM or quote fields during approval. Only status and approval-related fields can be changed.';
    END IF;
    -- Allow the update (status change + financial calculations + approval notes)
    RETURN NEW;
  END IF;
  
  -- For all other non-draft quotes, prevent changes to critical fields
  IF OLD.status != 'draft' AND (
    NEW.draft_bom IS DISTINCT FROM OLD.draft_bom OR
    NEW.quote_fields IS DISTINCT FROM OLD.quote_fields OR
    NEW.original_quote_value IS DISTINCT FROM OLD.original_quote_value
  ) THEN
    RAISE EXCEPTION 'Cannot modify BOM or quote fields for non-draft quotes. Use clone functionality instead.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
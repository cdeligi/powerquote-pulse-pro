-- Fix quotes table status constraint to include 'draft'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('draft', 'pending', 'pending_approval', 'approved', 'rejected', 'under-review'));
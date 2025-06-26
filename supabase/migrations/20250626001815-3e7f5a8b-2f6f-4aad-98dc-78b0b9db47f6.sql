
-- Update the quotes table status constraint to include 'pending_approval'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('pending', 'pending_approval', 'approved', 'rejected', 'under-review'));

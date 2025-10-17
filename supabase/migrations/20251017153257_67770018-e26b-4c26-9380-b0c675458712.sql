-- Enable RLS on quotes table
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own quotes
CREATE POLICY "Users can view own quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can create their own quotes
CREATE POLICY "Users can create own quotes"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own quotes
CREATE POLICY "Users can update own quotes"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can delete their own quotes
CREATE POLICY "Users can delete own quotes"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 5: Admins can view all quotes
CREATE POLICY "Admins can view all quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 6: Admins can manage all quotes
CREATE POLICY "Admins can manage all quotes"
  ON quotes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 7: PUBLIC access to approved quotes (for PDF links to work)
CREATE POLICY "Public can view approved quotes"
  ON quotes
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('approved', 'finalized'));

-- Policy 8: PUBLIC can view BOM items for approved quotes
CREATE POLICY "Public can view BOM items for approved quotes"
  ON bom_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = bom_items.quote_id
      AND quotes.status IN ('approved', 'finalized')
    )
  );
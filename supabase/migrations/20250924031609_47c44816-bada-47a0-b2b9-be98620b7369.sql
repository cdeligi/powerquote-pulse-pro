-- Clear all existing quotes and related data to start fresh with new ID sequence
-- This will allow the new quote ID logic to start from the beginning

-- Delete all BOM items first (they reference quotes)
DELETE FROM bom_items;

-- Delete all quote shares
DELETE FROM quote_shares;

-- Delete all quotes
DELETE FROM quotes;

-- Reset the quote ID counter to start from 1
UPDATE app_settings 
SET value = '1' 
WHERE key = 'quote_id_counter';

-- If the counter setting doesn't exist, insert it
INSERT INTO app_settings (key, value, description)
SELECT 'quote_id_counter', '1', 'Auto-incrementing counter for quote IDs'
WHERE NOT EXISTS (
    SELECT 1 FROM app_settings WHERE key = 'quote_id_counter'
);
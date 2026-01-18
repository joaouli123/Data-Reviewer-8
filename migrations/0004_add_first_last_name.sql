-- Add first and last name fields to users for boleto payer data
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill from existing full name when available
UPDATE users
SET
  first_name = COALESCE(NULLIF(split_part(name, ' ', 1), ''), first_name),
  last_name = NULLIF(trim(regexp_replace(COALESCE(name, ''), '^[^ ]+\s*', '')), '')
WHERE name IS NOT NULL;

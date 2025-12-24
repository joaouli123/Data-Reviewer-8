-- Add new fields to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS subscriber_name text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS amount decimal(15, 2),
ADD COLUMN IF NOT EXISTS is_lifetime boolean DEFAULT false;

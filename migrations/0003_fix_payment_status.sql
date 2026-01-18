-- Fix companies default values from active/approved to pending
-- This migration corrects the issue where companies were created with approved payment status by default

-- Update companies table defaults
ALTER TABLE companies 
  ALTER COLUMN subscription_status SET DEFAULT 'pending',
  ALTER COLUMN payment_status SET DEFAULT 'pending',
  ALTER COLUMN subscription_plan SET DEFAULT 'basic';

-- Update existing companies that have pending subscriptions but are marked as approved
-- Only update companies where subscription status is 'pending' but payment is marked 'approved'
UPDATE companies 
SET 
  payment_status = 'pending',
  subscription_status = 'pending'
WHERE id IN (
  SELECT c.id 
  FROM companies c
  LEFT JOIN subscriptions s ON s.company_id = c.id
  WHERE s.status = 'pending' 
    AND c.payment_status = 'approved'
);

-- Update companies with no subscription to pending
UPDATE companies
SET 
  payment_status = 'pending',
  subscription_status = 'pending'
WHERE id NOT IN (
  SELECT company_id FROM subscriptions WHERE status = 'active'
)
AND payment_status = 'approved';

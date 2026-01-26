-- Migration: Add card fee fields to transactions
-- Date: 2026-01-26
-- Description: Adds cardFee (decimal) and hasCardFee (boolean) fields to track credit/debit card fees

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_fee DECIMAL(15, 2) DEFAULT '0';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS has_card_fee BOOLEAN DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN transactions.card_fee IS 'Card processing fee percentage (e.g., 2.99 for 2.99%)';
COMMENT ON COLUMN transactions.has_card_fee IS 'Flag indicating if transaction has card fee applied';

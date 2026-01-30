-- Migration: Add original_amount column to transactions table
-- This column stores the original value before any modification

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15, 2);

-- Comment for documentation
COMMENT ON COLUMN transactions.original_amount IS 'Valor original da parcela antes de qualquer alteração';

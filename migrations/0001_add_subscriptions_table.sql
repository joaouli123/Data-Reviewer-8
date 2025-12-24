-- Create subscriptions table with all fields from schema
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" varchar NOT NULL,
  "plan" text DEFAULT 'basic' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "subscriber_name" text,
  "payment_method" text,
  "amount" numeric(15, 2),
  "is_lifetime" boolean DEFAULT false,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint if companies table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_companies_id_fk" 
      FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_subscriptions_company_id" ON "subscriptions"("company_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_created_at" ON "subscriptions"("created_at");

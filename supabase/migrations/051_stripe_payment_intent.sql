-- Add stripe_payment_intent_id column to bookings table
-- This enables idempotent booking creation (webhook + client fallback won't create duplicates)

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add unique constraint to prevent duplicate bookings for same payment
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_payment_intent_id_unique 
ON bookings(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS bookings_stripe_payment_intent_id_idx 
ON bookings(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON COLUMN bookings.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for online payments, used for idempotency';

SELECT 'Added stripe_payment_intent_id column to bookings table' AS result;


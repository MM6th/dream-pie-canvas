
-- Add the new contact_email column to the profiles table
ALTER TABLE public.profiles
ADD COLUMN contact_email TEXT;

-- Migrate existing pending merchant emails from paypal_email to contact_email
UPDATE public.profiles
SET
  contact_email = paypal_email,
  paypal_email = NULL
WHERE
  user_type = 'merchant' AND approval_status = 'pending' AND paypal_email IS NOT NULL;

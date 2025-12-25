
-- FIX 1: Remove overly permissive policy on user_purchases that exposes financial data
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON public.user_purchases;

-- Create a safer view for public playlist data that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.public_playlist_items
WITH (security_invoker = true) AS
SELECT 
  up.id,
  up.user_id,
  up.audio_product_id,
  up.purchase_date,
  up.created_at,
  up.is_free_download
  -- Explicitly EXCLUDING: paypal_transaction_id, amount_paid, referrer_user_id, referrer_commission, merchant_revenue_after_referral
FROM public.user_purchases up
INNER JOIN public.profiles p ON p.id = up.user_id
WHERE p.playlist_public = true;

GRANT SELECT ON public.public_playlist_items TO authenticated;

COMMENT ON VIEW public.public_playlist_items IS 'Safe view for public playlists. Excludes financial data (PayPal transaction IDs, amounts, referral commissions).';

-- FIX 2: Restrict direct profiles table access to prevent PII exposure
DROP POLICY IF EXISTS "Authenticated users can view accessible profiles" ON public.profiles;

-- Add policy for merchants to see basic info of users who purchased from them (for order fulfillment)
CREATE POLICY "Merchants can view buyers basic info for orders" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_purchases up
    INNER JOIN audio_products ap ON ap.id = up.audio_product_id
    WHERE up.user_id = profiles.id 
    AND ap.merchant_id = auth.uid()
  )
);

-- FIX 3: Add admin view policy for user_purchases for support purposes
CREATE POLICY "Admins can view all purchases" 
ON public.user_purchases 
FOR SELECT 
USING (is_admin(auth.uid()));

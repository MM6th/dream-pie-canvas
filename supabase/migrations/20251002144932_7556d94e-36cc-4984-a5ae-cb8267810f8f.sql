-- Add referrer tracking columns to user_purchases table
ALTER TABLE public.user_purchases
ADD COLUMN referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN referrer_commission NUMERIC(10, 2),
ADD COLUMN merchant_revenue_after_referral NUMERIC(10, 2);

-- Add index for performance on referrer queries
CREATE INDEX idx_user_purchases_referrer ON public.user_purchases(referrer_user_id) WHERE referrer_user_id IS NOT NULL;

-- Update the create_contract_after_approval function to include referral terms
CREATE OR REPLACE FUNCTION public.create_contract_after_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.contract_id IS NULL THEN
    
    IF TG_TABLE_NAME = 'song_cover_submissions' THEN
      contract_terms_text := 'SONG COVER SUBMISSION AGREEMENT

This agreement establishes the terms for the approved song cover submission.

PIE PLATFORM REVENUE SHARING TERMS:

STANDARD DISTRIBUTION (Direct Sales):
- PIE Platform receives 10% of net revenue (after PayPal processing fees)
- Main Artist receives 60% of net revenue (after PayPal processing fees and PIE platform share)
- Cover Model receives 30% of net revenue (after PayPal processing fees and PIE platform share)

SUPPORTER REFERRAL PROGRAM:
- When sales occur through a supporter''s public profile playlist, that supporter receives 10% commission
- Commission calculated from remaining revenue after PIE Platform fees (10%) are deducted
- Referral commission adjusts the revenue shares proportionally for Main Artist and Cover Model
- Direct sales (not through supporter referrals) maintain standard revenue split

EXAMPLE: $2.00 Purchase - Direct Sale
- PayPal Processing Fee: ~$0.09 (2.9% + $0.30)
- Net Revenue: $1.91
- PIE Platform: $0.19 (10%)
- Main Artist: $1.15 (60% of remaining $1.72)
- Cover Model: $0.57 (30% of remaining $1.72)

EXAMPLE: $2.00 Purchase - Through Supporter Referral
- PayPal Processing Fee: ~$0.09 (2.9% + $0.30)
- Net Revenue: $1.91
- PIE Platform: $0.19 (10%)
- Supporter Referrer: $0.17 (10% of remaining $1.72)
- Main Artist: $1.03 (60% of remaining $1.55)
- Cover Model: $0.52 (30% of remaining $1.55)

TUNECORE PARTNERSHIP TERMS:
- After exclusive PIE platform release, tracks distributed through TuneCore
- TuneCore fee: 15% of revenue
- Main Artist: 70.5% of total revenue (85% of remaining after TuneCore fees)
- Cover Model: 14.5% of total revenue (20% of Main Artist share)
- Distribution rights and royalty collection through TuneCore network

MERCHANT OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with original song licensing requirements
- Provide accurate metadata for distribution
- Meet agreed-upon deadlines and specifications

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Clear revenue reporting and monthly statements
- Professional project management and support
- Accurate revenue distribution to all parties

By signing below, both parties agree to these terms and conditions.';
    ELSE
      contract_terms_text := 'MODELING APPLICATION AGREEMENT

This agreement establishes the terms for the approved modeling application.

TERMS AND CONDITIONS:
- Usage rights for submitted modeling photos
- Revenue sharing for product promotion
- Quality standards and brand representation
- Compensation structure

By signing below, both parties agree to these terms and conditions.';
    END IF;

    INSERT INTO public.contracts (
      merchant_id,
      cover_submission_id,
      modeling_application_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      NEW.merchant_id,
      CASE WHEN TG_TABLE_NAME = 'song_cover_submissions' THEN NEW.id ELSE NULL END,
      CASE WHEN TG_TABLE_NAME = 'modeling_applications' THEN NEW.id ELSE NULL END,
      CASE WHEN TG_TABLE_NAME = 'song_cover_submissions' THEN 'cover_submission' ELSE 'modeling_application' END,
      contract_terms_text,
      'pending'
    ) RETURNING id INTO new_contract_id;

    IF TG_TABLE_NAME = 'song_cover_submissions' THEN
      UPDATE public.song_cover_submissions 
      SET contract_id = new_contract_id, contract_generated_at = NOW()
      WHERE id = NEW.id;
    ELSE
      UPDATE public.modeling_applications 
      SET contract_id = new_contract_id, contract_generated_at = NOW()
      WHERE id = NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;
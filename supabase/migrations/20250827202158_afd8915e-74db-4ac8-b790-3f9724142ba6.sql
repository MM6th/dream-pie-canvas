
-- Update the ASMR contract status to 'approved' since it's already been admin-approved and just needs merchant signature
UPDATE public.contracts 
SET status = 'approved',
    updated_at = NOW()
WHERE contract_type = 'asmr_submission' 
  AND id = '90a6cc64-b04c-4591-844a-bfc4bc893e19' 
  AND status = 'pending';

-- Also update the database function to set ASMR contracts to 'approved' status instead of 'pending'
-- since admin approval happens at the submission level, not contract level
CREATE OR REPLACE FUNCTION public.create_asmr_submission_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  audio_product RECORD;
BEGIN
  -- Only create contract when status changes to 'approved' and no contract exists yet
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.contract_id IS NULL THEN
    
    -- Get audio product details
    SELECT * INTO audio_product 
    FROM public.audio_products 
    WHERE id = NEW.audio_product_id;
    
    -- Build contract terms based on exclusive vs non-exclusive deals
    contract_terms_text := 'ASMR SUBMISSION AGREEMENT

This agreement establishes the terms for the approved ASMR submission.

OPPORTUNITY DETAILS:';

    -- Add advance fee and exclusivity details
    IF audio_product.is_pie_exclusive THEN
      contract_terms_text := contract_terms_text || '
- Deal Type: PIE Exclusive (2-Year Exclusivity Period)
- Advance Fee: $' || COALESCE(audio_product.advance_fee_rate, 0) || '
- Back-end Royalties: Contractor receives 50% of net revenue from back-end royalties
- Exclusivity Duration: 2 years from contract execution date';
    ELSE
      contract_terms_text := contract_terms_text || '
- Deal Type: Non-Exclusive
- Advance Fee: Not applicable
- Back-end Royalties: ' || CASE WHEN audio_product.back_end_royalties THEN 'Contractor receives 50% of net revenue from back-end royalties' ELSE 'No additional royalties' END;
    END IF;

    contract_terms_text := contract_terms_text || '

REVENUE SHARING TERMS:
- Back-end Royalties: When enabled, contractor receives 50% of net revenue generated from the ASMR content after platform processing fees
- Revenue sharing applies to secondary sales, licensing, and other monetization of the approved ASMR content
- Revenue calculations exclude payment processing fees and platform operational costs
- Royalty Payout Schedule: Quarterly payments on March 30th, June 30th, September 30th, and December 30th';

    -- Add exclusivity clause for PIE exclusive deals
    IF audio_product.is_pie_exclusive THEN
      contract_terms_text := contract_terms_text || '
- Content created under this agreement is exclusive to PIE for a 2-year period from contract execution
- Contractor may not distribute identical content through other channels during the 2-year exclusivity period
- After the 2-year exclusivity period expires, contractor regains full distribution rights';
    END IF;

    contract_terms_text := contract_terms_text || '

TERMS AND CONDITIONS:
- The Independent Contractor grants ' || CASE WHEN audio_product.is_pie_exclusive THEN 'exclusive' ELSE 'non-exclusive' END || ' rights to use the submitted ASMR content
- Content may be used on PIE platform and partner platforms
- Contractor retains rights to use content on their own platforms' || CASE WHEN audio_product.is_pie_exclusive THEN ' after the 2-year exclusivity period' ELSE '' END || '
- Payment as specified will be provided upon contract execution
- Usage rights are ' || CASE WHEN audio_product.is_pie_exclusive THEN 'exclusive to PIE for 2 years from contract execution' ELSE 'non-exclusive, allowing contractor personal use' END || '

CONTRACTOR OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with platform content guidelines and requirements
- Provide accurate information in application';

    IF audio_product.is_pie_exclusive THEN
      contract_terms_text := contract_terms_text || '
- Honor 2-year exclusivity terms and refrain from distributing identical content elsewhere during this period';
    END IF;

    contract_terms_text := contract_terms_text || '

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Accurate revenue reporting when back-end royalties apply
- Quarterly royalty payments on March 30th, June 30th, September 30th, and December 30th
- Proper attribution when required by platform
- Professional communication throughout process

By signing below, both parties agree to these terms and conditions.';

    -- Create new contract with 'approved' status since admin approval already happened
    INSERT INTO public.contracts (
      merchant_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      NEW.merchant_id,
      'asmr_submission',
      contract_terms_text,
      'approved'
    ) RETURNING id INTO new_contract_id;

    -- Update the submission with contract reference
    UPDATE public.asmr_submissions 
    SET contract_id = new_contract_id, contract_generated_at = NOW()
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$;

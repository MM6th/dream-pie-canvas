-- Update ASMR submission contract function to specify 50% back-end royalties for applicant
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
    
    contract_terms_text := 'ASMR SUBMISSION AGREEMENT

This agreement establishes the terms for the approved ASMR submission.

OPPORTUNITY DETAILS:
- Advance Fee: $' || COALESCE(audio_product.advance_fee_rate, 0) || '
- Back-end Royalties: ' || CASE WHEN audio_product.back_end_royalties THEN 'Contractor receives 50% of net revenue from back-end royalties' ELSE 'No additional royalties' END || '

REVENUE SHARING TERMS:
- Back-end Royalties: When enabled, contractor receives 50% of net revenue generated from the ASMR content after platform processing fees
- Revenue sharing applies to secondary sales, licensing, and other monetization of the approved ASMR content
- Revenue calculations exclude payment processing fees and platform operational costs

TERMS AND CONDITIONS:
- The Independent Contractor grants non-exclusive rights to use the submitted ASMR content
- Content may be used on PIE platform and partner platforms
- Contractor retains rights to use content on their own platforms
- Payment as specified will be provided upon contract execution
- Usage rights are non-exclusive, allowing contractor personal use

CONTRACTOR OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with platform content guidelines and requirements
- Provide accurate information in application

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Accurate revenue reporting when back-end royalties apply
- Proper attribution when required by platform
- Professional communication throughout process

By signing below, both parties agree to these terms and conditions.';

    -- Create new contract
    INSERT INTO public.contracts (
      merchant_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      NEW.merchant_id,
      'asmr_submission',
      contract_terms_text,
      'pending'
    ) RETURNING id INTO new_contract_id;

    -- Update the submission with contract reference
    UPDATE public.asmr_submissions 
    SET contract_id = new_contract_id, contract_generated_at = NOW()
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$;
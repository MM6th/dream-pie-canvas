-- Update the contract generation function for cover submissions with new PIE Platform revenue splits
CREATE OR REPLACE FUNCTION create_contract_after_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
BEGIN
  -- Only create contract when status changes to 'approved' and no contract exists yet
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.contract_id IS NULL THEN
    
    -- Set contract terms based on submission type
    IF TG_TABLE_NAME = 'song_cover_submissions' THEN
      contract_terms_text := 'SONG COVER SUBMISSION AGREEMENT

This agreement establishes the terms for the approved song cover submission.

PIE PLATFORM REVENUE SHARING TERMS:
- PIE Platform receives 10% of net revenue (after PayPal processing fees)
- Main Artist receives 60% of net revenue (after PayPal processing fees and PIE platform share)
- Cover Model receives 30% of net revenue (after PayPal processing fees and PIE platform share)
- Revenue sharing applies to all PIE platform exclusive sales at $2.00 minimum pricing

EXAMPLE: $2.00 Purchase
- PayPal Processing Fee: ~$0.09 (2.9% + $0.30)
- Net Revenue: $1.91
- PIE Platform: $0.19 (10%)
- Main Artist: $1.15 (60%)
- Cover Model: $0.57 (30%)

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

    -- Create new contract
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

    -- Update the submission with the contract reference
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
$$;
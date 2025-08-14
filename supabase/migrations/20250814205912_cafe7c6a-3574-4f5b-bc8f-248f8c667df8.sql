-- Update video ad opportunity contracts to be TikTok-specific with ad revenue only
UPDATE public.contracts 
SET contract_terms = 'EXCLUSIVE PIE INDEPENDENT CONTRACT

This agreement establishes the terms for exclusive content creation for PIE on TikTok.

OPPORTUNITY DETAILS:
- Target Platform: TIKTOK
- Cash Advance Payment: $' || 
  COALESCE((SELECT payment_amount::text FROM public.video_ad_opportunities WHERE id = contracts.video_ad_opportunity_id), '0') || '
- Audio Type: ' || 
  COALESCE(UPPER((SELECT audio_type::text FROM public.video_ad_opportunities WHERE id = contracts.video_ad_opportunity_id)), 'MUSIC') || '

EXCLUSIVE CONTENT TERMS:
- The Independent Contractor agrees to create content exclusively for PIE on TikTok
- Content will be distributed on TikTok only
- All content created under this agreement is exclusive to PIE for TikTok distribution

REVENUE SHARING TERMS:
- Cash Advance: $' || 
  COALESCE((SELECT payment_amount::text FROM public.video_ad_opportunities WHERE id = contracts.video_ad_opportunity_id), '0') || ' (paid upon contract execution)
- TikTok Advertisement Revenue Share: 50% of net advertisement revenues (after platform transaction fees)
- Revenue sharing applies ONLY to advertisement revenue from TikTok
- Transaction fees (platform fees, payment processing) are deducted before revenue split calculation

CONTRACTOR OBLIGATIONS:
- Create high-quality video content using provided audio materials
- Maintain professional standards for all content distributed on TikTok
- Comply with TikTok content guidelines and requirements
- Provide content exclusively to PIE for TikTok
- Meet agreed-upon deadlines and specifications
- Maintain professional communication throughout the project

PLATFORM OBLIGATIONS:
- Provide cash advance payment upon contract execution
- Distribute content on TikTok only
- Provide transparent monthly revenue reporting for TikTok advertisement revenue
- Process revenue sharing payments according to platform payout schedules
- Maintain professional project management and support

EXCLUSIVITY TERMS:
- Content created under this agreement is exclusive to PIE for TikTok only
- Contractor may not distribute identical content through other channels during exclusivity period
- PIE retains exclusive rights for TikTok distribution and monetization only
- Usage rights are exclusive to PIE for TikTok only

By signing below, both parties agree to these terms and conditions for exclusive PIE content creation on TikTok.',
updated_at = NOW()
WHERE contract_type = 'video_ad_opportunity';

-- Update the function to generate TikTok-specific contracts
CREATE OR REPLACE FUNCTION public.create_video_ad_contract_after_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  opportunity_data RECORD;
BEGIN
  -- Only create contract when status changes to 'approved' and no contract exists yet
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.contract_id IS NULL THEN
    
    -- Get opportunity details
    SELECT * INTO opportunity_data 
    FROM public.video_ad_opportunities 
    WHERE id = NEW.video_ad_opportunity_id;
    
    contract_terms_text := 'EXCLUSIVE PIE INDEPENDENT CONTRACT

This agreement establishes the terms for exclusive content creation for PIE on TikTok.

OPPORTUNITY DETAILS:
- Target Platform: TIKTOK
- Cash Advance Payment: $' || opportunity_data.payment_amount || '
- Audio Type: ' || UPPER(opportunity_data.audio_type::text) || '

EXCLUSIVE CONTENT TERMS:
- The Independent Contractor agrees to create content exclusively for PIE on TikTok
- Content will be distributed on TikTok only
- All content created under this agreement is exclusive to PIE for TikTok distribution

REVENUE SHARING TERMS:
- Cash Advance: $' || opportunity_data.payment_amount || ' (paid upon contract execution)
- TikTok Advertisement Revenue Share: 50% of net advertisement revenues (after platform transaction fees)
- Revenue sharing applies ONLY to advertisement revenue from TikTok
- Transaction fees (platform fees, payment processing) are deducted before revenue split calculation

CONTRACTOR OBLIGATIONS:
- Create high-quality video content using provided audio materials
- Maintain professional standards for all content distributed on TikTok
- Comply with TikTok content guidelines and requirements
- Provide content exclusively to PIE for TikTok
- Meet agreed-upon deadlines and specifications
- Maintain professional communication throughout the project

PLATFORM OBLIGATIONS:
- Provide cash advance payment upon contract execution
- Distribute content on TikTok only
- Provide transparent monthly revenue reporting for TikTok advertisement revenue
- Process revenue sharing payments according to platform payout schedules
- Maintain professional project management and support

EXCLUSIVITY TERMS:
- Content created under this agreement is exclusive to PIE for TikTok only
- Contractor may not distribute identical content through other channels during exclusivity period
- PIE retains exclusive rights for TikTok distribution and monetization only
- Usage rights are exclusive to PIE for TikTok only

By signing below, both parties agree to these terms and conditions for exclusive PIE content creation on TikTok.';

    -- Create new contract
    INSERT INTO public.contracts (
      merchant_id,
      video_ad_submission_id,
      video_ad_opportunity_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      NEW.merchant_id,
      NEW.id,
      NEW.video_ad_opportunity_id,
      'video_ad_opportunity',
      contract_terms_text,
      'pending'
    ) RETURNING id INTO new_contract_id;

    -- Update the submission with contract reference
    UPDATE public.video_ad_submissions 
    SET contract_id = new_contract_id, contract_generated_at = NOW()
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$;
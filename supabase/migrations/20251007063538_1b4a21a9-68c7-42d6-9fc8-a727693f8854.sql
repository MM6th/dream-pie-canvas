-- Fix 1: Add RLS policy for authenticated users to view public profile data
CREATE POLICY "Authenticated users can view public profile data"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Add search_path protection to all SECURITY DEFINER trigger functions

-- Trigger function 1: update_birth_data_timestamp
CREATE OR REPLACE FUNCTION public.update_birth_data_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Trigger function 2: update_user_playlists_updated_at
CREATE OR REPLACE FUNCTION public.update_user_playlists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Trigger function 3: decrement_video_ad_available_spots
CREATE OR REPLACE FUNCTION public.decrement_video_ad_available_spots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.video_ad_opportunities
  SET available_spots = GREATEST(available_spots - 1, 0),
      updated_at = NOW()
  WHERE id = NEW.video_ad_opportunity_id;
  RETURN NEW;
END;
$function$;

-- Trigger function 4: update_audio_product_on_contract_approval
CREATE OR REPLACE FUNCTION public.update_audio_product_on_contract_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.cover_submission_id IS NOT NULL THEN
    UPDATE public.audio_products 
    SET access_level = CASE 
      WHEN is_free = true THEN 'public'::access_level
      ELSE 'paid'::access_level
    END,
    updated_at = NOW()
    WHERE id = (
      SELECT audio_product_id 
      FROM public.song_cover_submissions 
      WHERE id = NEW.cover_submission_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger function 5: check_asmr_opportunities_exhausted
CREATE OR REPLACE FUNCTION public.check_asmr_opportunities_exhausted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.audio_products
  SET opportunities_exhausted = true
  WHERE id = NEW.audio_product_id
  AND audio_type = 'asmr'
  AND access_level = 'merchant_only'
  AND number_of_opportunities IS NOT NULL
  AND (
    SELECT COUNT(*) 
    FROM public.asmr_downloads 
    WHERE audio_product_id = NEW.audio_product_id
  ) >= number_of_opportunities;
  
  RETURN NEW;
END;
$function$;

-- Trigger function 6: create_asmr_submission_contract
CREATE OR REPLACE FUNCTION public.create_asmr_submission_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  audio_product RECORD;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.contract_id IS NULL THEN
    
    SELECT * INTO audio_product 
    FROM public.audio_products 
    WHERE id = NEW.audio_product_id;
    
    contract_terms_text := 'ASMR SUBMISSION AGREEMENT

This agreement establishes the terms for the approved ASMR submission.

OPPORTUNITY DETAILS:';

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

    UPDATE public.asmr_submissions 
    SET contract_id = new_contract_id, contract_generated_at = NOW()
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger function 7: create_podcast_contract_after_download
CREATE OR REPLACE FUNCTION public.create_podcast_contract_after_download()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  audio_product RECORD;
BEGIN
  SELECT * INTO audio_product 
  FROM public.audio_products 
  WHERE id = NEW.audio_product_id;
  
  IF audio_product.audio_type = 'podcast' AND audio_product.access_level = 'merchant_only' THEN
    
    contract_terms_text := 'PODCAST OPPORTUNITY AGREEMENT

This agreement establishes the terms for the podcast opportunity download and subsequent content creation.

REVENUE SHARING TERMS:
- PIE/YouTube Revenue Share: Merchant receives 50% of PIE''s 70% share (after YouTube''s 30% platform fee)
- PIE Exclusive Revenue Share: Merchant receives 50% of individual video price ($' || COALESCE(audio_product.pie_video_price, 0) || ' per video)
- Monthly YouTube Membership Fee: $' || COALESCE(audio_product.youtube_membership_fee, 0) || ' (for reference in royalty calculations)

PAYOUT POLICY:
- YouTube royalty distribution activates once the $100 threshold is met
- Payments processed according to YouTube''s standard payout schedule
- PIE exclusive revenue paid monthly regardless of threshold

MERCHANT OBLIGATIONS:
- Review downloaded podcast content within 7 days
- Provide professional quality video content if accepting opportunity
- Meet agreed-upon deadlines and specifications
- Comply with platform content guidelines
- Maintain professional communication throughout the project

PLATFORM OBLIGATIONS:
- Provide clear project specifications and requirements
- Timely payment according to agreed terms
- Professional project management and support
- Transparent royalty reporting

By signing below, both parties agree to these terms and conditions.';

    INSERT INTO public.contracts (
      merchant_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      NEW.merchant_id,
      'podcast_opportunity',
      contract_terms_text,
      'pending'
    ) RETURNING id INTO new_contract_id;

    UPDATE public.podcast_downloads 
    SET contract_id = new_contract_id, contract_generated = true
    WHERE id = NEW.id;
    
    UPDATE public.audio_products
    SET podcast_contract_generated = true
    WHERE id = NEW.audio_product_id;

  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger function 8: generate_announcement_contract
CREATE OR REPLACE FUNCTION public.generate_announcement_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
BEGIN
  IF NEW.post_type = 'announcement' AND NEW.contract_type IS NOT NULL AND NEW.contract_type != 'regular' AND (OLD.contract_generated IS NULL OR OLD.contract_generated = false) THEN
    
    contract_terms_text := 'CONTRACTOR OPPORTUNITY AGREEMENT - ' || UPPER(NEW.contract_type) || '

This agreement establishes the terms for the ' || NEW.contract_type || ' contractor opportunity.

REVENUE SHARING TERMS:';

    IF NEW.youtube_contractor_share IS NOT NULL THEN
      contract_terms_text := contract_terms_text || '
- YouTube Revenue Share: Contractor receives ' || NEW.youtube_contractor_share || '% of YouTube membership revenues';
    END IF;

    IF NEW.pie_contractor_share IS NOT NULL AND NEW.pie_episode_cost IS NOT NULL THEN
      contract_terms_text := contract_terms_text || '
- PIE Platform: $' || NEW.pie_episode_cost || ' per episode, contractor receives ' || NEW.pie_contractor_share || '% of episode revenue';
    END IF;

    IF NEW.number_of_opportunities IS NOT NULL THEN
      contract_terms_text := contract_terms_text || '
- Available Positions: ' || NEW.number_of_opportunities || ' contractor position(s) available';
    END IF;

    contract_terms_text := contract_terms_text || '

CONTRACTOR OBLIGATIONS:
- Maintain quality standards for all deliverables
- Meet agreed-upon deadlines and specifications
- Comply with platform content guidelines
- Provide professional communication throughout the project

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Clear project specifications and requirements
- Professional project management and support

By signing below, both parties agree to these terms and conditions.';

    INSERT INTO public.contracts (
      merchant_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      NEW.merchant_id,
      NEW.contract_type,
      contract_terms_text,
      'available'
    ) RETURNING id INTO new_contract_id;

    UPDATE public.bulletin_posts 
    SET contract_generated = true
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger function 9: create_video_ad_contract_after_approval
CREATE OR REPLACE FUNCTION public.create_video_ad_contract_after_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  opportunity_data RECORD;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.contract_id IS NULL THEN
    
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

    UPDATE public.video_ad_submissions 
    SET contract_id = new_contract_id, contract_generated_at = NOW()
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger function 10: create_contract_after_approval
CREATE OR REPLACE FUNCTION public.create_contract_after_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Trigger function 11: distribute_featuring_artist_revenue (already has SET search_path)
-- This function is already properly configured with SET search_path = public

-- Trigger function 12: create_asmr_download_contract
CREATE OR REPLACE FUNCTION public.create_asmr_download_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  audio_product RECORD;
BEGIN
  SELECT * INTO audio_product 
  FROM public.audio_products 
  WHERE id = NEW.audio_product_id;
  
  IF audio_product.audio_type = 'asmr' AND audio_product.access_level = 'merchant_only' THEN
    
    contract_terms_text := 'ASMR OPPORTUNITY AGREEMENT

This agreement establishes the terms for the ASMR opportunity download and subsequent content creation.

REVENUE SHARING TERMS:
- Advance Fee: $' || COALESCE(audio_product.advance_fee_rate, 0) || ' per approved submission
- Back-end Royalties: ' || CASE WHEN audio_product.back_end_royalties THEN 'Merchant eligible for revenue sharing on cover submissions' ELSE 'No additional royalties' END || '
- PIE Photo Editing: ' || CASE WHEN audio_product.pie_photo_editing THEN 'PIE will edit merchant photos for covers' ELSE 'No photo editing services' END || '

MERCHANT OBLIGATIONS:
- Review downloaded ASMR content within 7 days
- Provide professional quality audio content if accepting opportunity
- Meet agreed-upon deadlines and specifications
- Comply with platform content guidelines
- Maintain professional communication throughout the project

PLATFORM OBLIGATIONS:
- Provide clear project specifications and requirements
- Timely payment according to agreed terms
- Professional project management and support
- Transparent royalty reporting

By signing below, both parties agree to these terms and conditions.';

    INSERT INTO public.contracts (
      merchant_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      NEW.merchant_id,
      'asmr_opportunity',
      contract_terms_text,
      'pending'
    ) RETURNING id INTO new_contract_id;

    UPDATE public.asmr_downloads 
    SET contract_id = new_contract_id, contract_generated = true
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger function 13: check_podcast_contract_signed
CREATE OR REPLACE FUNCTION public.check_podcast_contract_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  contract_status TEXT;
  contract_signed_at TIMESTAMPTZ;
BEGIN
  IF NEW.contract_id IS NOT NULL AND (OLD.contract_id IS NULL OR NEW.contract_id != OLD.contract_id) THEN
    SELECT status, signed_at INTO contract_status, contract_signed_at
    FROM public.contracts
    WHERE id = NEW.contract_id;
    
    IF contract_status = 'approved' AND contract_signed_at IS NOT NULL THEN
      UPDATE public.audio_products
      SET podcast_contract_generated = true,
          updated_at = NOW()
      WHERE id = NEW.audio_product_id
      AND audio_type = 'podcast';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
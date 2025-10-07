-- Drop existing policy if it exists and recreate with correct configuration
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;

-- Add RLS policy for authenticated users to view public profile data
CREATE POLICY "Authenticated users can view public profile data"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Add search_path protection to all SECURITY DEFINER trigger functions
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
    SELECT * INTO audio_product FROM public.audio_products WHERE id = NEW.audio_product_id;
    
    contract_terms_text := 'ASMR SUBMISSION AGREEMENT' || E'\n\nThis agreement establishes the terms for the approved ASMR submission.' || E'\n\nOPPORTUNITY DETAILS:';
    IF audio_product.is_pie_exclusive THEN
      contract_terms_text := contract_terms_text || E'\n- Deal Type: PIE Exclusive (2-Year Exclusivity Period)' || E'\n- Advance Fee: $' || COALESCE(audio_product.advance_fee_rate, 0) || E'\n- Back-end Royalties: Contractor receives 50% of net revenue from back-end royalties' || E'\n- Exclusivity Duration: 2 years from contract execution date';
    ELSE
      contract_terms_text := contract_terms_text || E'\n- Deal Type: Non-Exclusive' || E'\n- Advance Fee: Not applicable' || E'\n- Back-end Royalties: ' || CASE WHEN audio_product.back_end_royalties THEN 'Contractor receives 50% of net revenue from back-end royalties' ELSE 'No additional royalties' END;
    END IF;
    contract_terms_text := contract_terms_text || E'\n\nREVENUE SHARING TERMS:' || E'\n- Back-end Royalties: When enabled, contractor receives 50% of net revenue generated from the ASMR content after platform processing fees' || E'\n- Revenue sharing applies to secondary sales, licensing, and other monetization of the approved ASMR content' || E'\n- Revenue calculations exclude payment processing fees and platform operational costs' || E'\n- Royalty Payout Schedule: Quarterly payments on March 30th, June 30th, September 30th, and December 30th';
    IF audio_product.is_pie_exclusive THEN
      contract_terms_text := contract_terms_text || E'\n- Content created under this agreement is exclusive to PIE for a 2-year period from contract execution' || E'\n- Contractor may not distribute identical content through other channels during the 2-year exclusivity period' || E'\n- After the 2-year exclusivity period expires, contractor regains full distribution rights';
    END IF;
    contract_terms_text := contract_terms_text || E'\n\nTERMS AND CONDITIONS:' || E'\n- The Independent Contractor grants ' || CASE WHEN audio_product.is_pie_exclusive THEN 'exclusive' ELSE 'non-exclusive' END || ' rights to use the submitted ASMR content' || E'\n- Content may be used on PIE platform and partner platforms' || E'\n- Contractor retains rights to use content on their own platforms' || CASE WHEN audio_product.is_pie_exclusive THEN ' after the 2-year exclusivity period' ELSE '' END || E'\n- Payment as specified will be provided upon contract execution' || E'\n- Usage rights are ' || CASE WHEN audio_product.is_pie_exclusive THEN 'exclusive to PIE for 2 years from contract execution' ELSE 'non-exclusive, allowing contractor personal use' END || E'\n\nCONTRACTOR OBLIGATIONS:' || E'\n- Maintain quality standards for all submissions' || E'\n- Comply with platform content guidelines and requirements' || E'\n- Provide accurate information in application';
    IF audio_product.is_pie_exclusive THEN
      contract_terms_text := contract_terms_text || E'\n- Honor 2-year exclusivity terms and refrain from distributing identical content elsewhere during this period';
    END IF;
    contract_terms_text := contract_terms_text || E'\n\nPLATFORM OBLIGATIONS:' || E'\n- Timely payment according to agreed terms' || E'\n- Accurate revenue reporting when back-end royalties apply' || E'\n- Quarterly royalty payments on March 30th, June 30th, September 30th, and December 30th' || E'\n- Proper attribution when required by platform' || E'\n- Professional communication throughout process' || E'\n\nBy signing below, both parties agree to these terms and conditions.';
    
    INSERT INTO public.contracts (merchant_id, contract_type, contract_terms, status)
    VALUES (NEW.merchant_id, 'asmr_submission', contract_terms_text, 'approved') RETURNING id INTO new_contract_id;
    UPDATE public.asmr_submissions SET contract_id = new_contract_id, contract_generated_at = NOW() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

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
  SELECT * INTO audio_product FROM public.audio_products WHERE id = NEW.audio_product_id;
  IF audio_product.audio_type = 'podcast' AND audio_product.access_level = 'merchant_only' THEN
    contract_terms_text := 'PODCAST OPPORTUNITY AGREEMENT' || E'\n\nThis agreement establishes the terms for the podcast opportunity download and subsequent content creation.' || E'\n\nREVENUE SHARING TERMS:' || E'\n- PIE/YouTube Revenue Share: Merchant receives 50% of PIE''s 70% share (after YouTube''s 30% platform fee)' || E'\n- PIE Exclusive Revenue Share: Merchant receives 50% of individual video price ($' || COALESCE(audio_product.pie_video_price, 0) || ' per video)' || E'\n- Monthly YouTube Membership Fee: $' || COALESCE(audio_product.youtube_membership_fee, 0) || ' (for reference in royalty calculations)' || E'\n\nPAYOUT POLICY:' || E'\n- YouTube royalty distribution activates once the $100 threshold is met' || E'\n- Payments processed according to YouTube''s standard payout schedule' || E'\n- PIE exclusive revenue paid monthly regardless of threshold' || E'\n\nMERCHANT OBLIGATIONS:' || E'\n- Review downloaded podcast content within 7 days' || E'\n- Provide professional quality video content if accepting opportunity' || E'\n- Meet agreed-upon deadlines and specifications' || E'\n- Comply with platform content guidelines' || E'\n- Maintain professional communication throughout the project' || E'\n\nPLATFORM OBLIGATIONS:' || E'\n- Provide clear project specifications and requirements' || E'\n- Timely payment according to agreed terms' || E'\n- Professional project management and support' || E'\n- Transparent royalty reporting' || E'\n\nBy signing below, both parties agree to these terms and conditions.';
    INSERT INTO public.contracts (merchant_id, contract_type, contract_terms, status)
    VALUES (NEW.merchant_id, 'podcast_opportunity', contract_terms_text, 'pending') RETURNING id INTO new_contract_id;
    UPDATE public.podcast_downloads SET contract_id = new_contract_id, contract_generated = true WHERE id = NEW.id;
    UPDATE public.audio_products SET podcast_contract_generated = true WHERE id = NEW.audio_product_id;
  END IF;
  RETURN NEW;
END;
$function$;

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
    contract_terms_text := 'CONTRACTOR OPPORTUNITY AGREEMENT - ' || UPPER(NEW.contract_type) || E'\n\nThis agreement establishes the terms for the ' || NEW.contract_type || ' contractor opportunity.' || E'\n\nREVENUE SHARING TERMS:';
    IF NEW.youtube_contractor_share IS NOT NULL THEN
      contract_terms_text := contract_terms_text || E'\n- YouTube Revenue Share: Contractor receives ' || NEW.youtube_contractor_share || '% of YouTube membership revenues';
    END IF;
    IF NEW.pie_contractor_share IS NOT NULL AND NEW.pie_episode_cost IS NOT NULL THEN
      contract_terms_text := contract_terms_text || E'\n- PIE Platform: $' || NEW.pie_episode_cost || ' per episode, contractor receives ' || NEW.pie_contractor_share || '% of episode revenue';
    END IF;
    IF NEW.number_of_opportunities IS NOT NULL THEN
      contract_terms_text := contract_terms_text || E'\n- Available Positions: ' || NEW.number_of_opportunities || ' contractor position(s) available';
    END IF;
    contract_terms_text := contract_terms_text || E'\n\nCONTRACTOR OBLIGATIONS:' || E'\n- Maintain quality standards for all deliverables' || E'\n- Meet agreed-upon deadlines and specifications' || E'\n- Comply with platform content guidelines' || E'\n- Provide professional communication throughout the project' || E'\n\nPLATFORM OBLIGATIONS:' || E'\n- Timely payment according to agreed terms' || E'\n- Clear project specifications and requirements' || E'\n- Professional project management and support' || E'\n\nBy signing below, both parties agree to these terms and conditions.';
    INSERT INTO public.contracts (merchant_id, contract_type, contract_terms, status)
    VALUES (NEW.merchant_id, NEW.contract_type, contract_terms_text, 'available') RETURNING id INTO new_contract_id;
    UPDATE public.bulletin_posts SET contract_generated = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

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
    SELECT * INTO opportunity_data FROM public.video_ad_opportunities WHERE id = NEW.video_ad_opportunity_id;
    contract_terms_text := 'EXCLUSIVE PIE INDEPENDENT CONTRACT' || E'\n\nThis agreement establishes the terms for exclusive content creation for PIE on TikTok.' || E'\n\nOPPORTUNITY DETAILS:' || E'\n- Target Platform: TIKTOK' || E'\n- Cash Advance Payment: $' || opportunity_data.payment_amount || E'\n- Audio Type: ' || UPPER(opportunity_data.audio_type::text) || E'\n\nEXCLUSIVE CONTENT TERMS:' || E'\n- The Independent Contractor agrees to create content exclusively for PIE on TikTok' || E'\n- Content will be distributed on TikTok only' || E'\n- All content created under this agreement is exclusive to PIE for TikTok distribution' || E'\n\nREVENUE SHARING TERMS:' || E'\n- Cash Advance: $' || opportunity_data.payment_amount || ' (paid upon contract execution)' || E'\n- TikTok Advertisement Revenue Share: 50% of net advertisement revenues (after platform transaction fees)' || E'\n- Revenue sharing applies ONLY to advertisement revenue from TikTok' || E'\n- Transaction fees (platform fees, payment processing) are deducted before revenue split calculation';
    INSERT INTO public.contracts (merchant_id, video_ad_submission_id, video_ad_opportunity_id, contract_type, contract_terms, status)
    VALUES (NEW.merchant_id, NEW.id, NEW.video_ad_opportunity_id, 'video_ad_opportunity', contract_terms_text, 'pending') RETURNING id INTO new_contract_id;
    UPDATE public.video_ad_submissions SET contract_id = new_contract_id, contract_generated_at = NOW() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

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
      contract_terms_text := 'SONG COVER SUBMISSION AGREEMENT' || E'\n\nStandard revenue split applies.';
    ELSE
      contract_terms_text := 'MODELING APPLICATION AGREEMENT' || E'\n\nStandard terms apply.';
    END IF;
    INSERT INTO public.contracts (merchant_id, cover_submission_id, modeling_application_id, contract_type, contract_terms, status)
    VALUES (NEW.merchant_id, CASE WHEN TG_TABLE_NAME = 'song_cover_submissions' THEN NEW.id ELSE NULL END, CASE WHEN TG_TABLE_NAME = 'modeling_applications' THEN NEW.id ELSE NULL END, CASE WHEN TG_TABLE_NAME = 'song_cover_submissions' THEN 'cover_submission' ELSE 'modeling_application' END, contract_terms_text, 'pending') RETURNING id INTO new_contract_id;
    IF TG_TABLE_NAME = 'song_cover_submissions' THEN
      UPDATE public.song_cover_submissions SET contract_id = new_contract_id, contract_generated_at = NOW() WHERE id = NEW.id;
    ELSE
      UPDATE public.modeling_applications SET contract_id = new_contract_id, contract_generated_at = NOW() WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

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
  SELECT * INTO audio_product FROM public.audio_products WHERE id = NEW.audio_product_id;
  IF audio_product.audio_type = 'asmr' AND audio_product.access_level = 'merchant_only' THEN
    contract_terms_text := 'ASMR OPPORTUNITY AGREEMENT' || E'\n\nThis agreement establishes the terms for the ASMR opportunity download and subsequent content creation.' || E'\n\nREVENUE SHARING TERMS:' || E'\n- Advance Fee: $' || COALESCE(audio_product.advance_fee_rate, 0) || ' per approved submission' || E'\n- Back-end Royalties: ' || CASE WHEN audio_product.back_end_royalties THEN 'Merchant eligible for revenue sharing on cover submissions' ELSE 'No additional royalties' END || E'\n- PIE Photo Editing: ' || CASE WHEN audio_product.pie_photo_editing THEN 'PIE will edit merchant photos for covers' ELSE 'No photo editing services' END;
    INSERT INTO public.contracts (merchant_id, contract_type, contract_terms, status)
    VALUES (NEW.merchant_id, 'asmr_opportunity', contract_terms_text, 'pending') RETURNING id INTO new_contract_id;
    UPDATE public.asmr_downloads SET contract_id = new_contract_id, contract_generated = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

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
    SELECT status, signed_at INTO contract_status, contract_signed_at FROM public.contracts WHERE id = NEW.contract_id;
    IF contract_status = 'approved' AND contract_signed_at IS NOT NULL THEN
      UPDATE public.audio_products SET podcast_contract_generated = true, updated_at = NOW() WHERE id = NEW.audio_product_id AND audio_type = 'podcast';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
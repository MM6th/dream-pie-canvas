
-- Create enum for social media platforms
CREATE TYPE social_media_platform AS ENUM ('facebook', 'instagram', 'youtube', 'x', 'tiktok', 'onlyfans');

-- Create enum for audio types
CREATE TYPE audio_type_enum AS ENUM ('music', 'podcast', 'asmr', 'spoken');

-- Create video_ad_opportunities table
CREATE TABLE public.video_ad_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_file_url TEXT NOT NULL,
  audio_type audio_type_enum NOT NULL,
  target_platform social_media_platform NOT NULL,
  payment_amount NUMERIC NOT NULL,
  available_spots INTEGER NOT NULL DEFAULT 1,
  access_level access_level DEFAULT 'public',
  is_adult_content BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_ad_downloads table (tracks merchant downloads)
CREATE TABLE public.video_ad_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_ad_opportunity_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contract_generated BOOLEAN DEFAULT false,
  contract_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_ad_submissions table (merchant applications)
CREATE TABLE public.video_ad_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_ad_opportunity_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  video_file_url TEXT NOT NULL,
  why_me_text TEXT,
  negotiation_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  contract_id UUID,
  contract_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add video_ad_opportunity contract type support to existing contracts table
ALTER TABLE public.contracts 
ADD COLUMN video_ad_submission_id UUID,
ADD COLUMN video_ad_opportunity_id UUID;

-- Enable RLS on new tables
ALTER TABLE public.video_ad_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_ad_opportunities
CREATE POLICY "Anyone can view video ad opportunities" 
  ON public.video_ad_opportunities 
  FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can create video ad opportunities" 
  ON public.video_ad_opportunities 
  FOR INSERT 
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update video ad opportunities" 
  ON public.video_ad_opportunities 
  FOR UPDATE 
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete video ad opportunities" 
  ON public.video_ad_opportunities 
  FOR DELETE 
  USING (is_admin(auth.uid()));

-- RLS policies for video_ad_downloads
CREATE POLICY "Merchants can view their own downloads" 
  ON public.video_ad_downloads 
  FOR SELECT 
  USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all downloads" 
  ON public.video_ad_downloads 
  FOR SELECT 
  USING (is_admin(auth.uid()));

CREATE POLICY "Merchants can create their own downloads" 
  ON public.video_ad_downloads 
  FOR INSERT 
  WITH CHECK (auth.uid() = merchant_id);

-- RLS policies for video_ad_submissions
CREATE POLICY "Merchants can view their own submissions" 
  ON public.video_ad_submissions 
  FOR SELECT 
  USING (auth.uid() = merchant_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can view all submissions" 
  ON public.video_ad_submissions 
  FOR SELECT 
  USING (is_admin(auth.uid()));

CREATE POLICY "Merchants can create their own submissions" 
  ON public.video_ad_submissions 
  FOR INSERT 
  WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own pending submissions" 
  ON public.video_ad_submissions 
  FOR UPDATE 
  USING (auth.uid() = merchant_id AND status = 'pending');

CREATE POLICY "Admins can update all submissions" 
  ON public.video_ad_submissions 
  FOR UPDATE 
  USING (is_admin(auth.uid()));

-- Create trigger function for video ad contract generation
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
    
    contract_terms_text := 'VIDEO ADVERTISING OPPORTUNITY AGREEMENT

This agreement establishes the terms for the approved video advertising submission.

OPPORTUNITY DETAILS:
- Platform: ' || UPPER(opportunity_data.target_platform::text) || '
- Payment Amount: $' || opportunity_data.payment_amount || '
- Audio Type: ' || UPPER(opportunity_data.audio_type::text) || '

TERMS AND CONDITIONS:
- The Independent Contractor grants non-exclusive rights to use the submitted video content
- Content may be used on the specified platform and potentially on PIE platform
- Contractor retains rights to use content on their own platforms
- Payment as specified will be provided upon contract execution
- Usage rights are non-exclusive, allowing contractor personal use

CONTRACTOR OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with platform content guidelines and requirements
- Provide accurate information in application

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Proper attribution when required by platform
- Professional communication throughout process

By signing below, both parties agree to these terms and conditions.';

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

-- Create trigger for video ad contract generation
CREATE TRIGGER video_ad_contract_generation_trigger
  AFTER UPDATE ON public.video_ad_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_video_ad_contract_after_approval();

-- Create trigger function for video ad download contract generation
CREATE OR REPLACE FUNCTION public.create_video_ad_download_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  opportunity_data RECORD;
BEGIN
  -- Get opportunity details
  SELECT * INTO opportunity_data 
  FROM public.video_ad_opportunities 
  WHERE id = NEW.video_ad_opportunity_id;
  
  contract_terms_text := 'VIDEO ADVERTISING OPPORTUNITY DOWNLOAD AGREEMENT

This agreement establishes the terms for downloading and potentially participating in a video advertising opportunity.

OPPORTUNITY DETAILS:
- Title: ' || opportunity_data.title || '
- Platform: ' || UPPER(opportunity_data.target_platform::text) || '
- Payment Amount: $' || opportunity_data.payment_amount || '
- Audio Type: ' || UPPER(opportunity_data.audio_type::text) || '

MERCHANT OBLIGATIONS:
- Review downloaded audio content within 7 days
- Provide professional quality video content if accepting opportunity
- Meet agreed-upon deadlines and specifications
- Comply with platform content guidelines
- Maintain professional communication throughout the project

PLATFORM OBLIGATIONS:
- Provide clear project specifications and requirements
- Timely payment according to agreed terms
- Professional project management and support
- Transparent opportunity process

By downloading this content, merchant acknowledges these terms and conditions.';

  -- Create new contract
  INSERT INTO public.contracts (
    merchant_id,
    video_ad_opportunity_id,
    contract_type,
    contract_terms,
    status
  ) VALUES (
    NEW.merchant_id,
    NEW.video_ad_opportunity_id,
    'video_ad_download',
    contract_terms_text,
    'available'
  ) RETURNING id INTO new_contract_id;

  -- Update the download record with contract reference
  UPDATE public.video_ad_downloads 
  SET contract_id = new_contract_id, contract_generated = true
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

-- Create trigger for video ad download contract generation
CREATE TRIGGER video_ad_download_contract_trigger
  AFTER INSERT ON public.video_ad_downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_video_ad_download_contract();

-- Add is_adult_creator field to profiles table
ALTER TABLE public.profiles ADD COLUMN is_adult_creator boolean DEFAULT false;

-- Add ASMR-specific fields to audio_products table
ALTER TABLE public.audio_products ADD COLUMN description text;
ALTER TABLE public.audio_products ADD COLUMN back_end_royalties boolean DEFAULT false;
ALTER TABLE public.audio_products ADD COLUMN pie_photo_editing boolean DEFAULT false;
ALTER TABLE public.audio_products ADD COLUMN cover_photos text[] DEFAULT '{}';
ALTER TABLE public.audio_products ADD COLUMN advance_fee_rate numeric;
ALTER TABLE public.audio_products ADD COLUMN number_of_opportunities integer;
ALTER TABLE public.audio_products ADD COLUMN opportunities_exhausted boolean DEFAULT false;

-- Create asmr_downloads table
CREATE TABLE public.asmr_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audio_product_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contract_generated boolean DEFAULT false,
  contract_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  negotiation_message text,
  why_me_text text
);

-- Create asmr_submissions table
CREATE TABLE public.asmr_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audio_product_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  submission_audio_url text NOT NULL,
  cover_photos text[] DEFAULT '{}',
  why_me_text text,
  negotiation_text text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  contract_id UUID,
  contract_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.asmr_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asmr_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for asmr_downloads
CREATE POLICY "Merchants can view their own ASMR downloads"
ON public.asmr_downloads
FOR SELECT
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can create their own ASMR downloads"
ON public.asmr_downloads
FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all ASMR downloads"
ON public.asmr_downloads
FOR SELECT
USING (is_admin(auth.uid()));

-- Create policies for asmr_submissions
CREATE POLICY "Merchants can view their own ASMR submissions"
ON public.asmr_submissions
FOR SELECT
USING ((auth.uid() = merchant_id) OR is_admin(auth.uid()));

CREATE POLICY "Merchants can create their own ASMR submissions"
ON public.asmr_submissions
FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own pending ASMR submissions"
ON public.asmr_submissions
FOR UPDATE
USING ((auth.uid() = merchant_id) AND (status = 'pending'));

CREATE POLICY "Admins can view all ASMR submissions"
ON public.asmr_submissions
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all ASMR submissions"
ON public.asmr_submissions
FOR UPDATE
USING (is_admin(auth.uid()));

-- Create trigger for ASMR download contracts
CREATE OR REPLACE FUNCTION create_asmr_download_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  audio_product RECORD;
BEGIN
  -- Get audio product details
  SELECT * INTO audio_product 
  FROM public.audio_products 
  WHERE id = NEW.audio_product_id;
  
  -- Only create contract for ASMR type with merchant_only access
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

    -- Create new contract
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

    -- Update the download record with contract reference
    UPDATE public.asmr_downloads 
    SET contract_id = new_contract_id, contract_generated = true
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for ASMR submission contracts
CREATE OR REPLACE FUNCTION create_asmr_submission_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
- Back-end Royalties: ' || CASE WHEN audio_product.back_end_royalties THEN 'Eligible for revenue sharing' ELSE 'No additional royalties' END || '

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
$$;

-- Create triggers
CREATE TRIGGER create_asmr_download_contract_trigger
AFTER INSERT ON public.asmr_downloads
FOR EACH ROW
EXECUTE FUNCTION create_asmr_download_contract();

CREATE TRIGGER create_asmr_submission_contract_trigger
AFTER UPDATE ON public.asmr_submissions
FOR EACH ROW
EXECUTE FUNCTION create_asmr_submission_contract();
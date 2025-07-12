-- Add new columns to audio_products table for podcast functionality
ALTER TABLE public.audio_products 
ADD COLUMN pie_video_price NUMERIC,
ADD COLUMN youtube_membership_fee NUMERIC,
ADD COLUMN podcast_contract_generated BOOLEAN DEFAULT false;

-- Create podcast_downloads table to track merchant downloads
CREATE TABLE public.podcast_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audio_product_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contract_generated BOOLEAN DEFAULT false,
  contract_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on podcast_downloads
ALTER TABLE public.podcast_downloads ENABLE ROW LEVEL SECURITY;

-- RLS policies for podcast_downloads
CREATE POLICY "Merchants can view their own downloads" 
ON public.podcast_downloads 
FOR SELECT 
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can create their own downloads" 
ON public.podcast_downloads 
FOR INSERT 
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all downloads" 
ON public.podcast_downloads 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create function to generate podcast contracts after download
CREATE OR REPLACE FUNCTION public.create_podcast_contract_after_download()
RETURNS TRIGGER AS $$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
  audio_product RECORD;
BEGIN
  -- Get audio product details
  SELECT * INTO audio_product 
  FROM public.audio_products 
  WHERE id = NEW.audio_product_id;
  
  -- Only create contract for podcast type with merchant_only access
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

    -- Create new contract
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

    -- Update the download record with contract reference
    UPDATE public.podcast_downloads 
    SET contract_id = new_contract_id, contract_generated = true
    WHERE id = NEW.id;
    
    -- Update audio product to mark contract as generated
    UPDATE public.audio_products
    SET podcast_contract_generated = true
    WHERE id = NEW.audio_product_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for podcast contract generation
CREATE TRIGGER create_podcast_contract_trigger
  AFTER INSERT ON public.podcast_downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_podcast_contract_after_download();
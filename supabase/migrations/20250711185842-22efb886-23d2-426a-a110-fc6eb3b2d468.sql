-- Phase 1: Database Schema Updates for Enhanced Announcement Post System

-- Add new columns to bulletin_posts table for announcement-specific fields
ALTER TABLE public.bulletin_posts 
ADD COLUMN contract_type text,
ADD COLUMN youtube_contractor_share numeric CHECK (youtube_contractor_share >= 0 AND youtube_contractor_share <= 100),
ADD COLUMN pie_contractor_share numeric CHECK (pie_contractor_share >= 0 AND pie_contractor_share <= 100),
ADD COLUMN pie_episode_cost numeric CHECK (pie_episode_cost >= 0),
ADD COLUMN number_of_opportunities integer CHECK (number_of_opportunities > 0),
ADD COLUMN uploaded_image_url text,
ADD COLUMN contract_generated boolean DEFAULT false;

-- Create bulletin-images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-images', 'bulletin-images', true);

-- Create storage policies for bulletin-images bucket
CREATE POLICY "Anyone can view bulletin images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'bulletin-images');

CREATE POLICY "Approved merchants and admins can upload bulletin images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'bulletin-images' 
  AND (is_admin(auth.uid()) OR is_approved_merchant(auth.uid()))
);

CREATE POLICY "Approved merchants and admins can update their bulletin images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'bulletin-images' 
  AND (is_admin(auth.uid()) OR is_approved_merchant(auth.uid()))
);

CREATE POLICY "Approved merchants and admins can delete their bulletin images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'bulletin-images' 
  AND (is_admin(auth.uid()) OR is_approved_merchant(auth.uid()))
);

-- Update post_type column to have better default and add new enum values
-- We'll keep it as text for flexibility but add comments for expected values
COMMENT ON COLUMN public.bulletin_posts.post_type IS 'Expected values: tv_guide, current_thoughts, announcement, regular';
COMMENT ON COLUMN public.bulletin_posts.contract_type IS 'Expected values: audio, asmr, modeling, podcast, film, video, regular';

-- Create trigger to auto-generate contracts for announcement posts
CREATE OR REPLACE FUNCTION public.generate_announcement_contract()
RETURNS TRIGGER AS $$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
BEGIN
  -- Only create contract for announcement posts with contract types (not 'regular')
  IF NEW.post_type = 'announcement' AND NEW.contract_type IS NOT NULL AND NEW.contract_type != 'regular' AND OLD.contract_generated IS DISTINCT FROM true THEN
    
    -- Set contract terms based on announcement type
    contract_terms_text := 'CONTRACTOR OPPORTUNITY AGREEMENT - ' || UPPER(NEW.contract_type) || '

This agreement establishes the terms for the ' || NEW.contract_type || ' contractor opportunity.

REVENUE SHARING TERMS:';

    -- Add YouTube terms if specified
    IF NEW.youtube_contractor_share IS NOT NULL THEN
      contract_terms_text := contract_terms_text || '
- YouTube Revenue Share: Contractor receives ' || NEW.youtube_contractor_share || '% of YouTube membership revenues';
    END IF;

    -- Add PIE platform terms if specified
    IF NEW.pie_contractor_share IS NOT NULL AND NEW.pie_episode_cost IS NOT NULL THEN
      contract_terms_text := contract_terms_text || '
- PIE Platform: $' || NEW.pie_episode_cost || ' per episode, contractor receives ' || NEW.pie_contractor_share || '% of episode revenue';
    END IF;

    -- Add opportunity count if specified
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

    -- Create new contract
    INSERT INTO public.contracts (
      merchant_id,
      contract_type,
      contract_terms,
      status
    ) VALUES (
      'announcement_' || NEW.id, -- Special identifier for announcement contracts
      NEW.contract_type,
      contract_terms_text,
      'available'
    ) RETURNING id INTO new_contract_id;

    -- Mark the post as having a contract generated
    UPDATE public.bulletin_posts 
    SET contract_generated = true
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for contract generation
CREATE TRIGGER generate_announcement_contract_trigger
  AFTER INSERT OR UPDATE ON public.bulletin_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_announcement_contract();
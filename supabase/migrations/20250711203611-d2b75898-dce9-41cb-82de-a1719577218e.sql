-- Fix announcement post creation by ensuring trigger works correctly and add debugging
-- First, let's recreate the trigger function with better error handling

CREATE OR REPLACE FUNCTION public.generate_announcement_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_contract_id UUID;
  contract_terms_text TEXT;
BEGIN
  -- Only create contract for announcement posts with contract types (not 'regular' or null)
  IF NEW.post_type = 'announcement' AND NEW.contract_type IS NOT NULL AND NEW.contract_type != 'regular' AND (OLD.contract_generated IS NULL OR OLD.contract_generated = false) THEN
    
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
      NEW.merchant_id,
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
$function$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS bulletin_posts_contract_trigger ON public.bulletin_posts;
CREATE TRIGGER bulletin_posts_contract_trigger
    AFTER INSERT OR UPDATE ON public.bulletin_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_announcement_contract();
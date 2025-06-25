
-- Add first_name and last_name to profiles table
ALTER TABLE public.profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Create contracts table for digital contract agreements
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_submission_id UUID REFERENCES public.song_cover_submissions(id) ON DELETE CASCADE,
  modeling_application_id UUID REFERENCES public.modeling_applications(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('cover_submission', 'modeling_application')),
  contract_terms TEXT NOT NULL,
  merchant_signature TEXT,
  admin_signature TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'completed')),
  tunecore_terms_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create digital receipts table for proof of transactions
CREATE TABLE public.digital_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  receipt_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_to_merchant BOOLEAN DEFAULT FALSE,
  sent_to_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add contract acceptance tracking to song_cover_submissions
ALTER TABLE public.song_cover_submissions 
ADD COLUMN contract_id UUID REFERENCES public.contracts(id),
ADD COLUMN requires_contract BOOLEAN DEFAULT TRUE,
ADD COLUMN contract_generated_at TIMESTAMP WITH TIME ZONE;

-- Add contract acceptance tracking to modeling_applications  
ALTER TABLE public.modeling_applications
ADD COLUMN contract_id UUID REFERENCES public.contracts(id),
ADD COLUMN requires_contract BOOLEAN DEFAULT TRUE,
ADD COLUMN contract_generated_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for contracts
CREATE POLICY "Users can view their own contracts" 
  ON public.contracts FOR SELECT 
  USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all contracts" 
  ON public.contracts FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can create contracts" 
  ON public.contracts FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Users can update their own contracts" 
  ON public.contracts FOR UPDATE 
  USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can update all contracts" 
  ON public.contracts FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS policies for digital receipts
CREATE POLICY "Users can view their own receipts" 
  ON public.digital_receipts FOR SELECT 
  USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all receipts" 
  ON public.digital_receipts FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can create receipts" 
  ON public.digital_receipts FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Function to generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  receipt_num TEXT;
BEGIN
  receipt_num := 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT, 10, '0');
  RETURN receipt_num;
END;
$$;

-- Function to create contract after approval
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

TUNECORE PARTNERSHIP TERMS:
- Revenue sharing as per Tunecore partnership agreement
- Distribution rights and royalty collection
- Merchant retains creative rights to the cover version
- Platform receives distribution commission as outlined

MERCHANT OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with original song licensing requirements
- Provide accurate metadata for distribution

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

-- Create triggers for contract generation
CREATE TRIGGER create_cover_contract_trigger
  AFTER UPDATE ON public.song_cover_submissions
  FOR EACH ROW
  EXECUTE FUNCTION create_contract_after_approval();

CREATE TRIGGER create_modeling_contract_trigger
  AFTER UPDATE ON public.modeling_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_contract_after_approval();

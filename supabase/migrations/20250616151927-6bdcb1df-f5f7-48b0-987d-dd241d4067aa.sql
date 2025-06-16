
-- Create table for song cover submissions
CREATE TABLE public.song_cover_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  audio_product_id UUID NOT NULL,
  cover_image_url TEXT NOT NULL,
  submission_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.song_cover_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own submissions" 
  ON public.song_cover_submissions 
  FOR SELECT 
  USING (
    auth.uid() = merchant_id OR 
    public.is_admin(auth.uid())
  );

CREATE POLICY "Approved merchants can create submissions" 
  ON public.song_cover_submissions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = merchant_id AND 
    (public.is_admin(auth.uid()) OR public.is_approved_merchant(auth.uid()))
  );

CREATE POLICY "Admins can update submissions" 
  ON public.song_cover_submissions 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

-- Function to approve/reject cover submissions
CREATE OR REPLACE FUNCTION public.update_cover_submission_status(
  submission_id UUID,
  new_status TEXT,
  admin_notes_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve cover submissions';
  END IF;

  -- Validate status
  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid submission status';
  END IF;

  -- Update the submission status
  UPDATE public.song_cover_submissions
  SET status = new_status,
      admin_notes = admin_notes_text,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = submission_id;

  -- If approved, update the audio product with the new cover
  IF new_status = 'approved' THEN
    UPDATE public.audio_products
    SET thumbnail_url = (
      SELECT cover_image_url 
      FROM public.song_cover_submissions 
      WHERE id = submission_id
    ),
    updated_at = NOW()
    WHERE id = (
      SELECT audio_product_id 
      FROM public.song_cover_submissions 
      WHERE id = submission_id
    );
  END IF;

  RETURN TRUE;
END;
$$;

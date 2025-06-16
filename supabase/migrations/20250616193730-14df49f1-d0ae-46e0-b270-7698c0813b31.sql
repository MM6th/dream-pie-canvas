
-- Create modeling_applications table
CREATE TABLE public.modeling_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  fashion_product_id UUID NOT NULL,
  application_photos TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key relationships
ALTER TABLE public.modeling_applications 
ADD CONSTRAINT fk_modeling_applications_fashion_product 
FOREIGN KEY (fashion_product_id) REFERENCES public.fashion_products(id) ON DELETE CASCADE;

ALTER TABLE public.modeling_applications 
ADD CONSTRAINT fk_modeling_applications_merchant 
FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.modeling_applications 
ADD CONSTRAINT fk_modeling_applications_reviewer 
FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add Row Level Security
ALTER TABLE public.modeling_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for modeling_applications
CREATE POLICY "Merchants can view their own applications" 
  ON public.modeling_applications 
  FOR SELECT 
  USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can create their own applications" 
  ON public.modeling_applications 
  FOR INSERT 
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update their own pending applications" 
  ON public.modeling_applications 
  FOR UPDATE 
  USING (merchant_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can view all applications" 
  ON public.modeling_applications 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all applications" 
  ON public.modeling_applications 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

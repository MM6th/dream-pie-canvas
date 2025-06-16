
-- Add foreign key relationships to modeling_applications table
ALTER TABLE public.modeling_applications 
ADD CONSTRAINT fk_modeling_applications_fashion_product 
FOREIGN KEY (fashion_product_id) REFERENCES public.fashion_products(id) ON DELETE CASCADE;

ALTER TABLE public.modeling_applications 
ADD CONSTRAINT fk_modeling_applications_merchant 
FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.modeling_applications 
ADD CONSTRAINT fk_modeling_applications_reviewer 
FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

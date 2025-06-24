
-- Create product_reviews table for astrology product reviews
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  astrology_product_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.product_reviews 
ADD CONSTRAINT fk_product_reviews_astrology_product 
FOREIGN KEY (astrology_product_id) REFERENCES public.astrology_products(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product reviews
CREATE POLICY "Anyone can view reviews" 
  ON public.product_reviews 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create reviews" 
  ON public.product_reviews 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
  ON public.product_reviews 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
  ON public.product_reviews 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_product_reviews_astrology_product_id ON public.product_reviews(astrology_product_id);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews(user_id);

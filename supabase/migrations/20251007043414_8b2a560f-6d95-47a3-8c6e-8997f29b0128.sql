-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_for_sale BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC CHECK (price IS NULL OR price >= 2.00),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_order INTEGER NOT NULL DEFAULT 1
);

-- Create portfolio_images table
CREATE TABLE public.portfolio_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_blurred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolios
CREATE POLICY "Anyone can view portfolios"
ON public.portfolios
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own portfolios"
ON public.portfolios
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
ON public.portfolios
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
ON public.portfolios
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for portfolio_images
CREATE POLICY "Anyone can view portfolio images"
ON public.portfolio_images
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their portfolio images"
ON public.portfolio_images
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_images.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_portfolio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for portfolios
CREATE TRIGGER update_portfolios_updated_at
BEFORE UPDATE ON public.portfolios
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_timestamp();

-- Create portfolio_purchases table for sales tracking
CREATE TABLE public.portfolio_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paypal_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for portfolio_purchases
ALTER TABLE public.portfolio_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_purchases
CREATE POLICY "Users can view their own purchases"
ON public.portfolio_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases"
ON public.portfolio_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Portfolio owners can view their sales"
ON public.portfolio_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolios.id = portfolio_purchases.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);
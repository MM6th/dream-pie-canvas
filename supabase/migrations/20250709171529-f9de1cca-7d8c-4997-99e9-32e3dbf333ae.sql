-- Create table for storing user birth data
CREATE TABLE public.user_birth_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  birth_city TEXT NOT NULL,
  birth_state TEXT,
  birth_country TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timezone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing generated astrology readings
CREATE TABLE public.astrology_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  birth_data_id UUID NOT NULL,
  astrology_product_id UUID NOT NULL,
  reading_type TEXT NOT NULL,
  reading_content JSONB NOT NULL,
  charts_data JSONB,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  purchase_id UUID
);

-- Create table for caching API responses
CREATE TABLE public.astrology_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  response_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_birth_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrology_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrology_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_birth_data
CREATE POLICY "Users can view their own birth data" 
ON public.user_birth_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own birth data" 
ON public.user_birth_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own birth data" 
ON public.user_birth_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all birth data" 
ON public.user_birth_data 
FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS Policies for astrology_readings
CREATE POLICY "Users can view their own readings" 
ON public.astrology_readings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own readings" 
ON public.astrology_readings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all readings" 
ON public.astrology_readings 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all readings" 
ON public.astrology_readings 
FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for astrology_cache (admin only for security)
CREATE POLICY "Admins can manage cache" 
ON public.astrology_cache 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add foreign key relationships
ALTER TABLE public.user_birth_data 
ADD CONSTRAINT fk_user_birth_data_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.astrology_readings 
ADD CONSTRAINT fk_astrology_readings_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.astrology_readings 
ADD CONSTRAINT fk_astrology_readings_birth_data_id 
FOREIGN KEY (birth_data_id) REFERENCES public.user_birth_data(id) ON DELETE CASCADE;

ALTER TABLE public.astrology_readings 
ADD CONSTRAINT fk_astrology_readings_product_id 
FOREIGN KEY (astrology_product_id) REFERENCES public.astrology_products(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_user_birth_data_user_id ON public.user_birth_data(user_id);
CREATE INDEX idx_astrology_readings_user_id ON public.astrology_readings(user_id);
CREATE INDEX idx_astrology_readings_product_id ON public.astrology_readings(astrology_product_id);
CREATE INDEX idx_astrology_cache_expires_at ON public.astrology_cache(expires_at);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_astrology_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.astrology_cache 
  WHERE expires_at < now();
END;
$$;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_birth_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_birth_data_updated_at
BEFORE UPDATE ON public.user_birth_data
FOR EACH ROW
EXECUTE FUNCTION public.update_birth_data_timestamp();
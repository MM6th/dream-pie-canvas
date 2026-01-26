-- Create trigger function for quarterly_tax_settings
CREATE OR REPLACE FUNCTION public.update_quarterly_tax_settings_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create table for storing user tax calculation preferences
CREATE TABLE public.quarterly_tax_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  business_expenses NUMERIC DEFAULT 0,
  filing_status TEXT DEFAULT 'single',
  previous_year_agi NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, quarter)
);

-- Enable Row Level Security
ALTER TABLE public.quarterly_tax_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own tax settings"
ON public.quarterly_tax_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own settings
CREATE POLICY "Users can create their own tax settings"
ON public.quarterly_tax_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own tax settings"
ON public.quarterly_tax_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete their own tax settings"
ON public.quarterly_tax_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quarterly_tax_settings_updated_at
BEFORE UPDATE ON public.quarterly_tax_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_quarterly_tax_settings_timestamp();
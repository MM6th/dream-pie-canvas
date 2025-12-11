-- Create user_free_resources table to track free resource interactions
CREATE TABLE public.user_free_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_key)
);

-- Enable RLS
ALTER TABLE public.user_free_resources ENABLE ROW LEVEL SECURITY;

-- Users can view their own resource records
CREATE POLICY "Users can view their own free resources"
ON public.user_free_resources
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own resource records
CREATE POLICY "Users can create their own free resources"
ON public.user_free_resources
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own resource records
CREATE POLICY "Users can update their own free resources"
ON public.user_free_resources
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_free_resources_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_user_free_resources_updated_at
BEFORE UPDATE ON public.user_free_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_user_free_resources_timestamp();
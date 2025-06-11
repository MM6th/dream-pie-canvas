
-- Create bulletin_posts table
CREATE TABLE public.bulletin_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

-- Policy for everyone to read posts (public access)
CREATE POLICY "Anyone can view bulletin posts" 
  ON public.bulletin_posts 
  FOR SELECT 
  USING (true);

-- Policy for merchants to insert their own posts
CREATE POLICY "Merchants can create their own posts" 
  ON public.bulletin_posts 
  FOR INSERT 
  WITH CHECK (auth.uid() = merchant_id);

-- Policy for merchants to update their own posts
CREATE POLICY "Merchants can update their own posts" 
  ON public.bulletin_posts 
  FOR UPDATE 
  USING (auth.uid() = merchant_id);

-- Policy for merchants to delete their own posts
CREATE POLICY "Merchants can delete their own posts" 
  ON public.bulletin_posts 
  FOR DELETE 
  USING (auth.uid() = merchant_id);

-- Enable realtime for the bulletin_posts table
ALTER TABLE public.bulletin_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulletin_posts;

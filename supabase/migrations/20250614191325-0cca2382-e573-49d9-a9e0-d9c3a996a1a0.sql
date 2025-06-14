
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to all comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete own comments, admins can delete any" ON public.post_comments;
-- Also try dropping a possible old policy name for deletion
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

DROP POLICY IF EXISTS "Allow public read access on likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;

-- Enable Row Level Security on post_comments table (ensures it's on)
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Create fresh policies for comments
CREATE POLICY "Allow public read access to all comments"
ON public.post_comments FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own comments"
ON public.post_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.post_comments FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own comments, and admins to delete any comment
CREATE POLICY "Users can delete own comments, admins can delete any"
ON public.post_comments FOR DELETE
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));


-- Enable Row Level Security on post_likes table (ensures it's on)
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Create fresh policies for likes
CREATE POLICY "Allow public read access on likes"
ON public.post_likes FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own likes"
ON public.post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.post_likes FOR DELETE
USING (auth.uid() = user_id);

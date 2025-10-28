-- Update bulletin_posts RLS policies to allow supporters to create/manage affirmations

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Approved merchants and admins can create posts" ON bulletin_posts;
DROP POLICY IF EXISTS "Approved merchants and admins can update their posts" ON bulletin_posts;
DROP POLICY IF EXISTS "Approved merchants and admins can delete their posts" ON bulletin_posts;

-- New policies allowing supporters to create/manage affirmations, merchants/admins for all posts
CREATE POLICY "Users can create affirmations, merchants can create all posts"
ON bulletin_posts FOR INSERT
WITH CHECK (
  (post_type = 'current_affirmations' AND auth.uid() = merchant_id) 
  OR 
  (auth.uid() = merchant_id AND (is_admin(auth.uid()) OR is_approved_merchant(auth.uid())))
);

CREATE POLICY "Users can update their own affirmations, merchants can update all posts"
ON bulletin_posts FOR UPDATE
USING (
  (post_type = 'current_affirmations' AND auth.uid() = merchant_id)
  OR
  (auth.uid() = merchant_id AND (is_admin(auth.uid()) OR is_approved_merchant(auth.uid())))
);

CREATE POLICY "Users can delete their own affirmations, merchants can delete all posts"
ON bulletin_posts FOR DELETE
USING (
  (post_type = 'current_affirmations' AND auth.uid() = merchant_id)
  OR
  (auth.uid() = merchant_id AND (is_admin(auth.uid()) OR is_approved_merchant(auth.uid())))
);
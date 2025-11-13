-- Delete all likes and comments from admin posts
DELETE FROM post_likes
WHERE post_id IN (
  SELECT bp.id 
  FROM bulletin_posts bp
  INNER JOIN profiles p ON bp.merchant_id = p.id
  WHERE p.is_admin = true
);

DELETE FROM post_comments
WHERE post_id IN (
  SELECT bp.id 
  FROM bulletin_posts bp
  INNER JOIN profiles p ON bp.merchant_id = p.id
  WHERE p.is_admin = true
);
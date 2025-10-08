-- Create a secure function to delete audio products and all related data
CREATE OR REPLACE FUNCTION delete_audio_product_cascade(p_product_id UUID, p_merchant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the product belongs to the merchant
  IF NOT EXISTS (
    SELECT 1 FROM audio_products 
    WHERE id = p_product_id AND merchant_id = p_merchant_id
  ) THEN
    RAISE EXCEPTION 'Product not found or you do not have permission to delete it';
  END IF;

  -- Delete all related records (bypassing RLS with SECURITY DEFINER)
  DELETE FROM user_purchases WHERE audio_product_id = p_product_id;
  DELETE FROM user_playlists WHERE audio_product_id = p_product_id;
  DELETE FROM song_cover_submissions WHERE audio_product_id = p_product_id;
  DELETE FROM asmr_submissions WHERE audio_product_id = p_product_id;
  DELETE FROM asmr_downloads WHERE audio_product_id = p_product_id;
  DELETE FROM podcast_downloads WHERE audio_product_id = p_product_id;
  DELETE FROM album_tracks WHERE audio_product_id = p_product_id;
  
  -- Delete the audio product itself
  DELETE FROM audio_products WHERE id = p_product_id AND merchant_id = p_merchant_id;
  
  RETURN TRUE;
END;
$$;
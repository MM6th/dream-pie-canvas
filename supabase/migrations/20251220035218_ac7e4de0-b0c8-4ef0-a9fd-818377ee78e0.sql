-- Create function to delete an album and all its tracks
CREATE OR REPLACE FUNCTION delete_album_cascade(
  p_album_id UUID,
  p_merchant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify ownership of the album
  IF NOT EXISTS (
    SELECT 1 FROM albums 
    WHERE id = p_album_id AND merchant_id = p_merchant_id
  ) THEN
    RAISE EXCEPTION 'Album not found or unauthorized';
  END IF;

  -- Delete album_tracks entries
  DELETE FROM album_tracks WHERE album_id = p_album_id;

  -- Delete all audio_products associated with this album
  DELETE FROM audio_products WHERE album_id = p_album_id AND merchant_id = p_merchant_id;

  -- Delete the album itself
  DELETE FROM albums WHERE id = p_album_id AND merchant_id = p_merchant_id;

  RETURN TRUE;
END;
$$;
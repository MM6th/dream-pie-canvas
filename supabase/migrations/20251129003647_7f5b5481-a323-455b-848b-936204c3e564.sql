-- Update function to point to the actual merged video file
CREATE OR REPLACE FUNCTION public.fix_delivery_video_segments(p_delivery_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the delivery to point to the merged MP4 file (not segments)
  UPDATE public.astrology_deliveries
  SET 
    video_segments = '[]'::jsonb,
    admin_video_url = 'https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/astrology-deliveries/86358c22-bc4d-4aab-bd89-d6d988004557-1763938927814.mp4',
    buyer_video_url = 'https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/astrology-deliveries/86358c22-bc4d-4aab-bd89-d6d988004557-1763938927814.mp4'
  WHERE id = p_delivery_id;

  RETURN TRUE;
END;
$$;
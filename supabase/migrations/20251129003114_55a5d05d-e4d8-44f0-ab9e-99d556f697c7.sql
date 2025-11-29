-- Create function to fix delivery video segments
CREATE OR REPLACE FUNCTION public.fix_delivery_video_segments(p_delivery_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the delivery to point to original segments with actual content
  UPDATE public.astrology_deliveries
  SET 
    video_segments = '[
      {"id": "segment-1", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-1-1732842370635.webm", "order": 1, "duration": 0},
      {"id": "segment-2", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-2-1732842414491.webm", "order": 2, "duration": 0},
      {"id": "segment-3", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-3-1732842455898.webm", "order": 3, "duration": 0},
      {"id": "segment-4", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-4-1732842503806.webm", "order": 4, "duration": 0},
      {"id": "segment-5", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-5-1732842550498.webm", "order": 5, "duration": 0},
      {"id": "segment-6", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-6-1732842593830.webm", "order": 6, "duration": 0},
      {"id": "segment-7", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-7-1732842636102.webm", "order": 7, "duration": 0},
      {"id": "segment-8", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-8-1732842677126.webm", "order": 8, "duration": 0},
      {"id": "segment-9", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-9-1732842723446.webm", "order": 9, "duration": 0},
      {"id": "segment-10", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-10-1732842767734.webm", "order": 10, "duration": 0},
      {"id": "segment-11", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-11-1732842819254.webm", "order": 11, "duration": 0},
      {"id": "segment-12", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-12-1732842866838.webm", "order": 12, "duration": 0},
      {"id": "segment-13", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-13-1732842910102.webm", "order": 13, "duration": 0},
      {"id": "segment-14", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-14-1732842952854.webm", "order": 14, "duration": 0},
      {"id": "segment-15", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-15-1732842994342.webm", "order": 15, "duration": 0}
    ]'::jsonb,
    admin_video_url = 'https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-1-1732842370635.webm',
    buyer_video_url = 'https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-1-1732842370635.webm'
  WHERE id = p_delivery_id;

  RETURN TRUE;
END;
$$;
-- Reset astrology delivery to pending for re-upload
UPDATE astrology_deliveries 
SET status = 'pending',
    admin_video_url = NULL,
    buyer_video_url = NULL,
    draft_video_url = NULL,
    delivered_at = NULL,
    draft_saved_at = NULL
WHERE id = '86358c22-bc4d-4aab-bd89-d6d988004557';
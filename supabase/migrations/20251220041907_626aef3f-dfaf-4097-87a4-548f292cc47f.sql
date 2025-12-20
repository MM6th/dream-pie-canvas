-- Reset the published album back to draft so user can re-test the preview feature
UPDATE albums 
SET status = 'draft', published_at = NULL, preview_track_id = NULL 
WHERE id = 'e7cdf4e3-afaa-44ab-8ee0-22e4bf53abf9';